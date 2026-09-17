// 開発環境のPlaywrightを使用。実わんコメへの接続・実運用設定の変更は行わない。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const parent = path.dirname(root);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.endsWith('/onesdk.js')) { res.end(''); return; }
  const file = path.resolve(parent, '.' + pathname);
  if (!file.startsWith(parent + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' })[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await context.route('**/*', route => route.request().url().startsWith(origin) || route.request().url().startsWith('file:') ? route.continue() : route.abort());
    await context.addInitScript(() => {
      const subscriptions = [];
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe(value) { subscriptions.push(value); } };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      window.emit = (action, data) => subscriptions.filter(item => item.action === action).forEach(item => item.callback(data));
    });

    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const urls = [
      `${origin}/view_comment_Underbar_V2.1/index.html?settings=1`,
      `${pathToFileURL(path.join(root, 'index.html')).href}?settings=1`
    ];

    for (const url of urls) {
      await page.goto(url);
      await page.locator('#vct-settings-root:not([hidden])').waitFor();
      await page.locator('.vct-settings-close').click();
      await page.evaluate(() => {
        const data = [
          { id: 'normal', name: '通常', comment: 'こんにちは' },
          { id: 'jewel', name: 'ギフト', giftType: 'jewel', jewels: 100, giftLabel: 'テストギフト', hasGift: true, comment: '新ギフト' },
          { id: 'paid', name: '支援', giftType: 'superchat', hasGift: true, price: 500, paidText: '￥500', comment: '応援' },
          { id: 'sticky', name: '固定', isSticky: true, comment: 'お知らせ' },
          { id: 'member', name: '会員', membership: { primary: 'メンバー加入' }, comment: '' }
        ];
        data.forEach(item => window.emit('comments', { service: 'youtube', data: item }));
        window.emit('comments', { service: 'youtube', data: data[0] });
      });
      await page.waitForFunction(() => document.querySelectorAll('.cmt').length === 5);
      assert.equal(await page.locator('#app.underbar-ticker.underbar-rtl').count(), 1);
      assert.equal(await page.locator('.cmt-system').count(), 1);
      assert.ok(await page.locator('.cmt-gift').count() >= 2);
      assert.match(await page.locator('.cmt').allTextContents().then(values => values.join(' ')), /テストギフト/);
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(__dirname, 'preview.png') });

      await page.locator('#vct-settings-launcher').click({ force: true });
      await page.locator('[data-config-key="UNDERBAR_LAYOUT_MODE"]').selectOption('stack');
      await page.waitForFunction(() => document.querySelector('#app')?.classList.contains('underbar-stack'));
      await page.locator('[data-config-key="UNDERBAR_DIRECTION"]').selectOption('ltr');
      await page.waitForFunction(() => document.querySelector('#app')?.classList.contains('underbar-ltr'));
      await page.locator('.vct-settings-close').click();
      await page.waitForFunction(() => document.querySelector('#app')?.classList.contains('underbar-ticker'));

      await page.locator('#vct-settings-launcher').click({ force: true });
      await page.locator('[data-config-key="UNDERBAR_LAYOUT_MODE"]').selectOption('stack');
      await page.getByRole('button', { name: '保存して再読み込み', exact: true }).click();
      await page.waitForFunction(() => window.CONFIG?.UNDERBAR_LAYOUT_MODE === 'stack');
      await page.locator('#vct-settings-root:not([hidden])').waitFor();
      await page.getByRole('button', { name: 'ローカル設定を削除', exact: true }).click();
      await page.waitForFunction(() => window.CONFIG?.UNDERBAR_LAYOUT_MODE === 'ticker');
      await page.evaluate(() => window.emit('clear'));
      assert.equal(await page.locator('.cmt').count(), 0);
    }

    await page.evaluate(() => {
      window.emit('comments', { service: 'youtube', data: { id: 'translation', name: '翻訳', comment: '原文', translated: '翻訳文' } });
      window.emit('comments', { service: 'youtube', data: { id: 'gift-count', name: '贈呈', giftType: 'sponsorgift', giftCount: 5, comment: '' } });
    });
    await page.locator('[data-config-key="COMMENT_TRANSLATION_MODE"]').selectOption('both');
    const text = await page.locator('.cmt').allTextContents().then(values => values.join(' '));
    assert.match(text, /翻訳文/);
    assert.match(text, /メンギフ 5件/);
    assert.deepEqual(errors, []);
    console.log('PASS: HTTP/file起動、SDK V2ギフト分類、ticker/stack、設定プレビュー・保存・削除、翻訳、重複、クリア');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
