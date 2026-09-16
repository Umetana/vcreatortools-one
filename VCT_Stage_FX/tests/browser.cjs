// 任意の開発環境のPlaywrightで実行。製品への依存追加は不要。
// 実運用のわんコメへ接続せず、OneSDK購読境界だけを差し替える。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (requestPath.endsWith('/onesdk.js')) { res.setHeader('Content-Type', 'text/javascript'); res.end('// テスト用OneSDKはinitScriptから注入'); return; }
  if (requestPath.endsWith('/vue3.min.js')) { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.resolve(root, '../__origin/js/vue3.min.js'))); return; }
  // 表示の正本を変更せず、同じ入力で比較するための読取専用ルート。
  if (requestPath.startsWith('/v3-reference/')) {
    const referenceRoot = path.resolve(root, '../view_comment_V3');
    const file = path.resolve(referenceRoot, requestPath.slice('/v3-reference/'.length));
    if (!file.startsWith(referenceRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'text/plain');
    res.end(file === path.join(referenceRoot, 'config.js') ? 'window.CONFIG = {};' : fs.readFileSync(file)); return;
  }
  const filename = path.resolve(root, '.' + requestPath.replace(/^\/VCT_Stage_FX/, ''));
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[path.extname(filename)] || 'text/plain'); res.end(fs.readFileSync(filename));
});
async function main() {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*', route => { const url=route.request().url(); return url.startsWith(origin)||url.startsWith('file:')?route.continue():route.abort(); });
    await context.addInitScript(() => {
      const subscriptions = new Map(); let id = 0;
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {},
        subscribe(options) { subscriptions.set(++id, options); return id; },
        unsubscribe(id) { subscriptions.delete(id); } };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      window.emitTestComment = raw => { subscriptions.forEach(item => { if (item.action === 'comments') item.callback(raw); }); };
      window.clearTestComments = () => { subscriptions.forEach(item => { if (item.action === 'clear') item.callback(); }); };
    });

 const page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/VCT_Stage_FX/index.html?settings=1');
 await page.locator('#vct-settings-root:not([hidden])').waitFor();
 await page.evaluate(()=>window.VCTStage.effectsReady);
 await page.getByRole('button',{name:'コメントを試す',exact:true}).click();
 assert.equal(await page.locator('.cmt').count(),1);
 await page.evaluate(()=>window.emitTestComment({service:'youtube',data:{id:'support',name:'応援リスナー',comment:'いつも楽しい配信をありがとう！',hasGift:true,price:1000,currency:'JPY',paidText:'¥1,000'}}));
 await page.waitForTimeout(500);
 assert.equal(await page.locator('.cmt').count(),2);
 assert.ok(await page.locator('.stage-effect').count()>0);
 assert.ok(await page.locator('.v3-heart-particle').count()>0);
 await page.evaluate(()=>document.body.style.background='#20262f');
 await page.screenshot({path:path.join(root,'tests/stage-smoke.png')});
 const preview = async values => { await page.evaluate(values => { window.fxTestConfig = { ...window.CONFIG, ...window.fxTestConfig, ...values }; window.dispatchEvent(new CustomEvent('vct-settings-preview', {detail:window.fxTestConfig})); }, values); await page.waitForTimeout(70); };
 const emit = async (id, extra={}) => page.evaluate(({id,extra})=>window.emitTestComment({service:'youtube',data:{id,name:'リスナー',comment:'コメント '+id,...extra}}),{id,extra});
 const clear = async () => {await page.evaluate(()=>window.clearTestComments());await page.waitForTimeout(550);};
 const tab = name => page.getByRole('tab',{name,exact:true}).click();
 // タブを跨ぐ下書き・数値補正・取消。入力途中をプレビューへ送らない。
 await page.locator('[data-range-key="COMMENT_X"]').fill('321');
 await page.locator('[data-range-key="COMMENT_X"]').press('Enter');
 assert.equal(await page.locator('[data-region-id="comments"]').evaluate(el=>el.style.left),'321px');
 await page.locator('[data-range-key="COMMENT_SCALE"]').fill('1.25');
 await page.locator('[data-range-key="COMMENT_SCALE"]').press('ArrowUp');
 assert.equal(await page.locator('[data-config-key="COMMENT_SCALE"]').inputValue(),'1.3');
 for (const [key,value] of Object.entries({COMMENT_X:323,COMMENT_Y:127,COMMENT_WIDTH:763,COMMENT_HEIGHT:883})) {
   const number=page.locator('[data-range-key="'+key+'"]');
   const slider=page.locator('[data-config-key="'+key+'"]');
   assert.equal(await slider.getAttribute('step'),'5'); assert.equal(await number.getAttribute('step'),'1');
   await number.fill(String(value));await number.press('Enter');await number.press('ArrowUp');
   assert.equal(await number.inputValue(),String(value+1));await number.press('ArrowDown');
   assert.equal(await number.inputValue(),String(value));
 }
 const coarse=page.locator('[data-config-key="COMMENT_X"]');
 await coarse.press('ArrowRight');
 assert.equal(Number(await page.locator('[data-range-key="COMMENT_X"]').inputValue()) % 5,0);
 await page.locator('[data-range-key="COMMENT_X"]').fill('323');await page.locator('[data-range-key="COMMENT_X"]').press('Enter');
 await page.locator('[data-range-key="COMMENT_X"]').fill('');await page.locator('[data-range-key="COMMENT_X"]').press('Enter');
 assert.equal(await page.locator('[data-range-key="COMMENT_X"]').inputValue(),'323');
 await tab('コメント表示');
 await page.locator('[data-config-key="DISPLAY_MODE"]').selectOption('popup');
 assert.ok(await page.locator('[data-section="popup"]').isVisible());
 assert.ok(!await page.locator('[data-section="underbar"]').isVisible());
 await tab('コメント装飾');
 await page.locator('[data-config-key="COMMENT_EFFECT"]').selectOption('stars');
 assert.ok(await page.locator('[data-section="stars"]').isVisible());
 assert.ok(!await page.locator('[data-section="heart"]').isVisible());
 await tab('コメント配置');
 assert.equal(await page.locator('[data-range-key="COMMENT_X"]').inputValue(),'323');
 for (const key of ['COMMENT_X','COMMENT_Y','COMMENT_WIDTH','COMMENT_HEIGHT','COMMENT_SCALE']) {
   assert.ok(await page.locator('[data-range-key="'+key+'"]').isDisabled());
   assert.ok(await page.locator('[data-config-key="'+key+'"]').isDisabled());
 }
 assert.ok(await page.getByRole('button',{name:'左上',exact:true}).isDisabled());
 await tab('コメント表示');await page.locator('[data-config-key="POPUP_PLACEMENT"]').selectOption('anchor');
 await tab('コメント配置');
 assert.ok(await page.locator('[data-range-key="COMMENT_X"]').isEnabled());
 assert.equal(await page.locator('[data-region-id="comments"]').evaluate(el=>el.style.left),'323px');
 await tab('コメント表示');await page.locator('[data-config-key="DISPLAY_MODE"]').selectOption('underbar');
 await tab('コメント配置');assert.ok(await page.locator('[data-range-key="COMMENT_X"]').isDisabled());
 await tab('コメント表示');await page.locator('[data-config-key="DISPLAY_MODE"]').selectOption('stack');
 await tab('コメント配置');assert.ok(await page.locator('[data-range-key="COMMENT_X"]').isEnabled());
 assert.equal(await page.locator('[data-range-key="COMMENT_X"]').inputValue(),'323');
 await page.locator('.vct-settings-close').click();
 assert.equal(await page.locator('[data-region-id="comments"]').evaluate(el=>el.style.left),'80px');
 await clear();
 await preview({DISPLAY_MODE:'stack',REDUCED_MOTION:false,COMMENT_EFFECT:'heart',HEART_TARGET:'all'});
 await emit('once'); await emit('once');
 assert.equal(await page.locator('.cmt').count(),1);
 await page.waitForTimeout(600);
 await preview({AUTO_HIDE_MS:100}); await page.waitForTimeout(650);
 assert.equal(await page.locator('.cmt').count(),0);
 // ポップアップは領域中心基準。ステージ・領域・カードの各倍率を分離。
 await preview({DISPLAY_MODE:'popup',AUTO_HIDE_MS:0,COMMENT_X:100,COMMENT_Y:80,COMMENT_WIDTH:1000,COMMENT_HEIGHT:600,COMMENT_SCALE:1.2,POPUP_PLACEMENT:'anchor',POPUP_X:50,POPUP_Y:50,POPUP_SPREAD_X:0,POPUP_SPREAD_Y:0,POPUP_DURATION:6,POPUP_MAX_ITEMS:2});
 await emit('popup');await page.waitForTimeout(500);
 const center=await page.locator('.cmt-shell').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.stage-region').getBoundingClientRect();return [a.x+a.width/2-b.x,a.y+a.height/2-b.y,b.width,b.height];});
 assert.ok(Math.abs(center[0]-center[2]/2)<1 && Math.abs(center[1]-center[3]/2)<1);
 await emit('popup2');await emit('popup3');await page.waitForTimeout(600);assert.equal(await page.locator('.cmt').count(),2);
 await clear();
 // 全面へ切り替えても指定領域の数値と倍率を保持し、双方向に復帰する。
 const regionState = () => page.locator('[data-region-id="comments"]').evaluate(el => ['left','top','width','height','transform'].map(key => el.style[key]));
 const customRegion = await regionState();
 await preview({POPUP_PLACEMENT:'random'});
 assert.deepEqual(await regionState(),['0px','0px','1920px','1080px','scale(1)']);
 await preview({POPUP_PLACEMENT:'anchor'}); assert.deepEqual(await regionState(),customRegion);
 await preview({DISPLAY_MODE:'stack'}); assert.deepEqual(await regionState(),customRegion);
 await preview({DISPLAY_MODE:'popup',POPUP_PLACEMENT:'random'});
 await preview({DISPLAY_MODE:'stack'}); assert.deepEqual(await regionState(),customRegion);
 // Underbarはステージ全幅。指定領域の倍率は使用しない。
 await page.setViewportSize({width:960,height:540});
 await preview({DISPLAY_MODE:'underbar',UNDERBAR_MODE:'ticker',COMMENT_WIDTH:1000,COMMENT_HEIGHT:600,COMMENT_SCALE:1.5,UNDERBAR_SCALE:120,UNDERBAR_SPEED:300,UNDERBAR_WIDTH:500,UNDERBAR_LANES:3,UNDERBAR_LANE_MODE:'sequence',UNDERBAR_QUEUE:20});
 for(let i=0;i<6;i++) await emit('ticker'+i);
 await page.waitForTimeout(400);
 assert.equal(await page.locator('[data-underbar-state="active"]').count(),3);
 const ticker=await page.locator('[data-underbar-state="active"]').first().evaluate(el=>({width:parseFloat(el.style.width),rect:el.getBoundingClientRect().width,x:new DOMMatrix(getComputedStyle(el).transform).m41}));
 assert.ok(Math.abs(ticker.rect-ticker.width*.5*1.2)<1);
 assert.ok(ticker.x>1700 && ticker.x<1960, 'ステージ幅1920から発車');
 const before=await page.locator('[data-underbar-state="active"]').first().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
 await preview({REDUCED_MOTION:true}); await page.waitForTimeout(350);
 assert.equal(await page.locator('.v3-heart-particle').count(),0);
 const x1=await page.locator('[data-underbar-state="active"]').first().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
 await page.waitForTimeout(300);
 const x2=await page.locator('[data-underbar-state="active"]').first().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
 assert.ok(x2<x1-50,'動き抑制中も横流しが進む');
 assert.equal(await page.locator('.stage-effect').count(),0);
 await clear();
 await preview({UNDERBAR_MODE:'stack',UNDERBAR_SLIDE_MS:100,REDUCED_MOTION:false});
 await emit('stack1');await emit('stack2');await page.waitForTimeout(250);
 const positions=await page.locator('.cmt-shell').evaluateAll(els=>els.map(el=>({x:new DOMMatrix(getComputedStyle(el).transform).m41,width:parseFloat(el.style.width)*1.2})));
 assert.equal(positions.length,2);
 assert.ok(Math.abs(positions[1].x+positions[1].width-1900)<1);
 assert.ok(positions[1].x-(positions[0].x+positions[0].width)>=59);
 await page.waitForTimeout(300);assert.equal(await page.locator('.cmt').count(),2);
 await page.screenshot({path:path.join(root,'tests/underbar-scaled.png')});
 await clear();
 // 再描画で正規化・演出を繰り返さない。
 await page.setViewportSize({width:1920,height:1080});
 await preview({DISPLAY_MODE:'stack',COMMENT_SCALE:1,REDUCED_MOTION:false});
 await emit('support2',{hasGift:true,price:1000,currency:'JPY'});
 await page.evaluate(()=>window.VCT_STAGE_PREVIEW.stopAll());
 await preview({FONT_SIZE:30});assert.equal(await page.locator('.stage-effect').count(),0);
 await clear();
 const reference=await context.newPage();reference.on('pageerror',e=>errors.push(e.message));
 await reference.goto(origin+'/v3-reference/index.html');
    const imageUrl = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#6688aa"/></svg>');
    const fixtures = [
      { id: 'normal', name: '通常', comment: '通常コメント', profileImage: imageUrl, badges: [{ url: imageUrl, label: 'バッジ' }], isOwner: true, isModerator: true },
      { id: 'superchat', name: '支援', giftType: 'superchat', hasGift: true, price: 1000, currency: 'JPY', paidText: '¥1,000', comment: '応援しています', colors: { headerBackgroundColor: '#ffb300' } },
      { id: 'sticker', name: 'ステッカー', giftType: 'supersticker', hasGift: true, price: 500, currency: 'JPY', paidText: '¥500', comment: `<img class="gift-sticker" src="${imageUrl}" alt="ステッカー">`, colors: { headerBackgroundColor: '#00bfff' } },
      { id: 'jewel', name: 'ジュエル', giftType: 'jewel', jewels: 1000, comment: 'ジュエル 1000 個 を使って ピース を送りました' },
      { id: 'join', name: '加入', giftType: 'subscribe', membership: { primary: 'メンバー', sub: 'ようこそ！' } },
      { id: 'milestone', name: '継続', giftType: 'milestonechat', membership: { primary: 'メンバー歴 6か月' }, comment: '半年ありがとう' },
      { id: 'gift', name: 'ギフト送信', giftType: 'sponsorgift', giftCount: 5, comment: '5件のメンバーシップギフト' },
      { id: 'receive', name: 'ギフト受取', giftType: 'giftreceived', comment: 'ギフトを受け取りました' },
      { id: 'sticky', name: '固定', isSticky: true, isModerator: true, comment: 'お知らせ', translated: 'Announcement' }
    ];
    for (const target of [page, reference]) {
      await target.evaluate(items => {
        window.dispatchEvent(new CustomEvent('vct-settings-preview', { detail: { ...window.CONFIG, DISPLAY_MODE: "stack", COMMENT_EFFECT: "none", FONT_SIZE: 24, MAX_ITEMS: 30, FADE_IN_MS: 1, FADE_OUT_MS: 1, ENABLE_STAGE_EFFECTS: false } }));
        items.forEach(data => window.emitTestComment({ service: 'youtube', data }));
      }, fixtures);
      await target.waitForFunction(count => document.querySelectorAll('.cmt').length === count, fixtures.length);
    }
    const snapshot = target => target.evaluate(() => [...document.querySelectorAll('.cmt')].map(el => ({
      labels: [...el.querySelectorAll('.cmt__meta-label')].map(label => label.textContent),
      message: el.querySelector('.cmt__message')?.textContent || '',
      flags: [...el.querySelectorAll('.cmt__user-flag')].map(flag => flag.textContent),
      icons: el.querySelectorAll('.cmt__icon img').length, badges: el.querySelectorAll('.cmt__badge').length,
      sticker: el.querySelectorAll('.emoji--sticker').length,
      background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor,
      radius: getComputedStyle(el).borderRadius, fontSize: el.querySelector('.cmt__message') ? getComputedStyle(el.querySelector('.cmt__message')).fontSize : ''
    })));
    const restored = await snapshot(page);
    assert.deepEqual(restored, await snapshot(reference));
    assert.equal(restored[1].labels.join(' '), 'スパチャ ¥1,000');
    assert.equal(restored[5].labels.join(' '), 'メンバー 6ヶ月');
    assert.equal(restored[6].labels.join(' '), 'メンギフ 5件');

 await reference.close();
 await preview({COMMENT_TRANSLATION_MODE:'both'});
 assert.ok(await page.locator('.cmt__message--translation').count()>0);
 await preview({SHOW_EVENT_MESSAGE_SUPERCHAT:false});
 assert.ok(!(await page.locator('.cmt').nth(1).innerText()).includes('応援しています'));
 // 小さな対話画面でもタブと保存ボタンに到達できる。
 await page.setViewportSize({width:960,height:540});
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());
 await tab('コメント配置');
 assert.ok(await page.locator('.vct-settings-controls').evaluate(el=>el.clientHeight>=80));
 const footer=await page.locator('.vct-settings-panel footer').boundingBox();
 assert.ok(footer.y+footer.height<=541);
 await page.screenshot({path:path.join(root,'tests/settings-540.png')});
 await page.locator('.vct-settings-close').click();
 await page.setViewportSize({width:1920,height:1080});
 // HTTPプロファイルと共通の演出一覧。異なる設定の保存を混ぜない。
 await page.goto(origin+'/VCT_Stage_FX/index.html?profile=talk&settings=1');
 await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);
 await page.locator('[data-range-key="COMMENT_X"]').fill('222');await page.locator('[data-range-key="COMMENT_X"]').press('Enter');
 await tab('コメント装飾');await page.locator('[data-config-key="COMMENT_EFFECT"]').selectOption('flash');
 await page.getByRole('button',{name:'保存して再読み込み',exact:true}).click();
 await page.waitForFunction(()=>window.CONFIG?.COMMENT_X===222 && window.CONFIG?.COMMENT_EFFECT==='flash');
 await page.evaluate(async()=>{await window.VCTStage.effectsReady;await window.VCTStage.catalog.change('halloween_parade_effect',false);});
 await page.goto(origin+'/VCT_Stage_FX/index.html?profile=game');await page.evaluate(()=>window.VCTStage.effectsReady);
 assert.equal(await page.evaluate(()=>window.CONFIG.COMMENT_X),80);
 assert.equal(await page.evaluate(()=>!!window.VCTStage.registry.get('halloween_parade_effect')),false);
 await page.goto(origin+'/VCT_Stage_FX/index.html?profile=talk');
 assert.equal(await page.evaluate(()=>window.CONFIG.COMMENT_X),222);
 assert.equal(await page.evaluate(()=>window.CONFIG.COMMENT_EFFECT),'flash');
 // UI非表示、file起動、clearと破棄。
 await page.goto(origin+'/VCT_Stage_FX/index.html?ui=0&settings=1');
 assert.equal(await page.locator('#vct-settings-launcher').count(),0);
 await page.goto(pathToFileURL(path.join(root,'index.html')).href+'?profile=ignored&settings=1');
 await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);
 assert.equal(await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.profileId),'default');
 await page.getByRole('button',{name:'コメントを試す',exact:true}).click();assert.equal(await page.locator('.cmt').count(),1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 assert.equal(await page.locator('.cmt').count(),0);assert.equal(await page.locator('.stage-effect').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: 表示方式・拡縮・動き抑制・タブ・取消保存・プロファイル・file・破棄');
 console.log('PASS: 縦積み・カード装飾・画面演出・設定UIの接続');
 } finally {await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
