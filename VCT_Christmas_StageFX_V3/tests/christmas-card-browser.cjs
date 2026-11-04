// 模擬SDKで継続する漂いと新着発光、静止表示、保存・表示方式との併用を確認する。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
    await context.addInitScript(() => {
      const subs = new Map(); let id = 0;
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe(s) { subs.set(++id, s); return id; }, unsubscribe(id) { subs.delete(id); } };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      window.emitCardTest = raw => subs.forEach(s => { if (s.action === 'comments') s.callback(raw); });
      window.clearCardTest = () => subs.forEach(s => { if (s.action === 'clear') s.callback(); });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?settings=1');
    await page.locator('#vct-settings-root:not([hidden])').waitFor(); await page.evaluate(() => window.VCTStage.effectsReady);
    const commit = v => page.evaluate(v => window.VCT_CONFIG_RUNTIME.commitLocal(v), v);
    const emit = async (id, extra = {}) => {
      await page.evaluate(({ id, extra }) => window.emitCardTest({ service: 'youtube', data: { id, name: '確認リスナー', comment: id + '：クリスマス配信に参加！', ...extra } }), { id, extra });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    };
    const card = text => page.locator('.cmt').filter({ hasText: text }).first();
    await emit('before'); assert.equal(await page.locator('.fx-christmas-card').count(), 0);
    await commit({ ENABLE_STAGE_EFFECTS: false, COMMENT_EFFECT: 'christmas', MAX_ITEMS: 12, CHRISTMAS_BACKGROUND: 'forest', CHRISTMAS_COMMENT_FRAME: true, CHRISTMAS_COMMENT_FRAME_BG_OPACITY: .65 });
    await emit('normal'); const normal = card('normal');
    assert.equal(await normal.locator('.fx-christmas-card-icon').count(), 1);
    assert.equal(await normal.locator('.fx-christmas-card-spark').count(), 3);
    assert.equal(await normal.locator('.fx-christmas-card-ring').count(), 0);
    assert.equal(await normal.locator('.fx-christmas-card-spark').first().evaluate(el => getComputedStyle(el).animationIterationCount), 'infinite');
    await emit('support', { giftType: 'superchat', hasGift: true, price: 1000, currency: 'JPY' });
    const support = card('support');
    assert.equal(await support.locator('.fx-christmas-card-icon').count(), 2);
    assert.equal(await support.locator('.fx-christmas-card-spark').count(), 6);
    assert.equal(await support.locator('.fx-christmas-card-ring').count(), 1);
    await support.locator('img').evaluateAll(ims => Promise.all(ims.map(im => im.decode())));
    assert.equal(await support.locator('.fx-christmas-card').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    // 本文用の特別な余白をなくし、同じ飾りがカード全体を移動する。
    assert.equal(await support.evaluate(el => getComputedStyle(el).paddingRight), '18px');
    const positions = await normal.locator('.fx-christmas-card-icon').evaluate(el => {
      const animation = el.getAnimations()[0]; animation.pause();
      const values = [0, 3500, 7000, 10500].map(t => {
        animation.currentTime = t;
        const r = el.getBoundingClientRect(), card = el.closest('.cmt').getBoundingClientRect();
        return { x: r.x, y: r.y, inside: r.left >= card.left && r.right <= card.right && r.top >= card.top && r.bottom <= card.bottom };
      }); animation.play(); return values;
    });
    assert.ok(positions.every(p => p.inside)); assert.ok(new Set(positions.map(p => p.x)).size > 2);
    assert.equal(await page.locator('.v3-heart-layer, .v3-stars-layer, .v3-flash-layer').count(), 0);
    await page.evaluate(() => {
      document.getElementById('vct-settings-root').style.visibility = 'hidden';
      document.querySelectorAll('.fx-christmas-card *').forEach(el => el.getAnimations().forEach(a => { a.pause(); a.currentTime = 300; }));
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(__dirname, 'christmas-card-generated.png') });
    await page.evaluate(() => {
      document.getElementById('vct-settings-root').style.visibility = '';
      document.querySelectorAll('.fx-christmas-card *').forEach(el => el.getAnimations().forEach(a => a.play()));
    });
    await page.waitForTimeout(1600);
    assert.equal(await support.locator('.fx-christmas-card-ring').evaluate(el => getComputedStyle(el).opacity), '0');
    assert.ok(Number(await normal.locator('.fx-christmas-card-spark').first().evaluate(el => getComputedStyle(el).opacity)) > 0);
    const icon = normal.locator('.fx-christmas-card-icon');
    const oldPosition = await icon.boundingBox(); await page.waitForTimeout(300);
    assert.notEqual((await icon.boundingBox()).x, oldPosition.x);
    const total = await page.locator('.cmt').count(); await emit('support', { giftType: 'superchat', price: 1000, currency: 'JPY' }); assert.equal(await page.locator('.cmt').count(), total);
    await emit('sticky', { isSticky: true }); assert.equal(await card('sticky').locator('.fx-christmas-card').count(), 0);
    await emit('receiver', { giftType: 'giftreceived', hasGift: true }); assert.equal(await card('receiver').locator('.fx-christmas-card').count(), 0);
    await commit({ CHRISTMAS_ASSET_MODE: 'plain' });
    assert.equal(await support.locator('.fx-christmas-card-icon').first().evaluate(el => getComputedStyle(el).animationIterationCount), 'infinite');
    await commit({ REDUCED_MOTION: true });
    assert.equal(await page.locator('.fx-christmas-card img').count(), 0);
    assert.equal(await page.locator('.fx-christmas-card-spark, .fx-christmas-card-ring').count(), 0);
    assert.equal(await support.locator('.fx-christmas-card-icons').textContent(), '🔔🎀');
    assert.equal(await support.locator('.fx-christmas-card-icon').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await support.locator('.fx-christmas-card-icon > span').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await emit('reduced'); assert.equal(await card('reduced').locator('.fx-christmas-card-spark').count(), 0);
    await page.evaluate(() => document.getElementById('vct-settings-root').style.visibility = 'hidden');
    await page.screenshot({ path: path.join(__dirname, 'christmas-card-plain.png') });
    await page.evaluate(() => document.getElementById('vct-settings-root').style.visibility = '');
    await commit({ REDUCED_MOTION: false, COMMENT_EFFECT: 'heart' }); assert.equal(await page.locator('.fx-christmas-card').count(), 0);
    await commit({ COMMENT_EFFECT: 'christmas' });
    assert.equal(await support.locator('.fx-christmas-card-ring').evaluate(el => getComputedStyle(el).opacity), '0');
    await commit({ DISPLAY_MODE: 'popup', POPUP_PLACEMENT: 'anchor' }); await emit('popup'); assert.equal(await card('popup').locator('.fx-christmas-card').count(), 1);
    await commit({ DISPLAY_MODE: 'underbar', UNDERBAR_MODE: 'stack' }); await emit('underbar'); assert.equal(await card('underbar').locator('.fx-christmas-card').count(), 1);
    await page.evaluate(() => { window.VCT_SETTINGS_PANEL.open(); });
    await page.getByRole('tab', { name: 'コメント装飾', exact: true }).click();
    await page.locator('[data-config-key="COMMENT_EFFECT"]').selectOption('none');
    assert.equal(await page.locator('.fx-christmas-card').count(), 0);
    await page.locator('.vct-settings-close').click(); assert.ok(await page.locator('.fx-christmas-card').count() > 0);
    await page.reload(); await page.evaluate(() => window.VCTStage.effectsReady);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.COMMENT_EFFECT), 'christmas');
    await commit({ DISPLAY_MODE: 'stack', MAX_ITEMS: 3, CHRISTMAS_ASSET_MODE: 'generated' });
    await page.route('**/star-gold-v1.png', r => r.abort());
    await emit('failed'); assert.equal(await card('failed').locator('.fx-christmas-card-icon span').textContent(), '⭐');
    for (let i = 0; i < 12; i++) await emit('burst-' + i);
    await page.waitForTimeout(700); assert.ok(await page.locator('.fx-christmas-card').count() <= 3);
    await page.evaluate(() => window.clearCardTest()); await page.waitForTimeout(700); assert.equal(await page.locator('.fx-christmas-card').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: 通常の星・支援のベル/リボン・継続する漂いと光・カード内の移動・特別な本文余白なし・新着の一度だけの強発光・固定/受取除外・重複・素材なし・動き抑制時の静止・再選択・3表示方式・取消・保存復元・素材失敗・件数上限・clear');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
