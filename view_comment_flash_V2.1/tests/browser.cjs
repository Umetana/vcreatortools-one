// 開発環境のPlaywrightを使用。実わんコメへの接続・実運用設定の変更は行わない。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..'), parent = path.dirname(root);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.endsWith('/onesdk.js')) { res.end(''); return; }
  const file = path.resolve(parent, '.' + pathname);
  if (!file.startsWith(parent + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' })[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await context.route('**/*', r => r.request().url().startsWith(origin) || r.request().url().startsWith('file:') ? r.continue() : r.abort());
    await context.addInitScript(() => {
      const subscriptions = [];
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe(x) { subscriptions.push(x); } };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      window.emit = (action, data) => subscriptions.filter(s => s.action === action).forEach(s => s.callback(data));
    });
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));

    for (const url of [origin + '/view_comment_flash_V2.1/index.html?settings=1', pathToFileURL(path.join(root, 'index.html')).href + '?settings=1']) {
      await page.goto(url);
      await page.locator('#vct-settings-root:not([hidden])').waitFor();
      await page.locator('.vct-settings-close').click();
      await page.evaluate(() => {
        const data = [
          {id:'normal',name:'通常',comment:'こんにちは'},
          {id:'jewel',name:'ギフト',giftType:'jewel',jewels:100,giftLabel:"テストギフト",hasGift:true,comment:'新ギフト'},
          {id:'paid',name:'支援',giftType:'superchat',hasGift:true,price:500,paidText:'￥500',comment:'応援'},
          {id:'sticky',name:'固定',isSticky:true,comment:'お知らせ'},
          {id:'member',name:'会員',membership:{primary:'メンバー加入'},comment:''}
        ];
        data.forEach(data => window.emit('comments',{service:'youtube',data}));
        window.emit('comments',{service:'youtube',data:data[0]});
      });
      await page.waitForFunction(() => document.querySelectorAll('.cmt').length === 5);
      assert.equal(await page.locator('.cmt-system').count(),1);
      assert.ok(await page.locator('.cmt-gift').count() >= 2);
      assert.match(await page.locator('.cmt').allTextContents().then(x=>x.join(' ')),/テストギフト/);
      await page.waitForTimeout(700);
      await page.screenshot({path:path.join(__dirname,'preview.png')});
      await page.locator('#vct-settings-launcher').click({force:true});
      for (const effect of ['none','glow','shimmer','glint','sweep','aurora','trace']) {
        await page.locator('[data-config-key="GIFT_EFFECT"]').selectOption(effect);
        const count=await page.locator('.effect-glow').count();
        assert.equal(count, effect==='none'?0:3);
        if(effect==='trace') assert.equal(await page.locator('.cmt__trace-container').count(),3);
      }
      await page.locator('[data-config-key="FONT_SIZE"]').fill('32');
      await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--font-size')==='32px');
      await page.locator('.vct-settings-close').click();
      await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--font-size')==='24px');
      assert.equal(await page.locator('.effect-shimmer').count(),3);
      await page.locator('#vct-settings-launcher').click({force:true});
      await page.locator('[data-config-key="GIFT_EFFECT"]').selectOption('glint');
      await page.getByRole('button',{name:'保存して再読み込み',exact:true}).click();
      await page.waitForFunction(()=>window.CONFIG?.GIFT_EFFECT==='glint');
      await page.locator('#vct-settings-root:not([hidden])').waitFor();
      await page.getByRole('button',{name:'ローカル設定を削除',exact:true}).click();
      await page.waitForFunction(()=>window.CONFIG?.GIFT_EFFECT==='shimmer');
      await page.evaluate(()=>window.emit('clear'));
      assert.equal(await page.locator('.cmt').count(),0);
    }
    await page.evaluate(() => {
      window.emit('comments',{service:'youtube',data:{id:'translation',name:'翻訳',comment:'原文',translated:'翻訳文'}});
      window.emit('comments',{service:'youtube',data:{id:'gift-count',name:'贈呈',giftType:'sponsorgift',giftCount:5,comment:''}});
    });
    await page.locator('[data-config-key="COMMENT_TRANSLATION_MODE"]').selectOption('both');
    assert.match(await page.locator('.cmt').allTextContents().then(x=>x.join(' ')),/翻訳文/);
    assert.match(await page.locator('.cmt').allTextContents().then(x=>x.join(' ')),/メンギフ/);
    await page.locator('[data-config-key="GIFT_EFFECT"]').selectOption('random');
    await page.evaluate(() => {
      window.emit('clear');
      const original = Math.random;
      try {
        for (const [i, value] of [0, 0.999].entries()) {
          Math.random = () => value;
          window.emit('comments',{service:'youtube',data:{id:'random-'+i,name:'抽選',giftType:'jewel',comment:'ギフト'}});
        }
      } finally { Math.random = original; }
    });
    await page.waitForFunction(()=>document.querySelectorAll('.cmt').length===2);
    assert.equal(await page.locator('.effect-glow').count(),2);
    assert.equal(await page.locator('.cmt__trace-container').count(),1);
    const before = await page.locator('.cmt').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));
    await page.locator('[data-config-key="GIFT_EFFECT"]').selectOption('shimmer');
    assert.equal(await page.locator('.effect-shimmer').count(),2);
    await page.locator('[data-config-key="GIFT_EFFECT"]').selectOption('random');
    assert.deepEqual(await page.locator('.cmt').evaluateAll(nodes=>nodes.map(n=>n.outerHTML)),before);
    assert.deepEqual(errors,[]);
    console.log('PASS: HTTP/file起動、SDK V2ギフト分類、重複、7演出、プレビュー取消、保存・削除、クリア');
  } finally {
    if(browser) await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
