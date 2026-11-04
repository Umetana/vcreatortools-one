// 模擬SDK入力とfile起動で支援発火・描画・終了・保存を確認する。
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
      const subs = new Map(); let serial = 0;
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe(s) { subs.set(++serial, s); return serial; }, unsubscribe(id) { subs.delete(id); } };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      window.emitPresentTest = raw => subs.forEach(s => { if (s.action === 'comments') s.callback(raw); });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?settings=1');
    await page.locator('#vct-settings-root:not([hidden])').waitFor();
    await page.evaluate(() => window.VCTStage.effectsReady);
    const commit = values => page.evaluate(v => window.VCT_CONFIG_RUNTIME.commitLocal(v), values);
    const stop = () => page.evaluate(() => window.VCT_STAGE_PREVIEW.stopAll());
    const emit = async (id, extra = {}) => {
      await page.evaluate(({ id, extra }) => window.emitPresentTest({ service: 'youtube', data: { id, userId: 'test', name: '試験', comment: '支援', ...extra } }), { id, extra });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    };
    const support = { giftType: 'superchat', hasGift: true, price: 999, currency: 'JPY' };
    const present = page.locator('.fx-christmas-present');
    const metrics = () => present.evaluate(el => ({
      box: parseFloat(el.querySelector('.fx-christmas-present-scene').style.width),
      particle: parseFloat(el.querySelector('.fx-christmas-present-particle').style.width),
      duration: el.querySelector('.fx-christmas-present-scene').getAnimations()[0].effect.getTiming().duration
    }));
    await commit({ STAGE_EFFECT_ID: 'christmas_present', STAGE_EFFECT_DURATION_MS: 4000, STAGE_EFFECT_INTENSITY_MODE: 'value' });
    for (const [price, rank, count] of [[999, 'small', 10], [1000, 'standard', 18], [5000, 'large', 26], [10000, 'extra', 34]]) {
      await emit(`rank-${price}`, { ...support, price });
      assert.equal(await present.count(), 1); assert.equal(await present.getAttribute('data-intensity'), rank);
      assert.equal(await present.locator('.fx-christmas-present-particle').count(), count);
      const factors = { small: [.85, .9, .85], standard: [1, 1, 1], large: [1.15, 1.15, 1.2], extra: [1.3, 1.3, 1.4] }[rank];
      const m = await metrics(); assert.equal(m.duration, Math.round(4000 * factors[0]));
      assert.ok(Math.abs(m.box - 268 * factors[1]) < .001); assert.ok(Math.abs(m.particle - 48 * factors[2] * .85) < .001);
      await stop();
    }
    await emit('rank-999', support); assert.equal(await present.count(), 0);
    await emit('normal', { }); await emit('receiver', { giftType: 'giftreceived', hasGift: true });
    await emit('member', { giftType: 'subscribe', comment: '' }); await emit(undefined, support);
    await emit('sticky', { ...support, isSticky: true }); assert.equal(await present.count(), 0);
    await emit('member-gift', { giftType: 'sponsorgift', giftCount: 20, hasGift: true, comment: '' });
    assert.equal(await present.getAttribute('data-intensity'), 'extra'); await stop();
    assert.equal(await page.locator('.fx-christmas-tree-gift').count(), 5);
    await commit({ CHRISTMAS_PRESENT_PARTICLE_COUNT: 36 });
    for (const [price, count] of [[100, 20], [1000, 36], [5000, 52], [10000, 68]]) {
      await emit(`count-${price}`, { ...support, price });
      assert.equal(await present.locator('.fx-christmas-present-particle').count(), count); await stop();
    }
    for (const [base, rank, expected] of [[1, 'small', 1], [60, 'extra', 113], [37, 'standard', 37]]) {
      await commit({ CHRISTMAS_PRESENT_PARTICLE_COUNT: base, STAGE_PLUGIN_christmas_present_INTENSITY: rank });
      await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
      assert.equal(await present.locator('.fx-christmas-present-particle').count(), expected); await stop();
    }
    await commit({ CHRISTMAS_PRESENT_PARTICLE_COUNT: 18, STAGE_PLUGIN_christmas_present_INTENSITY: 'inherit' });
    // 共通＋標準固定は、金額に関係なく任意の基準値をそのまま使う。
    await commit({ STAGE_EFFECT_INTENSITY_MODE: 'fixed', STAGE_PLUGIN_christmas_present_INTENSITY: 'inherit' });
    for (const price of [100, 1000, 5000, 10000]) {
      await emit(`shared-fixed-${price}`, { ...support, price });
      assert.equal(await present.getAttribute('data-intensity'), 'standard');
      assert.deepEqual(await metrics(), { box: 268, particle: 40.8, duration: 4000 });
      assert.equal(await present.locator('.fx-christmas-present-particle').count(), 18); await stop();
    }
    // 個別のプリセットは共通モードのどちらよりも優先する。
    for (const mode of ['fixed', 'value']) {
      for (const [rank, count] of [['small', 10], ['standard', 18], ['large', 26], ['extra', 34]]) {
        await commit({ STAGE_EFFECT_INTENSITY_MODE: mode, STAGE_PLUGIN_christmas_present_INTENSITY: rank });
        await emit(`override-${mode}-${rank}`, { ...support, price: rank === 'small' ? 10000 : 100 });
        assert.equal(await present.getAttribute('data-intensity'), rank);
        assert.equal(await present.locator('.fx-christmas-present-particle').count(), count); await stop();
      }
    }
    await commit({ STAGE_PLUGIN_christmas_present_INTENSITY: 'standard' });
    for (const price of [100, 10000]) {
      await emit(`fixed-${price}`, { ...support, price });
      assert.equal(await present.getAttribute('data-intensity'), 'standard');
      assert.deepEqual(await metrics(), { box: 268, particle: 40.8, duration: 4000 });
      assert.equal(await present.locator('.fx-christmas-present-particle').count(), 18); await stop();
    }
    await commit({ STAGE_PLUGIN_christmas_present_INTENSITY: 'extra', STAGE_EFFECT_DURATION_MS: 1200 });
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
    assert.equal((await metrics()).duration, 1560);
    await page.waitForTimeout(1230); assert.equal(await present.count(), 1);
    await present.waitFor({ state: 'detached', timeout: 2000 });
    await commit({ STAGE_EFFECT_DURATION_MS: 10000 });
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
    assert.equal((await metrics()).duration, 10000); await stop();
    await commit({ STAGE_PLUGIN_christmas_present_INTENSITY: 'inherit', STAGE_EFFECT_DURATION_MS: 4000 });
    const countBefore = await page.locator('.fx-christmas-tree-root').getAttribute('data-count');
    // 専用自動発火と既存単発は併用し、選択中の開封は二重にしない。
    await commit({ STAGE_EFFECT_ID: 'sample_effect', STAGE_EFFECT_POLICY: 'overlap', STAGE_EFFECT_MAX_ACTIVE: 4 });
    await emit('with-circle', support); assert.equal(await present.count(), 1);
    assert.equal(await page.locator('[data-layer="effects"] [data-effect-id="sample_effect"]').count(), 1); await stop();
    await commit({ CHRISTMAS_PRESENT_AUTO: false }); await emit('auto-off', support); assert.equal(await present.count(), 0); await stop();
    await commit({ STAGE_EFFECT_ID: 'christmas_present', STAGE_PLUGIN_christmas_present_ENABLED: false });
    await emit('plugin-off', support); assert.equal(await present.count(), 0);
    await commit({ STAGE_PLUGIN_christmas_present_ENABLED: true, REDUCED_MOTION: true });
    await emit('reduced', support); assert.equal(await present.count(), 0);
    await commit({ REDUCED_MOTION: false, ENABLE_STAGE_EFFECTS: false });
    await emit('disabled', support); assert.equal(await present.count(), 0);
    await commit({ ENABLE_STAGE_EFFECTS: true, STAGE_PLUGIN_christmas_present_INTENSITY: 'large', CHRISTMAS_BACKGROUND: 'forest' });
    assert.notEqual(await page.locator('.fx-christmas-tree-root').getAttribute('data-count'), countBefore);
    // パネルを開き直し、直接commitした最新設定から下書きを作る。
    await page.locator('.vct-settings-close').click();
    await page.evaluate(() => window.VCT_SETTINGS_PANEL.open());
    await page.getByRole('tab', { name: '演出配置', exact: true }).click();
    await page.getByLabel('配置する演出', { exact: true }).selectOption('christmas_present');
    await page.getByRole('button', { name: '演出を試す', exact: true }).click();
    assert.equal(await present.getAttribute('data-intensity'), 'large');
    await present.locator('img').evaluateAll(images => Promise.all(images.map(im => im.decode())));
    const screenshot = async (name, phase) => {
      await page.evaluate(phase => {
        document.getElementById('vct-settings-root').style.visibility = 'hidden';
        const total = document.querySelector('.fx-christmas-present-scene').getAnimations()[0].effect.getTiming().duration;
        document.querySelectorAll('.fx-christmas-present, .fx-christmas-present *').forEach(el => el.getAnimations().forEach(a => { a.pause(); a.currentTime = total * phase; }));
      }, phase);
      await page.screenshot({ path: path.join(__dirname, name + '.png') });
    };
    await screenshot('christmas-present-closed', .3); await screenshot('christmas-present-open', .6); await stop();
    const measure = async values => {
      await commit(values); await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
      const result = await present.evaluate(el => ({
        box: el.querySelector('.fx-christmas-present-scene').style.width,
        size: el.querySelector('.fx-christmas-present-particle').style.width,
        flight: el.querySelector('.fx-christmas-present-particle').getAnimations()[0].effect.getKeyframes().map(f => f.transform)
      }));
      await stop(); return result;
    };
    const baseline = await measure({ CHRISTMAS_PRESENT_BOX_SIZE: 268, CHRISTMAS_PRESENT_PARTICLE_SIZE: 48, CHRISTMAS_PRESENT_SPREAD: 260 });
    const bigBox = await measure({ CHRISTMAS_PRESENT_BOX_SIZE: 500 });
    assert.notEqual(bigBox.box, baseline.box); assert.equal(bigBox.size, baseline.size); assert.deepEqual(bigBox.flight, baseline.flight);
    const bigContents = await measure({ CHRISTMAS_PRESENT_PARTICLE_SIZE: 120 });
    assert.equal(bigContents.box, bigBox.box); assert.notEqual(bigContents.size, bigBox.size); assert.deepEqual(bigContents.flight, bigBox.flight);
    const wide = await measure({ CHRISTMAS_PRESENT_SPREAD: 1600, STAGE_PLUGIN_christmas_present_X: 0, STAGE_PLUGIN_christmas_present_Y: 0, STAGE_PLUGIN_christmas_present_WIDTH: 1920, STAGE_PLUGIN_christmas_present_HEIGHT: 1080 });
    assert.equal(wide.box, bigContents.box); assert.equal(wide.size, bigContents.size); assert.notDeepEqual(wide.flight, bigContents.flight);
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
    await present.locator('img').evaluateAll(images => Promise.all(images.map(im => im.decode())));
    await screenshot('christmas-present-wide', .65); await stop();
    const narrow = await measure({ STAGE_PLUGIN_christmas_present_WIDTH: 100, STAGE_PLUGIN_christmas_present_HEIGHT: 100 });
    assert.deepEqual(narrow, wide);
    await page.evaluate(() => { window.VCT_SETTINGS_PANEL.open(); document.getElementById('vct-settings-root').style.visibility = ''; });
    await page.getByRole('tab', { name: '演出配置', exact: true }).click();
    await page.getByLabel('配置する演出', { exact: true }).selectOption('christmas_present');
    const particleInput = page.locator('[data-range-key="CHRISTMAS_PRESENT_PARTICLE_SIZE"]:visible');
    assert.equal(await particleInput.inputValue(), '120'); await particleInput.fill('80'); await particleInput.press('Enter');
    const countInput = page.locator('[data-range-key="CHRISTMAS_PRESENT_PARTICLE_COUNT"]:visible');
    assert.equal(await countInput.inputValue(), '18'); await countInput.fill('36'); await countInput.press('Enter');
    await page.locator('.vct-settings-close').click();
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_PRESENT_PARTICLE_SIZE), 120);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_PRESENT_PARTICLE_COUNT), 18);
    await commit({ CHRISTMAS_ASSET_MODE: 'plain', STAGE_EFFECT_DURATION_MS: 1200, CHRISTMAS_PRESENT_PARTICLE_COUNT: 36 });
    const treeBeforePreview = await page.locator('.fx-christmas-tree-root').getAttribute('data-count');
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
    assert.equal(await present.locator('img').count(), 0);
    assert.equal(await present.locator('.fx-christmas-present-particle').count(), 52);
    assert.equal(await present.locator('.fx-christmas-present-scene').getAttribute('data-mode'), 'plain');
    assert.equal(await page.locator('.fx-christmas-tree-root').getAttribute('data-count'), treeBeforePreview);
    await present.waitFor({ state: 'detached', timeout: 3000 });
    await commit({ STAGE_EFFECT_POLICY: 'queue', STAGE_EFFECT_MAX_ACTIVE: 1, STAGE_EFFECT_QUEUE_LIMIT: 2 });
    await page.evaluate(() => { for (let i = 0; i < 10; i++) window.VCT_STAGE_PREVIEW.effect('christmas_present'); });
    assert.equal(await present.count(), 1); assert.match(await page.evaluate(() => window.VCT_STAGE_PREVIEW.status()), /待機 2/);
    await stop(); assert.equal(await present.count(), 0); assert.match(await page.evaluate(() => window.VCT_STAGE_PREVIEW.status()), /待機 0/);
    await page.reload(); await page.evaluate(() => window.VCTStage.effectsReady);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_PRESENT_AUTO), false);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_PRESENT_PARTICLE_COUNT), 36);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_PRESENT_PARTICLE_SIZE), 120);
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_PRESENT_SPREAD), 1600);
    assert.equal(await present.count(), 0);
    await commit({ CHRISTMAS_ASSET_MODE: 'generated', STAGE_EFFECT_DURATION_MS: 4000 });
    await context.route('**/present-open-atlas-v1.png', r => r.abort());
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect('christmas_present'));
    await page.waitForFunction(() => document.querySelector('.fx-christmas-present-scene')?.dataset.mode === 'plain');
    await stop(); assert.deepEqual(errors, []);
    console.log('PASS: 支援4強度・除外・重複・既存演出併用・箱/中身/飛距離の独立・領域寸法の独立・設定取消復元・各OFF・試験非加算・生成/代替・自然終了・待機上限・全停止・file復元・素材失敗');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
