// 実サービスへ接続しない模擬環境で、枠とコメント領域の一致を確認する。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const errors = [];
    const setup = async overrides => {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      await context.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
      await context.addInitScript(overrides => {
        const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe() { return 1; }, unsubscribe() {} };
        Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
        if (overrides) localStorage.setItem('vct.stage-fx.settings.' + JSON.stringify(['VCT_Christmas_StageFX_V3', 'default']), JSON.stringify(overrides));
      }, overrides);
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      const images = []; page.on('request', r => { if (/\/assets\/.*\.png/.test(r.url())) images.push(r.url()); });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?settings=1');
      await page.locator('#vct-settings-root:not([hidden])').waitFor(); await page.evaluate(() => window.VCTStage.effectsReady);
      return { page, context, images };
    };
    const { page, images } = await setup();
    const frame = page.locator('.fx-christmas-comment-frame');
    const backplate = page.locator('.fx-christmas-comment-frame-backplate');
    const fillColor = () => backplate.locator('.fx-christmas-comment-frame-fill').evaluate(el => getComputedStyle(el).backgroundColor);
    const region = page.locator('[data-region-id="comments"]');
    const commit = v => page.evaluate(v => window.VCT_CONFIG_RUNTIME.commitLocal(v), v);
    const aligned = async () => {
      // resizeが別々の測定の間へ割り込まないよう、同じフレームで比較する。
      const [a, b, c] = await page.evaluate(() => [
        '.fx-christmas-comment-frame', '[data-region-id="comments"]', '.fx-christmas-comment-frame-backplate'
      ].map(selector => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height };
      }));
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(a[key] - b[key]) < .02, key);
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(c[key] - b[key]) < .02, `背景 ${key}`);
    };
    const screen = async name => {
      await page.evaluate(() => document.getElementById('vct-settings-root').style.visibility = 'hidden');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(__dirname, `christmas-comment-frame-${name}.png`) });
      await page.evaluate(() => document.getElementById('vct-settings-root').style.visibility = '');
    };
    assert.equal(await frame.isVisible(), false); assert.equal(images.filter(x => x.includes('comment-frame')).length, 0);
    await page.getByRole('tab', { name: 'コメント配置', exact: true }).click();
    const toggle = page.locator('[data-config-key="CHRISTMAS_COMMENT_FRAME"]');
    await toggle.check(); assert.equal(await frame.isVisible(), true); await aligned();
    assert.equal(await fillColor(), 'rgba(16, 32, 43, 0)');
    await page.locator('[data-config-key="CHRISTMAS_COMMENT_FRAME_BG_COLOR"]').fill('#204060');
    await page.locator('[data-config-key="CHRISTMAS_COMMENT_FRAME_BG_OPACITY"]').fill('0.5');
    assert.equal(await fillColor(), 'rgba(32, 64, 96, 0.5)');
    assert.equal(await backplate.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('[data-region-id="comments"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
    await frame.locator('img').evaluateAll(ims => Promise.all(ims.map(im => im.decode())));
    assert.equal(await frame.locator('img').count(), 4);
    assert.equal(await frame.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await frame.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.getByRole('button', { name: 'マウスで配置調整', exact: true }).click();
    const editor = page.locator('.vct-placement-editor'), rect = await editor.boundingBox();
    await page.mouse.move(rect.x + 60, rect.y + 60); await page.mouse.down();
    await page.mouse.move(rect.x + 140, rect.y + 100); await page.mouse.up(); await aligned();
    await page.mouse.wheel(0, -100); await aligned();
    await page.locator('.vct-settings-close').click(); assert.equal(await frame.isVisible(), false); assert.equal(await backplate.isVisible(), false);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_COMMENT_FRAME_BG_OPACITY), 0);
    await commit({ CHRISTMAS_COMMENT_FRAME: true, CHRISTMAS_COMMENT_FRAME_BG_COLOR: '#10202b', CHRISTMAS_COMMENT_FRAME_BG_OPACITY: .7, CHRISTMAS_BACKGROUND: 'forest', COMMENT_X: 80, COMMENT_Y: 80, COMMENT_WIDTH: 640, COMMENT_HEIGHT: 900, COMMENT_SCALE: 1 });
    await page.evaluate(() => { for (let i = 0; i < 5; i++) window.VCT_STAGE_PREVIEW.comment(); });
    const commentsBefore = await region.locator('.cmt').count();
    await aligned(); await frame.locator('img').evaluateAll(ims => Promise.all(ims.map(im => im.decode()))); await screen('tall');
    await commit({ CHRISTMAS_COMMENT_FRAME_BG_COLOR: '#173d28', CHRISTMAS_COMMENT_FRAME_BG_OPACITY: 1 });
    assert.equal(await fillColor(), 'rgb(23, 61, 40)'); await screen('opaque');
    assert.equal(await region.locator('.cmt').count(), commentsBefore);
    const cornerBefore = await frame.locator('img').first().boundingBox();
    await commit({ COMMENT_X: 300, COMMENT_Y: 120, COMMENT_WIDTH: 420, COMMENT_HEIGHT: 700, COMMENT_SCALE: 1.3 }); await aligned();
    assert.equal(await region.locator('.cmt').count(), commentsBefore);
    const cornerAfter = await frame.locator('img').first().boundingBox();
    assert.ok(Math.abs(cornerAfter.width - cornerAfter.height) < .01); assert.ok(cornerBefore.width > 0);
    await page.setViewportSize({ width: 960, height: 540 }); await aligned();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await commit({ COMMENT_X: 80, COMMENT_Y: 480, COMMENT_WIDTH: 1760, COMMENT_HEIGHT: 460, COMMENT_SCALE: 1 }); await aligned(); await screen('wide');
    await commit({ DISPLAY_MODE: 'underbar' }); await aligned(); assert.equal((await frame.boundingBox()).width, 1920);
    await commit({ DISPLAY_MODE: 'popup', POPUP_PLACEMENT: 'random' }); await aligned();
    await commit({ POPUP_PLACEMENT: 'anchor' }); await aligned(); assert.equal((await frame.boundingBox()).width, 1760);
    await commit({ DISPLAY_MODE: 'stack', COMMENT_X: 80, COMMENT_Y: 80, COMMENT_WIDTH: 640, COMMENT_HEIGHT: 900, CHRISTMAS_ASSET_MODE: 'plain' });
    assert.equal(await frame.locator('img').count(), 0); assert.equal(await frame.getAttribute('data-mode'), 'plain'); await screen('plain');
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.stopAll()); assert.equal(await frame.isVisible(), true);
    await page.reload(); await page.evaluate(() => window.VCTStage.effectsReady); await aligned(); assert.equal(await frame.isVisible(), true);
    assert.equal(await frame.getAttribute('data-mode'), 'plain');
    assert.equal(await fillColor(), 'rgb(23, 61, 40)');
    await commit({ CHRISTMAS_ASSET_MODE: 'generated' }); await frame.locator('img').evaluateAll(ims => Promise.all(ims.map(im => im.decode())));
    await page.route('**/comment-frame-corner-v1.png', r => r.abort()); await page.reload();
    await page.waitForFunction(() => document.querySelector('.fx-christmas-comment-frame').dataset.mode === 'plain');
    await aligned(); assert.equal(await frame.locator('img').count(), 0);
    assert.equal(await fillColor(), 'rgb(23, 61, 40)');
    await commit({ CHRISTMAS_COMMENT_FRAME: false }); assert.equal(await frame.locator('*').count(), 0);
    const plain = await setup({ CHRISTMAS_ASSET_MODE: 'plain', CHRISTMAS_COMMENT_FRAME: true, STAGE_PLUGIN_christmas_tree_ENABLED: false });
    assert.equal(plain.images.length, 0); assert.equal(await plain.page.locator('.fx-christmas-comment-frame').getAttribute('data-mode'), 'plain');
    assert.deepEqual(errors, []);
    console.log('PASS: 枠初期OFF・UI取消・4隅・透明・位置/寸法/倍率/画面縮小への追従・縦横・全面モード・コメント保持・素材なし・停止・file保存復元・素材失敗・初期plain画像要求なし');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
