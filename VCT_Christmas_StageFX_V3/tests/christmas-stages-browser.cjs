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
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await context.addInitScript(()=>{const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async()=>{await page.goto(origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1');await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('christmas_tree');};
 await open();const mode=page.locator('[data-config-key="CHRISTMAS_TREE_STAGES"]'),goal=page.locator('[data-range-key="CHRISTMAS_TREE_GOAL"]'),tree=page.locator('.stage-effect[data-effect-id="christmas_tree"]');
 assert.equal(await mode.inputValue(),'10');await goal.fill('900');await goal.press('Enter');
 const step=page.getByRole('button',{name:'成長を試す（保存しない）',exact:true});
 for(const stages of [10,20,30]){
  await page.getByRole('button',{name:'実際の成長に戻す',exact:true}).click();await mode.selectOption(String(stages));
  let old=0;
  for(let i=1;i<=stages;i++){await step.click();const count=await tree.locator('.fx-christmas-tree-ornament').count();assert.equal(count-old,stages===10?3:stages===30?1:(i%2?1:2));old=count;}
  assert.equal(await tree.locator('.fx-christmas-tree-star').count(),1);assert.equal(await tree.getAttribute('data-count'),'900');
  await step.click();assert.equal(await tree.getAttribute('data-count'),'990');assert.equal(await tree.getAttribute('data-last-pulse'),'strong');
 }
 await page.getByRole('button',{name:'変更を保存',exact:true}).click();await open();assert.equal(await mode.inputValue(),'30');assert.equal(await tree.getAttribute('data-count'),'0');
 await mode.selectOption('20');await page.locator('.vct-settings-close').click();await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());await page.getByRole('tab',{name:'演出配置',exact:true}).click();assert.equal(await mode.inputValue(),'30');
 assert.deepEqual(errors,[]);console.log('PASS: 成長10/20/30の個数配分・完成30個と星・完成後10％発光・プレビュー非保存・設定保存復元・取消');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
