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
 const init=()=>{const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});};
 const setup=async state=>{const ctx=await browser.newContext({viewport:{width:1920,height:1080},...(state?{storageState:state}:{})});await ctx.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('file:')?r.continue():r.abort());await ctx.addInitScript(init);return ctx;};
 try{
 const context=await setup(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1';
 const open=async(page,url)=>{await page.goto(url);await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.getByRole('tab',{name:'演出配置',exact:true}).click();};
 await open(page,url);const target=page.getByLabel('配置する演出',{exact:true});
 await target.selectOption('christmas_tree');const goal=page.locator('[data-range-key="CHRISTMAS_TREE_GOAL"]');await goal.fill('777');await goal.press('Enter');
 await page.getByRole('button',{name:'保存して再読み込み',exact:true}).click();await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.getByRole('tab',{name:'演出配置',exact:true}).click();
 assert.equal(await target.inputValue(),'christmas_tree');assert.equal(await goal.inputValue(),'777');
 assert.equal(await page.locator('.stage-effect[data-effect-id="christmas_tree"]').count(),1);
 // 編集対象の変更だけでは単発の選択やツリーON/OFFを変更しない。
 await target.selectOption('heart_effect');await open(page,url);assert.equal(await target.inputValue(),'heart_effect');assert.equal(await page.evaluate(()=>window.CONFIG.STAGE_EFFECT_ID),'sample_effect');assert.equal(await page.evaluate(()=>window.CONFIG.STAGE_PLUGIN_christmas_tree_ENABLED),true);
 const saved=await context.storageState();const restarted=await setup(saved);const another=await restarted.newPage();another.on('pageerror',e=>errors.push(e.message));await open(another,url);assert.equal(await another.getByLabel('配置する演出',{exact:true}).inputValue(),'heart_effect');await restarted.close();
 // HTTPプロファイルを分け、未登録の記録は有効な対象へ戻す。
 await open(page,url+'&profile=other');assert.equal(await target.inputValue(),'christmas_tree');
 await target.selectOption('stars_effect');await open(page,url);assert.equal(await target.inputValue(),'heart_effect');
 await page.evaluate(()=>localStorage.setItem(window.VCT_CONFIG_RUNTIME.storageKey+'.placement-target','missing_plugin'));await open(page,url);assert.equal(await target.inputValue(),'christmas_tree');
 // fileでも同じ保存処理を使用する。
 await open(page,pathToFileURL(path.join(root,'index.html')).href+'?settings=1');await target.selectOption('stars_effect');await page.getByRole('button',{name:'変更を保存',exact:true}).click();await open(page,pathToFileURL(path.join(root,'index.html')).href+'?settings=1');assert.equal(await target.inputValue(),'stars_effect');
 assert.deepEqual(errors,[]);console.log('PASS: 配置対象の保存再読込・保存領域復元・単発設定との独立・プロファイル分離・不明ID復帰・file保存');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
