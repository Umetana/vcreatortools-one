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
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await context.addInitScript(()=>{const subscriptions=new Map();let next=0;const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(v){subscriptions.set(++next,v);return next;},unsubscribe(id){subscriptions.delete(id);}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});window.emitTreeComment=raw=>subscriptions.forEach(s=>{if(s.action==='comments')s.callback(raw);});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async()=>{await page.goto(origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1');await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);};
 await open();
 const tree=page.locator('.stage-effect[data-effect-id="christmas_tree"]'),gifts=tree.locator('.fx-christmas-tree-gift'),stage=tree.locator('.fx-christmas-tree-ornament');
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const emit=async(id,gift=false)=>{await page.evaluate(({id,gift})=>window.emitTreeComment({service:'youtube',data:{id,comment:gift?'':'参加',...(gift?{giftType:'superchat',price:10000,currency:'JPY'}:{})}}),{id,gift});await frame();};
 const record=()=>gifts.evaluateAll(els=>els.map(el=>({id:el.dataset.giftId,slot:el.dataset.slot,kind:el.dataset.kind,left:el.style.left,top:el.style.top})));
 const stageRecord=()=>stage.evaluateAll(els=>els.map(el=>({kind:el.dataset.kind,left:el.style.left,top:el.style.top})));
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(window.VCT_CONFIG_RUNTIME.storageKey+'.christmas-tree.v1')));
 await page.evaluate(()=>{window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_GOAL:10,CHRISTMAS_TREE_SUPPORT_BASE:0,CHRISTMAS_TREE_GIFT_LIMIT:3});window.VCT_SETTINGS_PANEL.refreshSaved();});
 for(let i=0;i<10;i++)await emit('normal-'+i);
 assert.equal(await tree.getAttribute('data-stage'),'10');assert.equal(await stage.count(),30);
 const kinds=await stage.evaluateAll(els=>els.map(el=>el.dataset.kind));for(const kind of ['red','gold','ribbon'])assert.equal(kinds.filter(x=>x===kind).length,10);
 const stagesBefore=await stageRecord();
 for(let i=1;i<=5;i++)await emit('gift-'+i,true);
 assert.equal(await tree.getAttribute('data-count'),'10');assert.deepEqual((await record()).map(g=>g.id),['3','4','5']);assert.deepEqual(await stageRecord(),stagesBefore);
 const before=await record();await page.waitForTimeout(300);await open();assert.deepEqual(await record(),before);assert.deepEqual(await stageRecord(),stagesBefore);
 await emit('gift-5',true);assert.deepEqual(await record(),before);
 const selectTree=async()=>{await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('christmas_tree');};
 await selectTree();const cap=page.locator('[data-range-key="CHRISTMAS_TREE_GIFT_LIMIT"]');
 await cap.fill('1');await cap.press('Enter');assert.equal(await gifts.count(),1);assert.equal((await stored()).gifts.length,3);
 await page.locator('.vct-settings-close').click();assert.equal(await gifts.count(),3);
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());await selectTree();await cap.fill('1');await cap.press('Enter');await page.getByRole('button',{name:'変更を保存',exact:true}).click();await frame();assert.deepEqual((await record()).map(g=>g.id),['5']);
 await emit('gift-6',true);assert.deepEqual((await record()).map(g=>g.id),['6']);assert.equal(await gifts.first().evaluate(el=>el.style.width),'8%');
 // プレビューはポイントも保存済み飾りも変更しない。
 await page.waitForTimeout(300);const saved=await stored();
 await page.getByRole('button',{name:'ギフト飾りを試す（保存しない）',exact:true}).click();assert.equal(await tree.getAttribute('data-preview'),'true');assert.notDeepEqual((await record()).map(g=>g.id),saved.gifts.map(g=>String(g.id)));assert.deepEqual(await stored(),saved);
 await page.getByRole('button',{name:'実際の成長に戻す',exact:true}).click();assert.deepEqual((await record()).map(g=>g.id),['6']);
 await page.getByRole('tab',{name:'ステージ',exact:true}).click();await page.locator('[data-config-key="CHRISTMAS_ASSET_MODE"]').selectOption('plain');assert.equal(await tree.locator('img').count(),0);assert.equal(await gifts.count(),1);assert.equal(await gifts.first().getAttribute('data-kind'),saved.gifts[0].kind);
 await page.locator('.vct-settings-close').click();await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());
 // 高密度でも最低サイズと120個の上限を守る。
 await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_GIFT_LIMIT:120}));
 await page.evaluate(()=>window.emitTreeComment(Array.from({length:130},(_,i)=>({service:'youtube',data:{id:'many-'+i,giftType:'superchat',price:10000,currency:'JPY',comment:''}}))));await frame();assert.equal(await gifts.count(),120);
 assert.equal(await gifts.first().evaluate(el=>el.style.width),'5%');assert.equal(new Set((await record()).map(g=>g.slot)).size,120);assert.equal(new Set((await record()).map(g=>g.kind)).size,2);
 await page.waitForFunction(()=>[...document.querySelectorAll('.fx-christmas-tree-root img')].every(im=>im.complete&&im.naturalWidth>0));
 const screen=async name=>{await page.evaluate(()=>{document.getElementById('vct-settings-root').style.visibility='hidden';document.body.style.background='#152924';document.querySelector('[data-layer="widgets"]').style.visibility='hidden';document.querySelector('[data-layer="effects"]').style.visibility='hidden';});await page.waitForTimeout(1800);await page.screenshot({path:path.join(root,'tests/'+name+'.png')});await page.evaluate(()=>{document.getElementById('vct-settings-root').style.visibility='';document.querySelector('[data-layer="widgets"]').style.visibility='';document.querySelector('[data-layer="effects"]').style.visibility='';});};
 await screen('christmas-gifts-120');
 await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_GIFT_LIMIT:30}));await frame();assert.equal(await gifts.count(),30);assert.deepEqual(await stageRecord(),stagesBefore);await screen('christmas-gifts-30');
 await page.getByRole('button',{name:'画面演出を全停止',exact:true}).click();await emit('paused-gift',true);assert.equal(await gifts.count(),30);assert.equal(await gifts.last().evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length),0);
 await page.getByRole('button',{name:'常設の動きを再開',exact:true}).click();
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.refreshSaved());await selectTree();await page.getByRole('button',{name:'ツリーの成長をリセット',exact:true}).click();await page.getByRole('button',{name:'リセットを実行',exact:true}).click();assert.equal(await gifts.count(),0);assert.equal(await tree.getAttribute('data-count'),'0');
 assert.deepEqual(errors,[]);console.log('PASS: 段階3種の保持・ギフト別レイヤー・ボーナス0時の飾り・FIFO・種類位置の復元・上限下書き取消・保存時整理・非保存プレビュー・素材なし・最低サイズ・120個・停止・リセット');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
