const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const folder=path.basename(path.resolve(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:960,height:540}});
 await context.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await context.addInitScript(folder=>{
  const sdk={setup(){},ready:()=>Promise.resolve(),connect(){},subscribe(){return 1;},unsubscribe(){}};
  Object.defineProperty(window,'OneSDK',{get:()=>sdk,set(){}});
  const key='vct.stage-fx.settings.'+JSON.stringify([folder,'default'])+'.christmas-tree.v1';
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,count:125,seen:[]}));
 },folder);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?settings=1');
 const ready=async()=>{await page.locator('#vct-settings-root:not([hidden])').waitFor();await page.evaluate(()=>window.VCTStage.effectsReady);};await ready();
 const save=()=>page.evaluate(()=>window.VCT_CONFIG_RUNTIME.commitLocal({FONT_SIZE:37,CHRISTMAS_TREE_GOAL:777}));await save();
 const dialog=page.getByRole('alertdialog'),remove=page.getByRole('button',{name:'ローカル設定を削除',exact:true});
 await remove.click();assert.equal(await dialog.count(),1);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'削除を取消');
 assert.equal(await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.effective.FONT_SIZE),37);
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'ローカル設定を削除する');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'削除を取消');
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await page.locator('#vct-settings-root').isVisible(),true);
 await remove.click();await page.getByRole('button',{name:'削除を取消',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(window.VCT_CONFIG_RUNTIME.storageKey)).FONT_SIZE),37);
 await remove.click();
 await page.evaluate(()=>{window.originalRemoveItem=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(key===window.VCT_CONFIG_RUNTIME.storageKey)throw new Error('test storage failure');return window.originalRemoveItem.call(this,key);};});
 await page.getByRole('button',{name:'ローカル設定を削除する',exact:true}).click();
 assert.equal(await dialog.count(),1);assert.ok((await dialog.getByRole('status').textContent()).includes('完了できませんでした'));
 await page.evaluate(()=>{Storage.prototype.removeItem=window.originalRemoveItem;});
 await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'ローカル設定を削除する',exact:true}).click()]);await ready();
 assert.equal(await page.evaluate(()=>localStorage.getItem(window.VCT_CONFIG_RUNTIME.storageKey)),null);
 assert.equal(await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.effective.FONT_SIZE),24);
 if(folder.includes('Christmas')){
  const tree=page.locator('.fx-christmas-tree-root');assert.equal(await tree.getAttribute('data-count'),'125');await save();
  await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());
  await page.getByRole('tab',{name:'演出配置',exact:true}).click();await page.getByLabel('配置する演出',{exact:true}).selectOption('christmas_tree');
  const reset=page.getByRole('button',{name:'ツリーの成長をリセット',exact:true});await reset.click();
  let box=await dialog.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=540);
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'リセットを取消');
  assert.equal(await page.locator('.vct-settings-panel').evaluate(el=>el.inert),true);
  const footer=await remove.boundingBox();await page.mouse.click(footer.x+footer.width/2,footer.y+footer.height/2);
  assert.equal(await dialog.count(),1);assert.equal(await tree.getAttribute('data-count'),'125');
  assert.equal(await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.effective.FONT_SIZE),37);
  await page.getByRole('button',{name:'リセットを取消',exact:true}).click();assert.equal(await tree.getAttribute('data-count'),'125');
  await reset.click();await page.evaluate(()=>{window.resetCallCount=0;const reset=window.VCT_STAGE_PREVIEW.treeReset;window.VCT_STAGE_PREVIEW.treeReset=()=>{window.resetCallCount++;reset();};});
  const execute=await page.getByRole('button',{name:'ツリーをリセットする',exact:true}).boundingBox();
  await page.mouse.dblclick(execute.x+execute.width/2,execute.y+execute.height/2);
  await page.waitForFunction(()=>document.querySelector('.fx-christmas-tree-root').dataset.count==='0');
  assert.equal(await page.evaluate(()=>window.resetCallCount),1);assert.equal(await page.evaluate(()=>window.VCT_CONFIG_RUNTIME.effective.FONT_SIZE),37);
  await reset.click();await page.evaluate(()=>window.VCT_SETTINGS_PANEL.close());assert.equal(await dialog.count(),0);
  await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());assert.equal(await page.locator('.vct-settings-panel').evaluate(el=>el.inert),false);
  await page.getByRole('tab',{name:'演出配置',exact:true}).click();await reset.click();
  await page.screenshot({path:path.resolve(__dirname,'settings-confirmation.png')});await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: '+folder+' 確認前は非削除・取消/Escape・初期フォーカス・Tab制限・失敗時保持・確認後削除/再読込'+(folder.includes('Christmas')?'・ツリー独立・画面内表示・背後操作禁止・二重実行防止':''));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
