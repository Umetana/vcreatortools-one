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

async function main() {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('file:')?r.continue():r.abort());
 await context.addInitScript(()=>{const subscriptions=new Map();let next=0;const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(value){subscriptions.set(++next,value);return next;},unsubscribe(id){subscriptions.delete(id);}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});window.emitTreeComment=raw=>subscriptions.forEach(s=>{if(s.action==='comments')s.callback(raw);});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/VCT_Christmas_StageFX_V3/index.html?settings=1');
 await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);
 const tree=page.locator('.stage-effect[data-effect-id="christmas_tree"]');await tree.waitFor();assert.equal(await tree.getAttribute('data-stage'),'0');
 await page.waitForFunction(()=>[...document.querySelectorAll('.fx-christmas-tree-base')].every(im=>im.complete&&im.naturalWidth>0));
 await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('christmas_tree');
 const goal=page.locator('[data-range-key="CHRISTMAS_TREE_GOAL"]');await goal.fill('10');await goal.press('Enter');
 const step=page.getByRole('button',{name:'成長を試す（保存しない）',exact:true});
 await step.click();assert.equal(await tree.getAttribute('data-stage'),'1');assert.equal(await tree.locator('.fx-christmas-tree-ornament').count(),3);
 assert.equal(await page.evaluate(()=>localStorage.getItem(window.VCT_CONFIG_RUNTIME.storageKey+'.christmas-tree.v1')),null);
 await step.click();await step.click();await step.click();await step.click();assert.equal(await tree.getAttribute('data-stage'),'5');
 const screen=async name=>{await page.evaluate(()=>{document.getElementById('vct-settings-root').style.visibility='hidden';document.body.style.background='#152924';});await page.waitForTimeout(1800);await page.screenshot({path:path.join(root,'tests/'+name+'.png')});await page.evaluate(()=>document.getElementById('vct-settings-root').style.visibility='');};
 await screen('christmas-tree-stage-5');
 for(let i=0;i<5;i++)await step.click();assert.equal(await tree.getAttribute('data-stage'),'10');assert.equal(await tree.locator('.fx-christmas-tree-ornament').count(),30);assert.equal(await tree.locator('.fx-christmas-tree-star').count(),1);
 await step.click();assert.equal(await tree.getAttribute('data-stage'),'10');assert.equal(await tree.getAttribute('data-last-pulse'),'strong');
 await screen('christmas-tree-stage-10');
 await page.getByRole('button',{name:'画面演出を全停止',exact:true}).click();assert.equal(await tree.getAttribute('data-paused'),'true');assert.equal(await tree.locator('.fx-christmas-tree-star').count(),1);
 await step.click();assert.equal(await tree.locator('.fx-christmas-tree-scene').evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length),0);
 await page.getByRole('button',{name:'常設の動きを再開',exact:true}).click();assert.equal(await tree.getAttribute('data-paused'),'false');
 await page.getByRole('tab',{name:'ステージ',exact:true}).click();await page.locator('[data-config-key="CHRISTMAS_ASSET_MODE"]').selectOption('plain');
 assert.equal(await tree.locator('img').count(),0);assert.equal(await tree.getAttribute('data-stage'),'10');assert.equal(await tree.locator('.fx-christmas-tree-star').count(),1);
 await screen('christmas-tree-plain');
 await page.locator('.vct-settings-close').click();assert.equal(await tree.getAttribute('data-stage'),'0');assert.equal(await tree.getAttribute('data-preview'),'false');
 // 保存データの復元、配置変更・OFF/ONでの保持、確認つきリセット。
 await page.evaluate(()=>localStorage.setItem(window.VCT_CONFIG_RUNTIME.storageKey+'.christmas-tree.v1',JSON.stringify({version:1,count:500,seen:['old']})));
 await page.reload();await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);assert.equal(await tree.getAttribute('data-stage'),'10');
 await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('christmas_tree');
 const enabled=page.locator('[data-config-key="STAGE_PLUGIN_christmas_tree_ENABLED"]');await enabled.uncheck();assert.equal(await tree.count(),0);await enabled.check();await tree.waitFor();assert.equal(await tree.getAttribute('data-count'),'500');
 await page.getByRole('button',{name:'ツリーの成長をリセット',exact:true}).click();await page.getByRole('button',{name:'リセットを取消',exact:true}).click();assert.equal(await tree.getAttribute('data-count'),'500');
 await page.getByRole('button',{name:'ツリーの成長をリセット',exact:true}).click();await page.getByRole('button',{name:'ツリーをリセットする',exact:true}).click();assert.equal(await tree.getAttribute('data-count'),'0');
 await page.reload();await page.evaluate(()=>window.VCTStage.effectsReady);await tree.waitFor();assert.equal(await tree.getAttribute('data-count'),'0');

 // 実際の購読境界からSDK正規化を通す。外部の実コメントへは接続しない。
 const emit=async(id,extra={})=>{await page.evaluate(({id,extra})=>window.emitTreeComment({service:'youtube',data:{id,userId:'test-listener',name:'試験リスナー',comment:'配信参加',...extra}}),{id,extra});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
 const assertPoints=async value=>assert.equal(await tree.getAttribute('data-count'),String(value));
 await emit('live-normal');await assertPoints(1);await emit('live-normal');await assertPoints(1);
 await emit('live-small',{giftType:'superchat',hasGift:true,price:999,currency:'JPY'});await assertPoints(7);
 await emit('live-extra',{giftType:'superchat',hasGift:true,price:10000,currency:'JPY',comment:''});await assertPoints(32);
 await emit('live-gift',{giftType:'sponsorgift',giftCount:20,hasGift:true,comment:''});await assertPoints(57);
 await emit('live-receiver',{giftType:'giftreceived',hasGift:true,comment:'受取通知'});await assertPoints(57);
 await emit('live-fixed',{isSticky:true});await assertPoints(57);
 await emit(undefined);await assertPoints(57);
 await emit('live-join',{giftType:'subscribe',comment:''});await assertPoints(57);
 await emit('live-member',{giftType:'milestonechat',membership:{primary:'メンバー'},comment:'いつも楽しい'});await assertPoints(58);
 // 下書きのボーナス0と表示OFFは、保存済みの加算ルールを変えない。
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-preview',{detail:{...window.CONFIG,CHRISTMAS_TREE_SUPPORT_BASE:0,STAGE_PLUGIN_christmas_tree_ENABLED:false}})));
 await emit('live-draft',{giftType:'superchat',price:999,currency:'JPY'});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vct-settings-reset-preview')));await tree.waitFor();await assertPoints(64);
 await page.waitForTimeout(300);await page.reload();await page.evaluate(()=>window.VCTStage.effectsReady);await tree.waitFor();await assertPoints(64);
 await emit('live-extra',{giftType:'superchat',price:10000,currency:'JPY',comment:''});await assertPoints(64);
 // 保存済みボーナス0、動き抑制中の実加算、保存済みOFF中の非加算。
 await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_SUPPORT_BASE:0}));
 await emit('live-no-bonus',{giftType:'superchat',price:10000,currency:'JPY'});await assertPoints(65);
 await emit('live-no-bonus-empty',{giftType:'superchat',price:10000,currency:'JPY',comment:''});await assertPoints(65);
 await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({REDUCED_MOTION:true}));await emit('live-reduced');await assertPoints(66);assert.equal(await tree.getAttribute('data-paused'),'true');
 await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({STAGE_PLUGIN_christmas_tree_ENABLED:false}));await emit('live-disabled');
 await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({STAGE_PLUGIN_christmas_tree_ENABLED:true,REDUCED_MOTION:false}));await tree.waitFor();await assertPoints(66);
 // まとまった支援で複数段階を越えても、最終状態へ一度で更新する。
 await page.evaluate(()=>{window.VCT_STAGE_PREVIEW.treeReset();window.VCT_CONFIG_RUNTIME.commitLocal({CHRISTMAS_TREE_GOAL:10,CHRISTMAS_TREE_SUPPORT_BASE:5});});
 await emit('live-complete',{giftType:'superchat',price:10000,currency:'JPY',comment:''});await assertPoints(25);assert.equal(await tree.getAttribute('data-stage'),'10');assert.equal(await tree.getAttribute('data-last-pulse'),'strong');
 await emit('live-post-complete');await assertPoints(26);assert.equal(await tree.getAttribute('data-stage'),'10');
 await page.waitForTimeout(300);await page.reload();await page.evaluate(()=>window.VCTStage.effectsReady);await tree.waitFor();await assertPoints(26);
 assert.equal(await tree.locator('.fx-christmas-tree-star').count(),1);

 // OBSと同様のfile起動でも、模擬購読からポイントを加算・保存できる。
 const filePage=await context.newPage();filePage.on('pageerror',e=>errors.push(e.message));
 await filePage.goto(pathToFileURL(path.join(root,'index.html')).href+'?ui=0');await filePage.evaluate(()=>window.VCTStage.effectsReady);
 await filePage.locator('.stage-effect[data-effect-id="christmas_tree"]').waitFor();
 await filePage.evaluate(()=>window.emitTreeComment({service:'youtube',data:{id:'file-support',giftType:'superchat',comment:'応援',price:10000,currency:'JPY'}}));
 await filePage.waitForFunction(()=>document.querySelector('.stage-effect[data-effect-id="christmas_tree"]').dataset.count==='26');
 await filePage.reload();await filePage.evaluate(()=>window.VCTStage.effectsReady);await filePage.locator('.stage-effect[data-effect-id="christmas_tree"]').waitFor();
 assert.equal(await filePage.locator('.stage-effect[data-effect-id="christmas_tree"]').getAttribute('data-count'),'26');await filePage.close();
 // 初期状態から素材なしなら生成画像を要求しない。
 const plain=await browser.newContext({viewport:{width:1920,height:1080}});let imageRequests=0;
 await plain.route('**/*',r=>{const url=r.request().url();if(url.includes('/assets/')&&url.endsWith('.png'))imageRequests++;return url.startsWith(origin)?r.continue():r.abort();});
 await plain.addInitScript(()=>{localStorage.setItem('vct.stage-fx.settings.'+JSON.stringify(['VCT_Christmas_StageFX_V3','default']),JSON.stringify({CHRISTMAS_ASSET_MODE:'plain'}));const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});});
 const pp=await plain.newPage();pp.on('pageerror',e=>errors.push(e.message));await pp.goto(origin+'/VCT_Christmas_StageFX_V3/index.html?ui=0');await pp.evaluate(()=>window.VCTStage.effectsReady);await pp.locator('.fx-christmas-tree-scene').waitFor();assert.equal(imageRequests,0);assert.equal(await pp.locator('[data-effect-id="christmas_tree"] img').count(),0);
 await plain.close();assert.deepEqual(errors,[]);
 console.log('PASS: 生成ツリー・10段階・完成後発光・表示保持停止・素材なし切替・プレビュー非保存・保存復元・OFF/ON保持・確認つきリセット・通常/支援ポイント・重複除去・下書き分離・実加算の保存復元');
 } finally {await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
