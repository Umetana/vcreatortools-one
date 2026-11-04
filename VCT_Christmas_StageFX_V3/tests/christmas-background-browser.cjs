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
  const filename = path.resolve(root, '.' + requestPath.replace(/^\/VCT_Christmas_StageFX_V3/, ''));
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[path.extname(filename)] || 'text/plain'); res.end(fs.readFileSync(filename));
});


async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('file:')?r.continue():r.abort());
 await context.addInitScript(()=>{const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});const k='vct.stage-fx.settings.'+JSON.stringify(['VCT_Christmas_StageFX_V3','default'])+'.christmas-tree.v1';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:2,count:500,seen:[],seed:123,giftSerial:2,gifts:[{id:1,slot:20,kind:'bell',rank:'standard'},{id:2,slot:60,kind:'present',rank:'large'}]}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async url=>{await page.goto(url);await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);await page.getByRole('tab',{name:'ステージ',exact:true}).click();};
 await open(origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1');
 const background=page.locator('[data-layer="background"]'),picker=page.locator('[data-config-key="CHRISTMAS_BACKGROUND"]');
 assert.equal(await picker.inputValue(),'legacy');assert.equal(await background.isVisible(),false);
 await page.evaluate(()=>window.testBackgroundTree=document.querySelector('.stage-effect[data-effect-id="christmas_tree"]'));
 const state=await page.evaluate(()=>localStorage.getItem(window.VCT_CONFIG_RUNTIME.storageKey+'.christmas-tree.v1'));
 const layout=await page.locator('.stage-effect[data-effect-id="christmas_tree"]').getAttribute('style');
 for(const [mode,file] of [['forest','background-forest-v1.png'],['fireplace','background-fireplace-v1.png'],['night','background-night-v1.png']]){
  await picker.selectOption(mode);assert.equal(await background.isVisible(),true);assert.ok((await background.evaluate(el=>getComputedStyle(el).backgroundImage)).includes(file));
  await page.evaluate(async file=>{const image=new Image();image.src='./assets/'+file;await image.decode();},file);
  await page.waitForFunction(()=>[...document.querySelectorAll('.fx-christmas-tree-root img')].every(im=>im.complete&&im.naturalWidth>0));
  assert.equal(await page.evaluate(()=>window.testBackgroundTree===document.querySelector('.stage-effect[data-effect-id="christmas_tree"]')),true);
  assert.equal(await page.locator('.stage-effect[data-effect-id="christmas_tree"]').getAttribute('style'),layout);
  assert.equal(await page.evaluate(()=>localStorage.getItem(window.VCT_CONFIG_RUNTIME.storageKey+'.christmas-tree.v1')),state);
  await page.evaluate(()=>document.getElementById('vct-settings-root').style.visibility='hidden');
  await page.screenshot({path:path.join(root,'tests/'+mode+'-background.png')});
  await page.evaluate(()=>document.getElementById('vct-settings-root').style.visibility='');
 }
 await picker.selectOption('transparent');assert.equal(await background.isVisible(),false);assert.equal(await background.evaluate(el=>el.style.backgroundImage),'none');
 await picker.selectOption('fireplace');await page.getByRole('button',{name:'変更を保存',exact:true}).click();
 await open(origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1');assert.equal(await picker.inputValue(),'fireplace');assert.equal(await background.isVisible(),true);
 await picker.selectOption('forest');await page.locator('.vct-settings-close').click();assert.ok((await background.evaluate(el=>el.style.backgroundImage)).includes('background-fireplace-v1.png'));
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());await page.getByRole('tab',{name:'ステージ',exact:true}).click();
 await page.locator('[data-config-key="CHRISTMAS_ASSET_MODE"]').selectOption('plain');assert.equal(await background.isVisible(),false);assert.equal(await background.evaluate(el=>el.style.backgroundImage),'none');
 await picker.selectOption('legacy');await page.locator('[data-config-key="SHOW_STAGE_BACKGROUND"]').check();
 const color=page.locator('[data-config-key="BG_COLOR"]');await color.fill('#123456');await color.dispatchEvent('input');assert.equal(await background.isVisible(),true);assert.equal(await background.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(18, 52, 86)');
 assert.equal(await page.locator('[data-config-field="BACKGROUND_IMAGE"]').isVisible(),false);
 await page.locator('[data-config-key="CHRISTMAS_ASSET_MODE"]').selectOption('generated');const image=page.locator('[data-config-key="BACKGROUND_IMAGE"]');await image.fill('assets/tree-base-v1.png');await image.dispatchEvent('input');assert.ok((await background.evaluate(el=>el.style.backgroundImage)).includes('tree-base-v1.png'));
 await picker.selectOption('night');await picker.selectOption('legacy');assert.equal(await image.inputValue(),'assets/tree-base-v1.png');
 await page.getByText('設定の読込・初期化',{exact:true}).click();await page.getByRole('button',{name:'背景・枠を透明',exact:true}).click();assert.equal(await picker.inputValue(),'transparent');assert.equal(await background.isVisible(),false);
 // file起動でプリセット保存・復元。
 await open(pathToFileURL(path.join(root,'index.html')).href+'?settings=1');await picker.selectOption('forest');await page.getByRole('button',{name:'変更を保存',exact:true}).click();
 await open(pathToFileURL(path.join(root,'index.html')).href+'?settings=1');assert.equal(await picker.inputValue(),'forest');assert.equal(await background.isVisible(),true);assert.equal(await page.locator('.stage-effect[data-effect-id="christmas_tree"]').getAttribute('data-count'),'500');
 // 生成素材なしで起動する場合、プリセットを選択済みでも生成画像を要求しない。
 const plain=await browser.newContext();let requests=0;
 await plain.route('**/*',r=>{const url=r.request().url();if(url.includes('/assets/')&&url.endsWith('.png'))requests++;return url.startsWith(origin)?r.continue():r.abort();});
 await plain.addInitScript(()=>{const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});localStorage.setItem('vct.stage-fx.settings.'+JSON.stringify(['VCT_Christmas_StageFX_V3','default']),JSON.stringify({CHRISTMAS_ASSET_MODE:'plain',CHRISTMAS_BACKGROUND:'forest'}));});
 const pp=await plain.newPage();pp.on('pageerror',e=>errors.push(e.message));await pp.goto(origin+'/VCT_Christmas_StageFX_V3/index.html?ui=0');await pp.evaluate(()=>window.VCTStage.effectsReady);await pp.locator('.fx-christmas-tree-scene').waitFor();assert.equal(await pp.locator('[data-layer="background"]').isVisible(),false);assert.equal(requests,0);await plain.close();
 assert.deepEqual(errors,[]);console.log('PASS: 背景3種・透明・既存の色画像・AI不使用・ツリー状態と配置保持・取消保存・一括透明化・HTTP/file保存・AI不使用起動の画像要求0');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
