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
  if (requestPath.endsWith('/effects-list.js')) { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(root,'effects-list.js'),'utf8') + ';window.VCT_EFFECTS_LIST.push("ambient_test_a","ambient_test_b");'); return; }
  const fixtureId = requestPath.match(/\/effects\/(ambient_test_[ab])\/(main.js|style.css)$/);
  if (fixtureId) { res.setHeader('Content-Type', fixtureId[2] === 'main.js' ? 'text/javascript' : 'text/css'); res.end(fixtureId[2] === 'main.js' ? fixture(fixtureId[1]) : ''); return; }
  const filename = path.resolve(root, '.' + requestPath.replace(/^\/VCT_Stage_FX/, ''));
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[path.extname(filename)] || 'text/plain'); res.end(fs.readFileSync(filename));
});

// 常設の試験用Plugin。製品の演出一覧や実運用設定には追加しない。
function fixture(id) { return `(function(){
class Ambient {
 static manifest={stageApi:1,name:'常設試験 ${id}',lifecycle:'persistent'};
 constructor(context,params){this.context=context;this.params=params;}
 start(){
  const root=this.context.root;root.dataset.ticks='0';root.dataset.starts='1';
  const dot=document.createElement('span');dot.textContent='✦';dot.style.cssText='position:absolute;left:20px;top:30px;color:#ffd478;font-size:48px';root.append(dot);
  this.context.animations.animate(dot,[{transform:'translateX(0)'},{transform:'translateX(200px)'}],{duration:1000,iterations:Infinity});
  const tick=()=>{root.dataset.ticks=String(Number(root.dataset.ticks)+1);this.context.timers.setTimeout(tick,20);};
  this.context.timers.setTimeout(tick,20);this.update(this.params);
 }
 update(params){this.params=params;this.context.root.dataset.paused=String(params.paused);}
 destroy(){}
}
window.VCTStage.registry.register('${id}',Ambient);
})();`; }
async function main() {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',route=>{const url=route.request().url();return url.startsWith(origin)||url.startsWith('file:')?route.continue():route.abort();});
 await context.addInitScript(()=>{
  const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};
  Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/VCT_Stage_FX/index.html?settings=1');
 await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);
 const effectKey=(id,name)=>`STAGE_PLUGIN_${id}_${name}`;
 const number=key=>page.locator(`[data-range-key="${key}"]`);
 await page.getByRole('tab',{name:'演出配置',exact:true}).click();
 await page.getByLabel('配置する演出',{exact:true}).selectOption('heart_effect');
 const xKey=effectKey('heart_effect','X');
 await number(xKey).fill('123');await number(xKey).press('Enter');
 await number(effectKey('heart_effect','WIDTH')).fill('400');await number(effectKey('heart_effect','WIDTH')).press('Enter');
 await number(effectKey('heart_effect','HEIGHT')).fill('500');await number(effectKey('heart_effect','HEIGHT')).press('Enter');
 await number(effectKey('heart_effect','SCALE')).fill('0.8');await number(effectKey('heart_effect','SCALE')).press('Enter');
 await page.getByRole('button',{name:'マウスで配置調整',exact:true}).click();
 const overlay=page.locator('.vct-placement-editor');let rect=await overlay.boundingBox();
 await page.mouse.move(rect.x+40,rect.y+40);await page.mouse.down();await page.mouse.move(rect.x+120,rect.y+80);await page.mouse.up();
 assert.equal(await number(xKey).inputValue(),'203');
 await page.mouse.wheel(0,-100);assert.equal(await number(effectKey('heart_effect','SCALE')).inputValue(),'0.85');
 await page.setViewportSize({width:960,height:540});await page.waitForTimeout(80);
 rect=await overlay.boundingBox();await page.mouse.move(rect.x+20,rect.y+20);await page.mouse.down();await page.mouse.move(rect.x+40,rect.y+30);await page.mouse.up();
 assert.equal(await number(xKey).inputValue(),'243');
 await page.setViewportSize({width:1920,height:1080});
 await page.getByLabel('配置する演出',{exact:true}).selectOption('stars_effect');
 assert.equal(await number(effectKey('stars_effect','X')).inputValue(),'0');assert.ok(!await overlay.isVisible());
 await page.getByLabel('配置する演出',{exact:true}).selectOption('heart_effect');assert.equal(await number(xKey).inputValue(),'243');
 await page.getByRole('button',{name:'変更を保存',exact:true}).click();
 await page.reload();await page.locator('#vct-settings-root:not([hidden])').waitFor();
 await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('heart_effect');
 assert.equal(await number(xKey).inputValue(),'243');
 await number(xKey).fill('999');await number(xKey).press('Enter');await page.locator('.vct-settings-close').click();
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());assert.equal(await number(xKey).inputValue(),'243');
 await page.getByRole('button',{name:'演出を試す',exact:true}).click();
 assert.equal(await page.locator('[data-layer="effects"] .stage-effect').getAttribute('data-effect-id'),'heart_effect');
 assert.equal(await page.locator('[data-layer="effects"] .stage-effect').evaluate(el=>el.style.left),'243px');
 await page.getByRole('button',{name:'直前の演出を停止',exact:true}).click();
 // 常設2種類を有効化し、単発と独立した表示・更新・停止を確認する。
 await page.evaluate(()=>{
 const k=window.VCTStage.effectKey;
 window.VCT_CONFIG_RUNTIME.commitLocal({...window.CONFIG,[k('ambient_test_a','ENABLED')]:true,[k('ambient_test_b','ENABLED')]:true,
 [k('ambient_test_a','X')]:120,[k('ambient_test_a','Y')]:450,[k('ambient_test_a','WIDTH')]:400,[k('ambient_test_a','HEIGHT')]:400,
 STAGE_EFFECT_ID:'heart_effect',STAGE_EFFECT_DURATION_MS:1200});
 window.VCT_SETTINGS_PANEL.refreshSaved();
 });
 const ambient=page.locator('[data-layer="ambient"] .stage-effect');assert.equal(await ambient.count(),2);
 const a=ambient.filter({has:page.locator('span')}).first();
 await page.evaluate(()=>{window.testAmbientNode=document.querySelector('[data-effect-id="ambient_test_a"]');window.VCT_STAGE_PREVIEW.effect();});
 const transient=page.locator('[data-layer="effects"] .stage-effect');assert.equal(await transient.count(),1);
 assert.equal(await transient.evaluate(el=>el.style.left),'243px');assert.equal(await transient.evaluate(el=>el.style.transform),'scale(0.85)');
 await page.waitForTimeout(1350);assert.equal(await transient.count(),0);assert.equal(await ambient.count(),2);
 await page.getByRole('button',{name:'画面演出を全停止',exact:true}).click();
 assert.equal(await ambient.count(),2);assert.equal(await a.getAttribute('data-paused'),'true');
 const ticks=await a.getAttribute('data-ticks');await page.waitForTimeout(100);assert.equal(await a.getAttribute('data-ticks'),ticks);
 assert.equal(await a.locator('span').evaluate(el=>el.getAnimations()[0].playState),'paused');
 await page.getByRole('button',{name:'常設の動きを再開',exact:true}).click();await page.waitForTimeout(100);
 assert.notEqual(await a.getAttribute('data-ticks'),ticks);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,REDUCED_MOTION:true}})));
 assert.equal(await a.getAttribute('data-paused'),'true');assert.equal(await ambient.count(),2);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-reset-preview')));
 assert.equal(await a.getAttribute('data-paused'),'false');assert.equal(await page.evaluate(()=>window.testAmbientNode===document.querySelector('[data-effect-id="ambient_test_a"]')),true);
 // 受付OFFは実行中・待機中も停止する。
 await page.evaluate(()=>{window.VCT_STAGE_PREVIEW.effect();window.VCT_STAGE_PREVIEW.effect();const k=window.VCTStage.effectKey;window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,[k('heart_effect','ENABLED')]:false}}));});
 assert.equal(await transient.count(),0);assert.equal(await page.evaluate(()=>window.VCT_STAGE_PREVIEW.effect().reason),'plugin-off');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-reset-preview')));
 await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('ambient_test_a');
 await page.screenshot({path:path.join(root,'tests/effect-placement.png')});
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await ambient.count(),0);
 assert.deepEqual(errors,[]);
 // ローカルファイルでも同じ配置を使い、操作UIを非表示にできる。
 const filePage=await context.newPage();filePage.on('pageerror',e=>errors.push(e.message));
 await filePage.goto(pathToFileURL(path.join(root,'index.html')).href+'?ui=0');await filePage.evaluate(()=>window.VCTStage.effectsReady);
 assert.equal(await filePage.locator('#vct-settings-launcher').count(),0);
 await filePage.evaluate(()=>{const k=window.VCTStage.effectKey;window.VCT_CONFIG_RUNTIME.commitLocal({...window.CONFIG,[k('sample_effect','X')]:321,[k('sample_effect','SCALE')]:.6});const container=document.querySelector('[data-layer="effects"]');const h=new window.VCTStage.EffectHost({container});h.trigger('sample_effect',{placement:{x:321,y:20,width:500,height:400,scale:.6},duration:1200});window.testHost=h;});
 assert.equal(await filePage.locator('.stage-effect').evaluate(el=>el.style.left),'321px');
 await filePage.evaluate(()=>window.testHost.destroy());
 await filePage.evaluate(()=>{const h=new window.VCTStage.EffectHost({container:document.querySelector('[data-layer="effects"]')});h.trigger('sample_effect',{placement:{x:0,y:0,width:40,height:40,scale:1},duration:1200});window.testHost=h;});
 assert.equal(await filePage.locator('.fx-sample-ring').first().evaluate(el=>el.style.left),'20px');
 assert.equal(await filePage.locator('.fx-sample-ring').first().evaluate(el=>el.style.top),'20px');
 await filePage.evaluate(()=>window.testHost.destroy());
 assert.deepEqual(errors,[]);
 console.log('PASS: 演出の個別配置・縮小画面でのドラッグ・倍率・対象分離・保存取消・常設2種と単発の共存・一時停止再開・動き抑制・個別OFF・破棄・file起動');
 }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
