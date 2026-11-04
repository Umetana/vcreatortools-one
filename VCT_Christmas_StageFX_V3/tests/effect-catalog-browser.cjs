// 廃止した同梱演出が旧保存値から復活せず、他の演出と成長データを保つことを確認する。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs');
const { pathToFileURL } = require('node:url');
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const folder = path.basename(path.resolve(__dirname, '..'));
    const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await context.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
    await context.addInitScript(folder => {
      const sdk = { setup() {}, ready: () => Promise.resolve(), connect() {}, subscribe() { return 1; }, unsubscribe() {} };
      Object.defineProperty(window, 'OneSDK', { get: () => sdk, set() {} });
      const key = 'vct.stage-fx.settings.' + JSON.stringify([folder, 'default']);
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ STAGE_EFFECT_ID: 'halloween_parade_effect', CHRISTMAS_TREE_GOAL: 777 }));
        localStorage.setItem(key + '.christmas-tree.v1', JSON.stringify({ version: 1, count: 125, seen: [] }));
        localStorage.setItem('vct.stage-fx.effects.' + JSON.stringify(folder), JSON.stringify({ added: ['halloween_parade_effect'], disabled: [] }));
      }
    }, folder);
    const page = await context.newPage(), errors = [], retiredRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes('halloween')) retiredRequests.push(r.url()); });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?settings=1');
    await page.locator('#vct-settings-root:not([hidden])').waitFor(); await page.evaluate(() => window.VCTStage.effectsReady);
    assert.equal(await page.evaluate(() => window.VCTStage.registry.get('halloween_parade_effect') !== undefined), false);
    assert.equal(await page.evaluate(() => window.VCTStage.catalog.entries().some(e => e.id === 'halloween_parade_effect')), false);
    assert.equal(await page.evaluate(() => window.VCTStage.catalog.errors.size), 0);
    await page.getByRole('tab', { name: '画面演出', exact: true }).click();
    assert.equal(await page.locator('[data-config-key="STAGE_EFFECT_ID"] option[value="halloween_parade_effect"]').count(), 0);
    assert.equal(await page.locator('[data-config-key="STAGE_EFFECT_ID"]').inputValue(), 'sample_effect');
    const fallback = await page.evaluate(() => window.VCT_STAGE_PREVIEW.effect()); assert.equal(fallback.status, 'started');
    assert.equal(await page.locator('[data-layer="effects"] [data-effect-id="sample_effect"]').count(), 1);
    await page.evaluate(() => window.VCT_STAGE_PREVIEW.stopAll());
    const rejected = await page.evaluate(async () => { try { await window.VCTStage.catalog.change('halloween_parade_effect', true); return false; } catch (_) { return true; } });
    assert.equal(rejected, true);
    for (const id of ['heart_effect', 'stars_effect', 'confetti_effect', 'sparkle_effect']) {
      const result = await page.evaluate(id => window.VCT_STAGE_PREVIEW.effect(id), id);
      assert.equal(result.status, 'started');
      assert.equal(await page.locator(`[data-layer="effects"] [data-effect-id="${id}"]`).count(), 1);
      await page.evaluate(() => window.VCT_STAGE_PREVIEW.stopAll());
    }
    assert.equal(await page.locator('.fx-christmas-tree-root').getAttribute('data-count'), '125');
    assert.equal(await page.evaluate(() => window.VCT_CONFIG_RUNTIME.effective.CHRISTMAS_TREE_GOAL), 777);
    assert.equal(fs.existsSync(path.resolve(__dirname, '../effects/halloween_parade_effect')), false);
    assert.deepEqual(retiredRequests, []); assert.deepEqual(errors, []);
    console.log('PASS: ハロウィンの登録/一覧/素材/読込なし・旧保存値からの復活なし・サークル復帰・既存4演出・ツリー進行/設定保持');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
