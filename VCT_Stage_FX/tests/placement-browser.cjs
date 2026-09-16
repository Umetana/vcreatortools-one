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

 const editor=page.locator('.vct-placement-editor');
 const number=key=>page.locator('[data-range-key="'+key+'"]');
 const edit=page.getByRole('button',{name:'マウスで配置調整',exact:true});
 assert.ok(!await editor.isVisible());
 await edit.click();assert.ok(await editor.isVisible());
 let rect=await editor.boundingBox();
 await page.mouse.move(rect.x+60,rect.y+60);await page.mouse.down();await page.mouse.move(rect.x+160,rect.y+110);await page.mouse.up();
 assert.equal(await number('COMMENT_X').inputValue(),'180');assert.equal(await number('COMMENT_Y').inputValue(),'150');
 await page.mouse.wheel(0,-100);assert.equal(await number('COMMENT_SCALE').inputValue(),'1.05');
 await page.locator('.vct-settings-collapse-toggle').click();assert.ok(await editor.isVisible());
 await page.setViewportSize({width:960,height:540});await page.waitForTimeout(100);
 rect=await editor.boundingBox();await page.mouse.move(rect.x+30,rect.y+30);await page.mouse.down();await page.mouse.move(rect.x+80,rect.y+55);await page.mouse.up();
 await page.locator('.vct-settings-collapse-toggle').click();
 assert.equal(await number('COMMENT_X').inputValue(),'280');assert.equal(await number('COMMENT_Y').inputValue(),'200');
 await page.locator('.vct-settings-close').click();assert.ok(!await editor.isVisible());
 await page.evaluate(()=>window.VCT_SETTINGS_PANEL.open());
 assert.equal(await number('COMMENT_X').inputValue(),'80');assert.equal(await number('COMMENT_SCALE').inputValue(),'1');
 await edit.click();await page.getByRole('tab',{name:'コメント表示',exact:true}).click();assert.ok(!await editor.isVisible());
 await page.locator('[data-config-key="DISPLAY_MODE"]').selectOption('underbar');
 await page.getByRole('tab',{name:'コメント配置',exact:true}).click();assert.ok(await edit.isDisabled());
 await page.getByRole('tab',{name:'コメント表示',exact:true}).click();await page.locator('[data-config-key="DISPLAY_MODE"]').selectOption('stack');
 await page.getByRole('tab',{name:'コメント配置',exact:true}).click();await edit.click();
 await page.locator('.vct-settings-collapse-toggle').click();
 rect=await editor.boundingBox();await page.mouse.move(rect.x+20,rect.y+20);await page.mouse.down();await page.mouse.move(rect.x+60,rect.y+40);await page.mouse.up();
 await page.locator('.vct-settings-collapse-toggle').click();
 const saved=await number('COMMENT_X').inputValue();
 await page.getByRole('button',{name:'保存して再読み込み',exact:true}).click();await page.locator('#vct-settings-root:not([hidden])').waitFor();
 assert.equal(await number('COMMENT_X').inputValue(),saved);assert.ok(!await editor.isVisible());
 assert.deepEqual(errors,[]);console.log('PASS: 配置編集の移動・倍率・縮小表示・折りたたみ・取消・タブ終了・全面無効化・保存');
 }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
