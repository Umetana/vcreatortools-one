// 実サービスへ接続せず、file運用の常設併用・保存・停止を確認する。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
    await context.addInitScript(() => {
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe() { return 1; }, unsubscribe() {} };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?settings=1');
    await page.locator('#vct-settings-root:not([hidden])').waitFor();
    const snow = page.locator('.fx-christmas-snow'), lights = page.locator('.fx-christmas-lights');
    assert.equal(await snow.count(), 0); assert.equal(await lights.count(), 0);
    await page.getByRole('tab', { name: '演出配置', exact: true }).click();
    await page.getByLabel('配置する演出', { exact: true }).selectOption('christmas_snow');
    await page.locator('[data-config-key="STAGE_PLUGIN_christmas_snow_ENABLED"]').check();
    assert.equal(await snow.locator('i').count(), 42);
    // 未保存の常設ONは取消で破棄される。
    await page.locator('.vct-settings-close').click(); assert.equal(await snow.count(), 0);
    await page.evaluate(() => window.VCT_CONFIG_RUNTIME.commitLocal({
      STAGE_PLUGIN_christmas_snow_ENABLED: true, STAGE_PLUGIN_christmas_lights_ENABLED: true,
      STAGE_PLUGIN_christmas_snow_INTENSITY: 'extra', STAGE_PLUGIN_christmas_lights_INTENSITY: 'extra',
      CHRISTMAS_BACKGROUND: 'forest', CHRISTMAS_TREE_SHOW_COUNTER: true
    }));
    assert.equal(await snow.locator('i').count(), 96); assert.equal(await lights.locator('i').count(), 30);
    assert.equal(await page.locator('[data-layer="ambient"] > .stage-effect').count(), 3);
    assert.equal(await lights.evaluate(el => el.style.height), '160px');
    const flake = snow.locator('i').first();
    const before = await flake.evaluate(el => el.getBoundingClientRect().top);
    await page.waitForTimeout(150);
    assert.notEqual(await flake.evaluate(el => el.getBoundingClientRect().top), before);
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.stopAll());
    const frozen = await flake.evaluate(el => el.getBoundingClientRect().top);
    await page.waitForTimeout(150); assert.equal(await flake.evaluate(el => el.getBoundingClientRect().top), frozen);
    assert.equal(await lights.locator('i').first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    // 停止中の設定更新・新規DOMも動かず、再開は同じ要素を使う。
    await page.evaluate(() => window.VCT_CONFIG_RUNTIME.commitLocal({ CHRISTMAS_LIGHTS_COLOR: 'colorful', STAGE_PLUGIN_christmas_snow_X: 80, STAGE_PLUGIN_christmas_snow_WIDTH: 900 }));
    assert.equal(await snow.evaluate(el => el.style.left), '80px');
    assert.equal(await snow.evaluate(el => el.style.width), '900px');
    assert.equal(await lights.locator('i').first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.resumeAmbient());
    assert.equal(await flake.evaluate(el => getComputedStyle(el).animationPlayState), 'running');
    await page.reload(); await page.evaluate(() => window.VCTStage.effectsReady);
    assert.equal(await snow.locator('i').count(), 96); assert.equal(await lights.locator('i').count(), 30);
    assert.equal(await snow.evaluate(el => el.style.width), '900px');
    await page.evaluate(() => window.VCT_CONFIG_RUNTIME.commitLocal({ CHRISTMAS_ASSET_MODE: 'plain', REDUCED_MOTION: true }));
    assert.equal(await flake.evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    assert.equal(await page.locator('.fx-christmas-tree-counter').textContent(), '0 / 500');
    await page.evaluate(() => window.VCT_CONFIG_RUNTIME.commitLocal({ REDUCED_MOTION: false, CHRISTMAS_ASSET_MODE: 'generated', STAGE_PLUGIN_christmas_snow_X: 0, STAGE_PLUGIN_christmas_snow_WIDTH: 1920 }));
    await page.locator('.fx-christmas-tree-base').evaluate(el => el.decode());
    await page.evaluate(() => { document.getElementById('vct-settings-root').style.visibility = 'hidden'; });
    await page.screenshot({ path: path.join(__dirname, 'christmas-ambient.png') });
    for (let i = 0; i < 10; i++) await page.evaluate(() => {
      window.VCT_CONFIG_RUNTIME.commitLocal({ STAGE_PLUGIN_christmas_snow_ENABLED: false, STAGE_PLUGIN_christmas_lights_ENABLED: false });
      window.VCT_CONFIG_RUNTIME.commitLocal({ STAGE_PLUGIN_christmas_snow_ENABLED: true, STAGE_PLUGIN_christmas_lights_ENABLED: true });
    });
    assert.equal(await snow.locator('i').count(), 96); assert.equal(await lights.locator('i').count(), 30);
    await page.evaluate(() => window.VCT_CONFIG_RUNTIME.commitLocal({ STAGE_PLUGIN_christmas_snow_ENABLED: false }));
    assert.equal(await snow.count(), 0); assert.equal(await lights.count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: 常設3種併用・初期OFF・設定取消・上限・移動・停止中再描画・再開・file保存復元・素材なし・動き抑制・連続ON/OFF');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
