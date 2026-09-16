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
 await context.route('**/*',route=>{const url=route.request().url();return url.startsWith(origin)||url.startsWith('file:')?route.continue():route.abort();});
    await context.addInitScript(() => {
      const subscriptions = new Map(); let id = 0;
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {},
        subscribe(options) { subscriptions.set(++id, options); return id; },
        unsubscribe(id) { subscriptions.delete(id); } };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      window.emitTestComment = raw => { subscriptions.forEach(item => { if (item.action === 'comments') item.callback(raw); }); };
      window.clearTestComments = () => { subscriptions.forEach(item => { if (item.action === 'clear') item.callback(); }); };
    });


 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/VCT_Stage_FX/index.html?settings=1');
 await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);
 await page.getByRole('tab',{name:'画面演出',exact:true}).click();
 await page.locator('[data-config-key="STAGE_EFFECT_ID"]').selectOption('heart_effect');
 assert.ok(await page.locator('[data-section="plugin:heart_effect"]').isVisible());
 assert.ok(!await page.locator('[data-config-field="STAGE_EFFECT_COUNT"]').isVisible());
 await page.locator('.vct-settings-close').click();
 await page.evaluate(()=>{
 document.body.style.background='#20262f';
 window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,STAGE_EFFECT_ID:'heart_effect',STAGE_EFFECT_DURATION_MS:3000}}));
 window.VCT_STAGE_PREVIEW.effect();
 });
 assert.equal(await page.locator('.fx-celebration-heart').count(),18);
 await page.waitForTimeout(1000);
 assert.ok(await page.locator('.fx-celebration-heart').evaluateAll(els=>els.some(el=>parseFloat(getComputedStyle(el).opacity)>.5)));
 await page.screenshot({path:path.join(root,'tests/heart-effect.png')});
 await page.evaluate(()=>window.VCT_STAGE_PREVIEW.stopAll());
 assert.equal(await page.locator('.fx-celebration-particle').count(),0);

 for(const [id,kind,count] of [['stars_effect','stars',24],['confetti_effect','confetti',60],['sparkle_effect','sparkle',24]]) {
  await page.evaluate(id=>{window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,STAGE_EFFECT_ID:id,STAGE_EFFECT_DURATION_MS:3000}}));window.VCT_STAGE_PREVIEW.effect();},id);
  assert.equal(await page.locator('.fx-celebration-'+kind).count(),count);
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(root,'tests/'+kind+'-effect.png')});
  const valid=await page.evaluate(()=>{window.capturedAnimations=document.querySelector('[data-layer="effects"]').getAnimations({subtree:true});return window.capturedAnimations.every(a=>a.effect.getComputedTiming().endTime<3000);});
  assert.ok(valid,'すべての粒がHost終了前に消える');
  await page.evaluate(()=>window.VCT_STAGE_PREVIEW.stopAll());
  assert.equal(await page.locator('.fx-celebration-particle').count(),0);
  assert.ok(await page.evaluate(()=>window.capturedAnimations.every(a=>a.playState==='idle')));
 }
 // 重ね掛け、待機、動き抑制でも管理外のDOMやアニメーションを残さない。
 await page.evaluate(()=>{
  window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,STAGE_EFFECT_ID:'confetti_effect',STAGE_EFFECT_POLICY:'overlap',STAGE_EFFECT_MAX_ACTIVE:2,FX_CONFETTI_COUNT:60,STAGE_EFFECT_DURATION_MS:3000}}));
  window.VCT_STAGE_PREVIEW.effect();window.VCT_STAGE_PREVIEW.effect();
 });
 assert.equal(await page.locator('.fx-celebration-confetti').count(),120);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,REDUCED_MOTION:true}})));
 assert.equal(await page.locator('.fx-celebration-particle').count(),0);
 for(const id of ['heart_effect','stars_effect','confetti_effect','sparkle_effect']) {
  await page.evaluate(id=>{
   window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,STAGE_EFFECT_ID:id,STAGE_EFFECT_DURATION_MS:1200,REDUCED_MOTION:false}}));
   window.VCT_STAGE_PREVIEW.effect();window.VCT_STAGE_PREVIEW.effect();window.VCT_STAGE_PREVIEW.stopLast();
  },id);
  assert.equal(await page.locator('.stage-effect').count(),1);
  await page.waitForTimeout(1400);assert.equal(await page.locator('.stage-effect').count(),0);
 }
 // 固有値の保存と再読込、選択中の項目だけ表示。
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());
 await page.getByRole('tab',{name:'画面演出',exact:true}).click();
 await page.locator('[data-config-key="STAGE_EFFECT_ID"]').selectOption('sparkle_effect');
 await page.locator('[data-range-key="FX_SPARKLE_SIZE"]').fill('72');await page.locator('[data-range-key="FX_SPARKLE_SIZE"]').press('Enter');
 await page.getByRole('button',{name:'保存して再読み込み',exact:true}).click();
 await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);
 assert.equal(await page.evaluate(()=>window.CONFIG.FX_SPARKLE_SIZE),72);
 await page.getByRole('tab',{name:'画面演出',exact:true}).click();
 assert.ok(await page.locator('[data-section="plugin:sparkle_effect"]').isVisible());
 assert.ok(!await page.locator('[data-section="plugin:heart_effect"]').isVisible());
 await page.locator('[data-config-key="STAGE_EFFECT_ID"]').selectOption('sample_effect');
 assert.ok(await page.locator('[data-config-field="STAGE_EFFECT_COUNT"]').isVisible());
 // fileからも共有スクリプトを読み込み、縮小Stageで表示できる。
 await page.goto(pathToFileURL(path.join(root,'index.html')).href+'?ui=0');await page.evaluate(()=>window.VCTStage.effectsReady);
 await page.setViewportSize({width:960,height:540});
 await page.evaluate(()=>{
  const api=window.VCTStage;
  window.effectTestHost=new api.EffectHost({container:document.querySelector('[data-layer="effects"]')});
  window.effectTestHost.trigger('sparkle_effect',{duration:3000,settings:{FX_SPARKLE_COUNT:3,FX_SPARKLE_SIZE:72}});
 });
 assert.equal(await page.locator('.fx-celebration-sparkle').count(),3);
 await page.evaluate(()=>window.effectTestHost.destroy());assert.equal(await page.locator('.fx-celebration-particle').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: 4演出の描画・停止・自然終了・待機取消・動き抑制・設定保存・file表示');
 }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
