// Node.js標準モジュールとChromeだけで模擬入力を検証する。実OneSDK通信は遮断する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const servedFolder = path.basename(root);
const artifacts = path.join(__dirname, 'artifacts');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mockSDK = `
window.__tones = 0;
window.__audioContexts = [];
window.__media = [];
const NativeAudio = window.Audio;
window.Audio = function (...args) { const media = new NativeAudio(...args); window.__media.push(media); return media; };
const NativeAudioContext = window.AudioContext;
window.AudioContext = class extends NativeAudioContext {
 constructor(...args) { super(...args); window.__audioContexts.push(this); }
 createOscillator() { window.__tones++; return super.createOscillator(); }
};
window.__clock = Date.now();
Date.now = () => window.__clock;
window.__handlers = {};
window.OneSDK = {
 setup(options) { window.__setup = options; },
 subscribe({action,callback}) { window.__handlers[action] = callback; return action; },
 unsubscribe(action) { delete window.__handlers[action]; },
 ready() { return Promise.resolve(); },
 connect() { window.__connected = true; return Promise.resolve(); }
};
window.__comment = (id, user, extra = {}) => window.__handlers.comments({
 id: 'stream', service: 'youtube',
 data: { id, userId: user, name: user, comment: 'コメント', timestamp: new Date(Date.now()).toISOString(), ...extra }
});
`;
class CDP {
  constructor(socket) {
    this.socket = socket;
    this.next = 0;
    this.pending = new Map();
    this.errors = [];
    this.unexpectedRequests = [];
    socket.addEventListener('message', event => {
      const data = JSON.parse(String(event.data));
      if (data.id) {
        const task = this.pending.get(data.id);
        if (!task) return;
        this.pending.delete(data.id);
        clearTimeout(task.timeout);
        if (data.error) task.reject(new Error(data.error.message));
        else task.resolve(data.result);
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
      } else if (data.method === 'Fetch.requestPaused') {
        this.handleRequest(data).catch(error => this.errors.push(error.message));
      }
    });
  }
  async handleRequest(event) {
    const { requestId, request } = event.params;
    if (request.url.includes('/onesdk.js')) {
      return this.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(mockSDK).toString('base64') }, event.sessionId);
    }
    if (/^(https?|wss?):/.test(request.url) && !request.url.startsWith(this.origin + '/')) {
      this.unexpectedRequests.push(request.url);
      return this.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }, event.sessionId);
    }
    return this.send('Fetch.continueRequest', { requestId }, event.sessionId);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async evaluate(expression, session) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async wait(expression, session) {
    for (let index = 0; index < 100; index++) {
      if (await this.evaluate(expression, session)) return;
      await delay(50);
    }
    throw new Error(`表示待ちがタイムアウトしました: ${expression}`);
  }
}
const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname.startsWith('/' + servedFolder + '/')) pathname = pathname.slice(servedFolder.length + 1);
  if (pathname === '/avatar.svg') {
    response.setHeader('Content-Type', 'image/svg+xml');
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="16" fill="#6c68ac"/><circle cx="40" cy="30" r="16" fill="#ffe2bc"/><path d="M10 80 Q8 48 40 48 Q72 48 70 80" fill="#d2e5ff"/></svg>');
    return;
  }
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end(); return;
  }
  response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.mp3': 'audio/mpeg' })[path.extname(file)] || 'text/plain');
  response.end(fs.readFileSync(file));
});
(async () => {
  let chrome, cdp;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rom-bomb-browser-'));
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const executable = process.env.ROM_BOMB_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    chrome = spawn(executable, ['--headless=new','--mute-audio','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','about:blank'], { windowsHide: true, stdio: 'ignore' });
    let launchError;
    chrome.on('error', error => { launchError = error; });
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile) && i < 150; i++) { if (launchError) throw launchError; await delay(100); }
    const [port, endpoint] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    cdp = new CDP(socket);
    cdp.origin = `http://127.0.0.1:${server.address().port}`;
    const newPage = async url => {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, sessionId);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, sessionId);
      await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);
      await cdp.send('Page.navigate', { url }, sessionId);
      await cdp.wait('window.__connected === true && !!window.VCT_CONFIG_RUNTIME', sessionId);
      return sessionId;
    };
    const session = await newPage(cdp.origin + '/' + servedFolder + '/index.html?settings=1');
    const evaluate = expression => cdp.evaluate(expression, session);
    await cdp.wait('!!document.querySelector("#vct-settings-root:not([hidden])")', session);
    // 改名前の設定は自動移行しない。新しいフォルダ名の保存先で起動する。
    await evaluate(`localStorage.setItem('vct.template-settings.view_comment_rombomb.v1',JSON.stringify({MAX_ITEMS:1,SCALE:2}));`);
    await cdp.send('Page.reload',{},session);
    await cdp.wait('window.__connected === true && !!window.VCT_SETTINGS_PANEL',session);
    assert.equal(await evaluate('window.VCT_CONFIG_RUNTIME.storageKey'),'vct.template-settings.vct_rombomb_v3.v1');
    assert.equal(await evaluate('window.CONFIG.MAX_ITEMS'),10);
    assert.equal(await evaluate('window.CONFIG.SCALE'),1);
    assert.deepEqual(await evaluate('window.__setup'), { mode: 'diff', permissions: ['comments','clear'] });
    const setField = async (key, value) => evaluate(`(() => {
      const input = document.querySelector('[data-config-key="${key}"]');
      ${typeof value === 'boolean' ? `input.checked = ${value};` : `input.value = ${JSON.stringify(String(value))};`}
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    const save = () => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent === '変更を保存').click()`);
    // カードがなくても、縮小表示で実マウス入力による移動・ホイールと数値が連動する。
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }, session);
    await evaluate(`document.getElementById('rom-placement-toggle').click(); document.querySelector('.vct-settings-collapse-toggle').click();`);
    await delay(100);
    const handle = await evaluate(`(() => { const r=document.getElementById('rom-placement-editor').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    assert.equal(await evaluate(`document.elementFromPoint(${handle.x},${handle.y})?.id`), 'rom-placement-editor');
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x, y: handle.y }, session);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, x: handle.x, y: handle.y }, session);
    await delay(50);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, x: handle.x-80, y: handle.y+40 }, session);
    await delay(50);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: handle.x-80, y: handle.y+40 }, session);
    assert.equal(await evaluate('document.querySelector("[data-config-key=OFFSET_X]").value'), '140');
    assert.equal(await evaluate('document.querySelector("[data-config-key=OFFSET_Y]").value'), '160');
    assert.equal(await evaluate('document.querySelector("[data-placement-slider=OFFSET_X]").value'), '140');
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', deltaX: 0, deltaY: -100, x: handle.x-80, y: handle.y+40 }, session);
    await delay(100);
    assert.equal(await evaluate('document.querySelector("[data-config-key=SCALE]").value'), '1.05');
    await setField('POSITION', 'left-bottom');
    assert.equal(await evaluate('document.querySelector("[data-config-key=OFFSET_X]").value'), '20');
    assert.equal(await evaluate('document.querySelector("[data-config-key=OFFSET_Y]").value'), '100');
    assert.equal(await evaluate('document.querySelector("[data-placement-slider=OFFSET_X]").value'), '20');
    assert.equal(await evaluate('document.getElementById("cards").style.left'), '20px');
    assert.equal(await evaluate('document.getElementById("cards").style.bottom'), '100px');
    assert.equal(await evaluate('document.querySelector("[data-config-key=SCALE]").value'), '1.05');
    await setField('OFFSET_X', 240);
    await setField('OFFSET_Y', 300);
    await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent==='この四隅に戻す').click()`);
    assert.equal(await evaluate('document.querySelector("[data-config-key=OFFSET_X]").value'), '20');
    assert.equal(await evaluate('document.querySelector("[data-config-key=OFFSET_Y]").value'), '100');
    await evaluate('window.VCT_SETTINGS_PANEL.close()');
    assert.equal(await evaluate('document.getElementById("rom-placement-editor").hidden'), true);
    assert.equal(await evaluate('document.getElementById("cards").style.right'), '20px');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, session);
    await evaluate('window.VCT_SETTINGS_PANEL.open()');
    await evaluate(`__comment('old','履歴',{timestamp: new Date(__clock - 60000).toISOString()}); __comment('owner','配信者',{isOwner:true}); __comment('mod','モデレーター',{isModerator:true}); __comment('system','通知',{meta:{type:'system'}}); __comment('missing','IDなし',{userId:''}); __comment('','コメントIDなし');`);
    await evaluate(`window.VCT_SETTINGS_PANEL.close(); __clock += 21*60000;`);
    await delay(250);
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot").length'), 0);
    // 通常・警戒・危険と長い名前、画像読込失敗、HTML文字列を同時に確認する。
    await evaluate(`__comment('danger','危険なリスナー',{profileImage:${JSON.stringify(cdp.origin + '/avatar.svg')}}); __clock += 5*60000;
      __comment('warning','警戒中のリスナー',{profileImage:${JSON.stringify(cdp.origin + '/avatar.svg')}}); __clock += 5*60000;
      __comment('normal','とても長い名前のリスナーさんの表示確認',{profileImage:${JSON.stringify(cdp.origin + '/missing.png')}});
      __comment('html','<img src=x onerror=alert(1)>'); __clock += 15*60000 - 1000;`);
    await delay(300);
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".rom-slot")].map(el=>el.dataset.stage)'), ['2','1','0','0']);
    assert.equal(await evaluate('document.querySelectorAll(".rom-name img").length'), 0);
    assert.ok(await evaluate('[...document.querySelectorAll(".rom-name")].some(el=>el.textContent === "<img src=x onerror=alert(1)>")'));
    assert.equal(await evaluate('getComputedStyle(document.body).backgroundColor'), 'rgba(0, 0, 0, 0)');
    assert.ok(await evaluate('Number(getComputedStyle(document.querySelector(".rom-time")).zIndex) > Number(getComputedStyle(document.querySelector(".rom-bomb")).zIndex)'));
    assert.ok(await evaluate('Number(getComputedStyle(document.querySelector(".rom-name")).zIndex) > Number(getComputedStyle(document.querySelector(".rom-bomb")).zIndex)'));
    assert.equal(await evaluate('document.querySelectorAll(".rom-avatar:not([hidden])").length'), 2);
    assert.equal(await evaluate('document.querySelector(".rom-name").textContent'), '危険なリスナー');
    // スクリーンショットは危険・警戒・通常を一枚に収める。
    fs.mkdirSync(artifacts, { recursive: true });
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, session);
    fs.writeFileSync(path.join(artifacts, 'cards.png'), Buffer.from(screenshot.data, 'base64'));
    const detail = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 1740, y: 70, width: 180, height: 400, scale: 2 } }, session);
    fs.writeFileSync(path.join(artifacts, 'cards-detail.png'), Buffer.from(detail.data, 'base64'));
    await evaluate('window.VCT_SETTINGS_PANEL.open()');
    // 並べ方・間隔は時計や順位を変えずにプレビューし、グループ全体を4隅へ固定する。
    const originalNames = await evaluate('[...document.querySelectorAll(".rom-name")].map(el=>el.textContent)');
    await setField('ARRANGEMENT', 'horizontal');
    await setField('ITEM_GAP_PX', 18);
    await setField('SCALE', 1.25);
    for (const corner of ['right-top','left-top','right-bottom','left-bottom']) {
      await setField('OFFSET_X', 500);
      await setField('OFFSET_Y', 300);
      await setField('POSITION', corner);
      await delay(250);
      const geometry = await evaluate(`(() => {
        const group = document.getElementById('cards').getBoundingClientRect();
        const slots = [...document.querySelectorAll('.rom-slot')].map(el=>{ const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
        return {left:group.left,right:group.right,top:group.top,bottom:group.bottom,width:group.width,height:group.height,slots};
      })()`);
      assert.ok(Math.abs(geometry.width - 727.5) < .1);
      assert.ok(Math.abs(geometry.height - 102.5) < .1);
      assert.ok(Math.abs((corner.startsWith('right') ? geometry.right : geometry.left) - (corner.startsWith('right') ? 1900 : 20)) < .1);
      assert.ok(Math.abs((corner.endsWith('bottom') ? geometry.bottom : geometry.top) - (corner.endsWith('bottom') ? 980 : 100)) < .1);
      assert.ok(Math.abs(geometry.slots[1].x - geometry.slots[0].x - 187.5) < .1);
      assert.ok(Math.abs(geometry.slots[1].y - geometry.slots[0].y) < .1);
    }
    await setField('WRAP_COUNT', 2);
    for (const arrangement of ['vertical','horizontal']) {
      await setField('ARRANGEMENT', arrangement);
      for (const corner of ['right-top','left-top','right-bottom','left-bottom']) {
        await setField('POSITION', corner);
        await delay(250);
        const wrapped = await evaluate(`(() => {
          const group=document.getElementById('cards').getBoundingClientRect();
          const slots=[...document.querySelectorAll('.rom-slot')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};});
          return {left:group.left,right:group.right,top:group.top,bottom:group.bottom,width:group.width,height:group.height,slots};
        })()`);
        assert.ok(Math.abs(wrapped.width - 352.5) < .1);
        assert.ok(Math.abs(wrapped.height - 227.5) < .1);
        assert.ok(Math.abs((corner.startsWith('right') ? wrapped.right : wrapped.left) - (corner.startsWith('right') ? 1900 : 20)) < .1);
        assert.ok(Math.abs((corner.endsWith('bottom') ? wrapped.bottom : wrapped.top) - (corner.endsWith('bottom') ? 980 : 100)) < .1);
        const dx = wrapped.slots[1].x - wrapped.slots[0].x;
        const dy = wrapped.slots[1].y - wrapped.slots[0].y;
        assert.ok(Math.abs(dx - (arrangement === 'horizontal' ? 187.5 : 0)) < .1);
        assert.ok(Math.abs(dy - (arrangement === 'horizontal' ? 0 : 125)) < .1);
        assert.ok(Math.abs(wrapped.slots[2].x - wrapped.slots[0].x - (arrangement === 'horizontal' ? 0 : 187.5)) < .1);
        assert.ok(Math.abs(wrapped.slots[2].y - wrapped.slots[0].y - (arrangement === 'horizontal' ? 125 : 0)) < .1);
      }
    }
    // 1人ごとの折り返しと表示人数を超える指定にも余分な空き枠を作らない。
    await setField('WRAP_COUNT', 1);
    assert.equal(await evaluate('document.getElementById("cards").style.width'), '132px');
    await setField('WRAP_COUNT', 30);
    assert.equal(await evaluate('document.getElementById("cards").style.width'), '582px');
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".rom-name")].map(el=>el.textContent)'), originalNames);
    await evaluate('window.VCT_SETTINGS_PANEL.close()');
    await delay(250);
    assert.equal(await evaluate('window.CONFIG.ARRANGEMENT'), 'vertical');
    assert.equal(await evaluate('document.getElementById("cards").style.width'), '132px');
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot")[1].style.transform'), 'translate(0px, 88px)');
    await evaluate('window.VCT_SETTINGS_PANEL.open()');
    await setField('ITEM_GAP_PX', 0);
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot")[1].style.transform'), 'translate(0px, 82px)');
    await setField('ARRANGEMENT', 'horizontal');
    await setField('ITEM_GAP_PX', 18);
    await setField('WRAP_COUNT', 2);
    // 上限を減らしても再読込せず、停止中もコメントでリセットできる。
    await setField('MAX_ITEMS', 2);
    await setField('ENABLED', false);
    await setField('TIME_MODE', 'remaining');
    await setField('EXPLOSION_SECONDS', 3);
    await save();
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot").length'), 2);
    const before = await evaluate('document.querySelector(".rom-time").textContent');
    assert.equal(before, '00:01');
    await setField('TIME_MODE', 'elapsed');
    assert.equal(await evaluate('document.querySelector(".rom-time").textContent'), '19:59');
    await evaluate('window.VCT_SETTINGS_PANEL.close(); window.VCT_SETTINGS_PANEL.open()');
    assert.equal(await evaluate('document.querySelector(".rom-time").textContent'), '00:01');
    await evaluate('__clock += 60*60000'); await delay(250);
    assert.equal(await evaluate('document.querySelector(".rom-time").textContent'), before);
    await evaluate(`__comment('paused-reset','危険なリスナー'); __clock += 1000;`); await delay(250);
    assert.ok(!await evaluate('[...document.querySelectorAll(".rom-name")].some(el=>el.textContent === "危険なリスナー")'));
    // 時刻の不正値は画面内エラーで拒否し、保存値を変更しない。
    await setField('WARN_MIN', 16);
    await save();
    assert.match(await evaluate('document.querySelector(".vct-settings-status").textContent'), /時間は/);
    assert.equal(await evaluate('window.CONFIG.WARN_MIN'), 10);
    await evaluate('window.VCT_SETTINGS_PANEL.close(); window.VCT_SETTINGS_PANEL.open()');
    await setField('OFFSET_X', 80);
    assert.equal(await evaluate('document.getElementById("cards").style.right'), '80px');
    await evaluate('window.VCT_SETTINGS_PANEL.close()');
    assert.equal(await evaluate('document.getElementById("cards").style.right'), '20px');
    // 保存済み人数・OFFは再読込で残り、ユーザーは消える。
    await cdp.send('Page.reload', {}, session);
    await cdp.wait('window.__connected === true', session);
    assert.equal(await evaluate('window.CONFIG.MAX_ITEMS'), 2);
    assert.equal(await evaluate('window.CONFIG.ENABLED'), false);
    assert.equal(await evaluate('window.CONFIG.TIME_MODE'), 'remaining');
    assert.equal(await evaluate('window.CONFIG.EXPLOSION_SECONDS'), 3);
    assert.equal(await evaluate('window.CONFIG.ARRANGEMENT'), 'horizontal');
    assert.equal(await evaluate('window.CONFIG.ITEM_GAP_PX'), 18);
    assert.equal(await evaluate('window.CONFIG.WRAP_COUNT'), 2);
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot").length'), 0);
    // 確認用表示は閉じると消え、本番の登録者へ混入しない。
    await cdp.wait('!!window.VCT_SETTINGS_PANEL', session);
    await evaluate(`window.dispatchEvent(new CustomEvent('rom-test',{detail:'demo'})); __clock += 1300;`); await delay(250);
    assert.ok(await evaluate('document.getElementById("rom-demo-label") !== null'));
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot").length'), 3);
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot")[1].style.transform'), 'translate(150px, 0px)');
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot")[2].style.transform'), 'translate(0px, 100px)');
    assert.equal(await evaluate('document.getElementById("cards").style.width'), '282px');
    assert.equal(await evaluate('document.getElementById("cards").style.height'), '182px');
    await evaluate('window.VCT_SETTINGS_PANEL.close()');
    assert.equal(await evaluate('document.querySelectorAll(".rom-slot").length'), 0);
    assert.equal(await evaluate('document.getElementById("rom-demo-label")'), null);
    const fileSession = await newPage(pathToFileURL(path.join(root, 'index.html')).href);
    await cdp.evaluate(`__comment('file-comment','ローカルファイル'); __clock += 5*60000;`, fileSession);
    await delay(250);
    assert.equal(await cdp.evaluate('document.querySelectorAll(".rom-slot").length', fileSession), 1);
    assert.equal(await cdp.evaluate('document.querySelector(".rom-time").textContent', fileSession), '00:00');
    await cdp.evaluate(`window.VCT_CONFIG_RUNTIME.commitLocal({...window.CONFIG,TIME_MODE:'remaining',EXPLOSION_SECONDS:3});`, fileSession);
    assert.equal(await cdp.evaluate('document.querySelector(".rom-time").textContent', fileSession), '20:00');
    await cdp.evaluate('__clock += 20*60000 - 400', fileSession); await delay(250);
    assert.equal(await cdp.evaluate('document.querySelector(".rom-time").textContent', fileSession), '00:01');
    await cdp.evaluate('__clock += 400', fileSession); await delay(750);
    assert.equal(await cdp.evaluate('document.querySelector(".rom-slot").dataset.status', fileSession), 'exploding');
    assert.equal(await cdp.evaluate('document.querySelector(".rom-time").textContent', fileSession), '00:00');
    assert.equal(await cdp.evaluate('getComputedStyle(document.querySelector(".rom-card")).opacity', fileSession), '1');
    assert.equal(await cdp.evaluate('getComputedStyle(document.querySelector(".rom-name")).opacity', fileSession), '1');
    assert.match(await cdp.evaluate('getComputedStyle(document.querySelector(".rom-bomb")).animationDelay', fileSession), /2\.7s/);
    const pulseScales = await cdp.evaluate(`(() => {
      const bomb = document.querySelector('.rom-bomb');
      const pulse = bomb.getAnimations().find(animation => animation.animationName === 'rom-explosion-pulse');
      if (!pulse) throw new Error('爆発の脈動がありません');
      pulse.pause();
      return [300,700,1100].map(time => {
        pulse.currentTime = time;
        return new DOMMatrix(getComputedStyle(bomb).transform).a;
      });
    })()`, fileSession);
    assert.ok(pulseScales[1] > pulseScales[0] + .2);
    assert.ok(Math.abs(pulseScales[0] - pulseScales[2]) < .01);
    await cdp.evaluate('__clock += 2999', fileSession); await delay(250);
    assert.equal(await cdp.evaluate('document.querySelectorAll(".rom-slot").length', fileSession), 1);
    await cdp.evaluate('__clock += 1', fileSession); await delay(250);
    assert.equal(await cdp.evaluate('document.querySelectorAll(".rom-slot").length', fileSession), 0);
    // 確認表示の裏で、本番の未登場ユーザーのタイマーを開始しない。
    await cdp.evaluate(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,START_MIN:.01,WARN_MIN:.02,DANGER_MIN:.03,EXPLODE_MIN:.04});
      window.dispatchEvent(new CustomEvent('rom-test',{detail:'demo'}));__comment('behind-demo','本番リスナー');__clock+=1300;`,fileSession);
    await delay(250);
    await cdp.evaluate(`__clock+=400;window.dispatchEvent(new CustomEvent('rom-test',{detail:'stop'}));`,fileSession);
    assert.equal(await cdp.evaluate('document.querySelector(".rom-time").textContent',fileSession),'00:03');
    const randomSession = await newPage(cdp.origin + '/' + servedFolder + '/index.html?settings=1');
    const randomEval = expression => cdp.evaluate(expression, randomSession);
    await cdp.wait('!!window.VCT_SETTINGS_PANEL', randomSession);
    await randomEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...window.CONFIG_DEFAULT,ARRANGEMENT:'random',MAX_ITEMS:30,RANDOM_X:200,RANDOM_Y:100,RANDOM_WIDTH:900,RANDOM_HEIGHT:500});
      window.VCT_SETTINGS_PANEL.close(); window.VCT_SETTINGS_PANEL.open();
      window.__draws=0; let seed=17; Math.random=()=>{__draws++; if(__draws<=4)return 0; seed=(seed*1664525+1013904223)>>>0; return seed/4294967296;};
      for(let i=0;i<30;i++)__comment('random-'+i,'r'+i); __clock+=5*60000;`);
    await delay(300);
    assert.equal(await randomEval('document.querySelectorAll(".rom-slot").length'), 30);
    assert.equal(await randomEval('__draws'), 60);
    assert.equal(await randomEval('document.querySelector("[data-config-key=OFFSET_X]").closest("label").hidden'), true);
    const getRandomPositions = () => randomEval(`Object.fromEntries([...document.querySelectorAll('.rom-slot')].map(el=>[el.querySelector('.rom-name').textContent,el.style.transform]))`);
    const scattered = await getRandomPositions();
    assert.equal(scattered.r0, scattered.r1);
    const points = await randomEval(`[...document.querySelectorAll('.rom-slot')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,x:r.left+r.width/2,y:r.top+r.height/2};})`);
    assert.ok(points.every(point => point.x >= 200 && point.x <= 1100 && point.y >= 100 && point.y <= 600));
    assert.ok(points[0].left < 200 && points[0].top < 100);
    await randomEval(`__comment('random-reset','r0'); __clock+=1000;`); await delay(300);
    await randomEval('window.VCT_CONFIG_RUNTIME.commitLocal({...window.CONFIG,MAX_ITEMS:1})');
    await randomEval('window.VCT_CONFIG_RUNTIME.commitLocal({...window.CONFIG,MAX_ITEMS:30})');
    await delay(300);
    const stable = await getRandomPositions();
    for (let i=1;i<30;i++) assert.equal(stable['r'+i],scattered['r'+i]);
    assert.equal(await randomEval('__draws'), 60);
    await randomEval('__clock+=5*60000'); await delay(300);
    const renewed = await getRandomPositions();
    assert.notEqual(renewed.r0, scattered.r0);
    assert.equal(await randomEval('__draws'),62);
    for (let i=1;i<30;i++) assert.equal(renewed['r'+i],scattered['r'+i]);
    await randomEval(`window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...CONFIG,RANDOM_X:0,RANDOM_Y:0,RANDOM_WIDTH:1920,RANDOM_HEIGHT:1080}}))`);
    await delay(250);
    assert.equal(await randomEval('document.getElementById("cards").style.width'),'1920px');
    assert.equal(await randomEval('document.getElementById("cards").style.height'),'1080px');
    assert.equal(await randomEval('__draws'),62);
    await randomEval('window.VCT_SETTINGS_PANEL.close(); window.VCT_SETTINGS_PANEL.open(); document.getElementById("rom-placement-toggle").click(); document.querySelector(".vct-settings-collapse-toggle").click()');
    await delay(100);
    for (const event of [
      {type:'mouseMoved',x:650,y:350},
      {type:'mousePressed',button:'left',buttons:1,clickCount:1,x:650,y:350},
      {type:'mouseMoved',button:'left',buttons:1,x:750,y:400},
      {type:'mouseReleased',button:'left',clickCount:1,x:750,y:400}
    ]) { await cdp.send('Input.dispatchMouseEvent',event,randomSession); await delay(30); }
    assert.equal(await randomEval('document.querySelector("[data-config-key=RANDOM_X]").value'), '300');
    assert.equal(await randomEval('document.querySelector("[data-config-key=RANDOM_Y]").value'), '150');
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseWheel',deltaX:0,deltaY:-100,x:750,y:400},randomSession); await delay(100);
    assert.equal(await randomEval('document.querySelector("[data-config-key=SCALE]").value'), '1.05');
    assert.equal(await randomEval('document.getElementById("cards").style.width'),'900px');
    await randomEval(`document.querySelector('.vct-settings-collapse-toggle').click(); [...document.querySelectorAll('button')].find(el=>el.textContent==='変更を保存').click()`);
    assert.equal(await randomEval('window.CONFIG.RANDOM_X'),300);
    assert.equal(await randomEval('window.CONFIG.SCALE'),1.05);
    await randomEval('window.VCT_SETTINGS_PANEL.close()');
    const randomShot = await cdp.send('Page.captureScreenshot',{format:'png'},randomSession);
    fs.writeFileSync(path.join(artifacts,'random.png'),Buffer.from(randomShot.data,'base64'));
    await cdp.send('Page.reload',{},randomSession);
    await cdp.wait('window.__connected === true',randomSession);
    assert.equal(await randomEval('window.CONFIG.ARRANGEMENT'),'random');
    assert.equal(await randomEval('window.CONFIG.RANDOM_X'),300);
    assert.equal(await randomEval('window.CONFIG.RANDOM_WIDTH'),900);
    assert.equal(await randomEval('document.querySelectorAll(".rom-slot").length'),0);
    await cdp.wait('!!window.VCT_SETTINGS_PANEL',randomSession);
    await randomEval(`window.__demoDraws=0;Math.random=()=>((++__demoDraws)%10)/10;window.dispatchEvent(new CustomEvent('rom-test',{detail:'demo'}));__clock+=1300;`);
    await delay(300);
    const firstDemo = await getRandomPositions();
    await randomEval(`window.VCT_SETTINGS_PANEL.close();window.VCT_SETTINGS_PANEL.open();window.dispatchEvent(new CustomEvent('rom-test',{detail:'demo'}));__clock+=1300;`);
    await delay(300);
    assert.notDeepEqual(await getRandomPositions(),firstDemo);
    await randomEval('window.VCT_SETTINGS_PANEL.close()');
    await cdp.evaluate(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,ARRANGEMENT:'vertical',POSITION:'right-bottom',OFFSET_X:245,OFFSET_Y:155})`,fileSession);
    await cdp.send('Page.reload',{},fileSession);
    await cdp.wait('window.__connected === true',fileSession);
    assert.equal(await cdp.evaluate('document.getElementById("cards").style.right',fileSession),'245px');
    assert.equal(await cdp.evaluate('document.getElementById("cards").style.bottom',fileSession),'155px');
    const blastSession = await newPage(pathToFileURL(path.join(root,'index.html')).href);
    const blastEval = expression => cdp.evaluate(expression,blastSession);
    await blastEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG_DEFAULT,START_MIN:.01,WARN_MIN:.02,DANGER_MIN:.03,EXPLODE_MIN:.04,EXPLOSION_SECONDS:3,SHATTER_CARDS:true});__comment('blast-1','爆散確認');__clock+=600;`);
    await delay(250);
    await blastEval('__clock+=2400'); await delay(250);
    assert.equal(await blastEval('document.querySelectorAll(".rom-shard").length'),6);
    assert.equal(await blastEval('document.querySelectorAll(".rom-shard .rom-bomb").length'),0);
    await delay(300);
    assert.equal(await blastEval('document.querySelectorAll(".rom-shard").length'),6);
    await delay(1000);
    assert.equal(await blastEval('document.querySelectorAll(".rom-shard").length'),0);
    await delay(250);
    assert.equal(await blastEval('document.querySelectorAll(".rom-shard").length'),0);
    assert.equal(await blastEval('document.querySelectorAll(".rom-slot").length'),1);
    await blastEval(`__comment('blast-reset','爆散確認');`);
    assert.equal(await blastEval('document.querySelectorAll(".rom-slot").length'),0);
    await blastEval('window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,EXPLOSION_EFFECT:false});__clock+=600'); await delay(250);
    await blastEval('__clock+=2400'); await delay(250);
    assert.equal(await blastEval('document.querySelectorAll(".rom-slot").length'),0);
    assert.equal(await blastEval('document.querySelectorAll(".rom-shard").length'),0);
    const visualSession = await newPage(pathToFileURL(path.join(root,'index.html')).href+'?settings=1');
    const visualEval = expression => cdp.evaluate(expression,visualSession);
    await cdp.wait('!!window.VCT_SETTINGS_PANEL',visualSession);
    await visualEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG_DEFAULT,START_MIN:.01,WARN_MIN:.02,DANGER_MIN:.03,EXPLODE_MIN:.04,EXPLOSION_SECONDS:3,SHATTER_CARDS:true,VISUAL_MODE:'visual'});
      window.VCT_SETTINGS_PANEL.close();__comment('visual-1','Visual確認',{profileImage:${JSON.stringify(cdp.origin+'/avatar.svg')}});__clock+=600;`);
    await cdp.wait('!!document.querySelector(".rom-artwork:not([hidden])")?.naturalWidth',visualSession);
    assert.ok(await visualEval('document.querySelector(".rom-artwork").currentSrc.endsWith("/bomb.png")'));
    assert.equal(await visualEval('document.querySelector(".rom-symbol").hidden'),true);
    const visualShot = await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:1700,y:60,width:220,height:220,scale:3}},visualSession);
    fs.writeFileSync(path.join(artifacts,'visual-mode.png'),Buffer.from(visualShot.data,'base64'));
    await visualEval(`window.VCT_SETTINGS_PANEL.open();const input=document.querySelector('[data-config-key=VISUAL_MODE]');input.value='emoji';input.dispatchEvent(new Event('change',{bubbles:true}));`);
    assert.equal(await visualEval('document.querySelector(".rom-artwork").hidden'),true);
    assert.equal(await visualEval('document.querySelector(".rom-symbol").hidden'),false);
    await visualEval('window.VCT_SETTINGS_PANEL.close()');
    await cdp.wait('!!document.querySelector(".rom-artwork:not([hidden])")?.naturalWidth',visualSession);
    await visualEval(`document.querySelector('.rom-artwork').src='./assets/visual/missing.png'`);
    await cdp.wait('document.querySelector(".rom-artwork").hidden && !document.querySelector(".rom-symbol").hidden',visualSession);
    await visualEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,VISUAL_MODE:'emoji'});window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,VISUAL_MODE:'visual'});`);
    await cdp.wait('!!document.querySelector(".rom-artwork:not([hidden])")?.naturalWidth',visualSession);
    await visualEval('__clock+=2400');
    await cdp.wait('!!document.querySelector(".rom-artwork:not([hidden])")?.currentSrc.endsWith("/explosion.png")',visualSession);
    assert.equal(await visualEval('document.querySelectorAll(".rom-shard").length'),6);
    const blastShot = await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:1600,y:0,width:320,height:350,scale:2}},visualSession);
    fs.writeFileSync(path.join(artifacts,'visual-shatter.png'),Buffer.from(blastShot.data,'base64'));
    await cdp.send('Page.reload',{},visualSession);
    await cdp.wait('window.__connected === true',visualSession);
    assert.equal(await visualEval('window.CONFIG.VISUAL_MODE'),'visual');
    assert.equal(await visualEval('window.CONFIG.SHATTER_CARDS'),true);
    assert.equal(await visualEval('document.querySelectorAll(".rom-shard").length'),0);
    const audioSession = await newPage(cdp.origin + '/' + servedFolder + '/index.html?settings=1');
    const audioEval = expression => cdp.evaluate(expression, audioSession);
    await cdp.wait('!!window.VCT_SETTINGS_PANEL', audioSession);
    await audioEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG_DEFAULT,START_MIN:.01,WARN_MIN:.02,DANGER_MIN:.03,EXPLODE_MIN:.04});__comment('silent-1','無音確認');__clock+=600;`);
    await delay(250);
    await audioEval('__clock+=2400'); await delay(250);
    assert.equal(await audioEval('__audioContexts.length'), 0);
    // 試聴は実AudioContextを利用。テスト用Chromeの出力だけをミュートする。
    await cdp.send('Runtime.evaluate', {expression:'document.getElementById("rom-audio-test").click()',userGesture:true},audioSession);
    await cdp.wait('__tones === 1',audioSession);
    assert.equal(await audioEval('__audioContexts[0].state'),'running');
    await delay(450);
    await audioEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,EXPLOSION_SOUND:true,SOUND_VOLUME:17});
      for(let i=0;i<3;i++) __comment('sound-'+i,'音確認'+i);__clock+=600;`);
    await delay(250);
    await audioEval('__clock+=2400'); await delay(250);
    assert.equal(await audioEval('__tones'),2);
    await delay(650);
    await audioEval(`window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...CONFIG,VISUAL_MODE:'visual'}}));`);
    assert.equal(await audioEval('__tones'),2);
    await audioEval(`window.VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,EXPLOSION_SOUND:false});__comment('silent-2','再無音確認');__clock+=600;`);
    await delay(250);
    await audioEval('__clock+=2400'); await delay(250);
    assert.equal(await audioEval('__tones'),2);
    await cdp.send('Page.reload',{},audioSession);
    await cdp.wait('window.__connected === true',audioSession);
    assert.equal(await audioEval('CONFIG.SOUND_VOLUME'),17);
    assert.equal(await audioEval('CONFIG.EXPLOSION_SOUND'),false);
    assert.equal(await audioEval('__audioContexts.length'),0);
    for (const url of [cdp.origin + '/' + servedFolder + '/index.html?settings=1',pathToFileURL(path.join(root,'index.html')).href+'?settings=1']) {
      const mp3Session = await newPage(url);
      const mp3Eval = expression => cdp.evaluate(expression,mp3Session);
      await cdp.wait('!!window.VCT_SETTINGS_PANEL',mp3Session);
      await mp3Eval(`VCT_CONFIG_RUNTIME.commitLocal({...CONFIG_DEFAULT,START_MIN:.01,WARN_MIN:.02,DANGER_MIN:.03,EXPLODE_MIN:.04});
        const mode=document.querySelector('[data-config-key=SOUND_MODE]');mode.value='mp3';mode.dispatchEvent(new Event('change',{bubbles:true}));
        const volume=document.querySelector('[data-config-key=SOUND_VOLUME]');volume.value=23;volume.dispatchEvent(new Event('input',{bubbles:true}));`);
      assert.equal(await mp3Eval('CONFIG.SOUND_MODE'),'synth');
      await cdp.send('Runtime.evaluate',{expression:'document.getElementById("rom-audio-test").click()',userGesture:true},mp3Session);
      await cdp.wait('__media.length===1 && __media[0].currentTime>0',mp3Session);
      assert.ok(await mp3Eval('__media[0].duration > 3.9 && __media[0].duration < 4.1'));
      assert.equal(await mp3Eval('__media[0].volume'),.23);
      assert.equal(await mp3Eval('__tones'),0);
      await mp3Eval(`VCT_SETTINGS_PANEL.close();VCT_SETTINGS_PANEL.open();`);
      assert.equal(await mp3Eval('document.querySelector("[data-config-key=SOUND_MODE]").value'),'synth');
      await mp3Eval(`VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,EXPLOSION_SOUND:true,SOUND_MODE:'mp3',SOUND_VOLUME:17});
        for(let i=0;i<3;i++) __comment('mp3-'+i,'MP3確認'+i);__clock+=600;`);
      await delay(250);
      await mp3Eval('__clock+=2400');
      await cdp.wait('__media.length===2 && __media[1].currentTime>0',mp3Session);
      await delay(500);
      assert.equal(await mp3Eval('__media.length'),2);
      assert.equal(await mp3Eval('__media[1].volume'),.17);
      await mp3Eval(`VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,SOUND_OVERLAP:true});
        for(let i=0;i<5;i++) __comment('overlap-'+i,'重ね再生確認'+i);__clock+=600;`);
      assert.equal(await mp3Eval('__media[1].paused'),true);
      await delay(250);
      await mp3Eval('__clock+=2400');
      await cdp.wait('__media.length===5 && __media.slice(2).every(item=>item.currentTime>0)',mp3Session);
      await delay(450);
      assert.equal(await mp3Eval('__media.length'),5);
      await mp3Eval('VCT_CONFIG_RUNTIME.commitLocal({...CONFIG,EXPLOSION_SOUND:false})');
      assert.equal(await mp3Eval('__media.every(item=>item.paused)'),true);
      await cdp.send('Page.reload',{},mp3Session);
      await cdp.wait('window.__connected === true',mp3Session);
      assert.equal(await mp3Eval('CONFIG.SOUND_MODE'),'mp3');
      assert.equal(await mp3Eval('CONFIG.SOUND_OVERLAP'),true);
      assert.equal(await mp3Eval('__media.length'),0);
    }
    for (const url of [cdp.origin + '/' + servedFolder + '/index.html?settings=1',pathToFileURL(path.join(root,'index.html')).href+'?settings=1']) {
      const releaseSession = await newPage(url);
      const releaseEval = expression => cdp.evaluate(expression,releaseSession);
      await cdp.wait('!!window.VCT_SETTINGS_PANEL',releaseSession);
      await releaseEval(`VCT_CONFIG_RUNTIME.commitLocal({...CONFIG_DEFAULT,START_MIN:.01,WARN_MIN:.02,DANGER_MIN:.03,EXPLODE_MIN:.04});VCT_SETTINGS_PANEL.close();VCT_SETTINGS_PANEL.open();`);
      const releaseField = (key,value) => releaseEval(`(()=>{const input=document.querySelector('[data-config-key=${key}]');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));})();`);
      const releaseSave = () => releaseEval(`[...document.querySelectorAll('button')].find(el=>el.textContent==='変更を保存').click()`);
      await releaseField('RELEASE_MODE','allow');
      await releaseSave();
      assert.equal(await releaseEval('CONFIG.RELEASE_MODE'),'any');
      assert.ok(await releaseEval('document.querySelector(".vct-settings-status").textContent.includes("1件以上")'));
      await releaseField('RELEASE_ALLOW_WORDS','解除A\n解除B');
      await releaseField('RELEASE_DENY_WORDS','対象A\n対象B');
      await releaseSave();
      assert.equal(await releaseEval('CONFIG.RELEASE_MODE'),'allow');
      await releaseEval(`__comment('release-first','条件確認',{comment:'対象外'});__clock+=500;__comment('release-wait','条件確認',{comment:'対象外'});__clock+=600;`);
      await cdp.wait('document.querySelector(".rom-slot")?.dataset.status==="active"',releaseSession);
      await releaseEval(`__clock+=1000;__comment('release-no','条件確認',{comment:'解除Aです'});`);
      await delay(250);
      assert.equal(await releaseEval('document.querySelector(".rom-slot").dataset.status'),'active');
      assert.equal(await releaseEval('document.querySelector(".rom-time").textContent'),'00:01');
      await releaseEval(`__comment('release-yes','条件確認',{comment:'　<b>解除A</b>　'});`);
      assert.equal(await releaseEval('document.querySelector(".rom-slot").dataset.status'),'released');
      await releaseField('RELEASE_MODE','deny');
      await releaseSave();
      await releaseEval('__clock+=700'); await delay(250);
      await releaseEval(`__comment('release-deny','条件確認',{comment:'対象B'});`);
      assert.equal(await releaseEval('document.querySelector(".rom-slot").dataset.status'),'active');
      await releaseField('RELEASE_MODE','any');
      await releaseEval('VCT_SETTINGS_PANEL.close();VCT_SETTINGS_PANEL.open()');
      assert.equal(await releaseEval('document.querySelector("[data-config-key=RELEASE_MODE]").value'),'deny');
      await releaseEval(`__comment('release-partial','条件確認',{comment:'対象Bです'});`);
      assert.equal(await releaseEval('document.querySelector(".rom-slot").dataset.status'),'released');
      await cdp.send('Page.reload',{},releaseSession);
      await cdp.wait('window.__connected === true',releaseSession);
      assert.equal(await releaseEval('CONFIG.RELEASE_MODE'),'deny');
      assert.equal(await releaseEval('CONFIG.RELEASE_ALLOW_WORDS'),'解除A\n解除B');
      assert.equal(await releaseEval('CONFIG.RELEASE_DENY_WORDS'),'対象A\n対象B');
    }
    assert.deepEqual(cdp.errors, []);
    assert.deepEqual(cdp.unexpectedRequests, []);
    console.log('Chrome模擬検証: HTTP/file起動、透過、カード・画像・安全な名前表示、段階、設定保存・取消・不正値、一時停止、再読込、確認表示の分離が成功。');
  } finally {
    if (cdp) { try { await cdp.send('Browser.close'); } catch (_) {} cdp.socket.close(); }
    if (chrome && chrome.exitCode === null) chrome.kill();
    await new Promise(resolve => server.close(resolve));
    await delay(500);
    // この実行で作った一時プロファイルだけを削除する。
    if (path.resolve(profile).startsWith(path.resolve(os.tmpdir()) + path.sep + 'rom-bomb-browser-')) {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
