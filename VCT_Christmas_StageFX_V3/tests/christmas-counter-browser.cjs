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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}});await context.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('file:')?r.continue():r.abort());
 await context.addInitScript(()=>{let id=0;const subs=new Map();const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(v){subs.set(++id,v);return id;},unsubscribe(id){subs.delete(id);}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});window.emitCounterTest=raw=>subs.forEach(s=>{if(s.action==='comments')s.callback(raw);});const k='vct.stage-fx.settings.'+JSON.stringify(['VCT_Christmas_StageFX_V3','default'])+'.christmas-tree.v1';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:1,count:125,seen:[]}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async()=>{await page.goto(origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1');await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('christmas_tree');};
 await open();const counter=page.locator('.fx-christmas-tree-counter'),toggle=page.locator('[data-config-key="CHRISTMAS_TREE_SHOW_COUNTER"]');
 assert.equal(await counter.isVisible(),false);await toggle.check();assert.equal(await counter.textContent(),'125 / 500');assert.equal(await counter.evaluate(el=>getComputedStyle(el).fontSize),'32px');
 const sceneBefore=await page.locator('.fx-christmas-tree-scene').getAttribute('style');
 await page.getByRole('button',{name:'変更を保存',exact:true}).click();await open();assert.equal(await toggle.isChecked(),true);assert.equal(await counter.textContent(),'125 / 500');
 await page.evaluate(()=>window.emitCounterTest({service:'youtube',data:{id:'counter-normal',name:'試験',comment:'参加'}}));await page.waitForFunction(()=>document.querySelector('.fx-christmas-tree-counter').textContent==='126 / 500');
 await page.getByRole('button',{name:'成長を試す（保存しない）',exact:true}).click();assert.equal(await counter.textContent(),'150 / 500');await page.getByRole('button',{name:'実際の成長に戻す',exact:true}).click();assert.equal(await counter.textContent(),'126 / 500');
 const size=page.locator('[data-range-key="CHRISTMAS_TREE_COUNTER_SIZE"]');await size.fill('48');await size.press('Enter');assert.equal(await counter.evaluate(el=>getComputedStyle(el).fontSize),'48px');
 assert.equal(await page.locator('.fx-christmas-tree-scene').getAttribute('style'),sceneBefore);
 await toggle.uncheck();assert.equal(await counter.isVisible(),false);await page.locator('.vct-settings-close').click();assert.equal(await counter.isVisible(),true);assert.equal(await counter.evaluate(el=>getComputedStyle(el).fontSize),'32px');
 await page.evaluate(()=>{window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_BACKGROUND:'forest'});document.getElementById('vct-settings-root').style.visibility='hidden';});await page.waitForFunction(()=>[...document.querySelectorAll('.fx-christmas-tree-root img')].every(im=>im.complete&&im.naturalWidth>0));await page.screenshot({path:path.join(root,'tests/christmas-counter.png')});
 await page.evaluate(()=>{document.getElementById('vct-settings-root').style.visibility='';window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_GOAL:10,CHRISTMAS_TREE_COUNTER_SIZE:64});window.VCT_SETTINGS_PANEL.open();});
 assert.equal(await counter.textContent(),'126 / 10');await page.getByRole('tab',{name:'ステージ',exact:true}).click();await page.locator('[data-config-key="CHRISTMAS_ASSET_MODE"]').selectOption('plain');assert.equal(await counter.isVisible(),true);assert.equal(await counter.textContent(),'126 / 10');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,CHRISTMAS_TREE_GOAL:1000000,STAGE_PLUGIN_christmas_tree_WIDTH:240}})));
 const fit=await counter.evaluate(el=>({available:el.clientWidth-24,text:el.firstElementChild.scrollWidth}));assert.ok(fit.text<=fit.available+1);
 await page.evaluate(()=>window.VCT_STAGE_PREVIEW.stopAll());assert.equal(await counter.isVisible(),true);
 const fp=await context.newPage();fp.on('pageerror',e=>errors.push(e.message));await fp.goto(pathToFileURL(path.join(root,'index.html')).href+'?settings=1');await fp.locator('#vct-settings-root:not([hidden])').waitFor();await fp.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_SHOW_COUNTER:true}));assert.equal(await fp.locator('.fx-christmas-tree-counter').textContent(),'125 / 500');await fp.reload();await fp.evaluate(()=>window.VCTStage.effectsReady);assert.equal(await fp.locator('.fx-christmas-tree-counter').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('PASS: カウント初期OFF・実加算・プレビュー・文字サイズ・取消・保存復元・完成後超過・素材なし・幅への縮小・停止・file保存');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
