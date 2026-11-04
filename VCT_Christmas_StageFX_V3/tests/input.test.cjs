const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup() {
  const scope = { window: { VCTStage: {} }, document: { hidden: false }, console };
  vm.createContext(scope);
  for (const file of ['triggers.js', 'adapters/onecomme-adapter.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
  return scope;
}
test('金額・ギフト件数・ジュエル数の境界と不明値の標準フォールバック', () => {
  const { window: { VCTStage: api } } = setup();
  const money = amount => ({ monetization: { money: { amount, currency: 'JPY' } } });
  assert.equal(api.intensity(money(999), 'value'), 'small');
  assert.equal(api.intensity(money(1000), 'value'), 'standard');
  assert.equal(api.intensity(money(5000), 'value'), 'large');
  assert.equal(api.intensity(money(10000), 'value'), 'extra');
  assert.equal(api.intensity(money(Infinity), 'value'), 'standard');
  assert.equal(api.intensity(money(10000), 'fixed'), 'standard');
  assert.equal(api.intensity({ monetization: { money: { amount: 999999, currency: 'XXX' } } }, 'value'), 'standard');
  assert.equal(api.intensity({ event: { kind: 'membership_gift' }, membership: { giftCount: 20 } }, 'value'), 'extra');
  assert.equal(api.intensity({ event: { kind: 'jewel' }, monetization: { jewels: { count: 1000 } } }, 'value'), 'large');
  assert.equal(api.isEffectEvent({ event: { kind: 'normal' } }), false);
});
test('重複、異なる配信元、欠落ID、空入力、非表示、破棄後の入力を区別', () => {
  const scope = setup(); const results = [];
  const adapter = new scope.window.VCTStage.OneCommeAdapter({
    onComment: (parsed, meta) => results.push(meta), onClear() {},
    normalize: raw => ({ id: raw.data?.id || 'sdk-generated', service: { id: raw.service || 'youtube' }, message: { text: raw.data?.comment || '' } })
  });
  const raw = { id: 'source-a', data: { id: 'a', comment: '本文' } };
  adapter.receive(raw); adapter.receive(raw);
  assert.equal(results.length, 1); assert.equal(results[0].canTrigger, true);
  adapter.receive({ ...raw, id: 'source-b' }); assert.equal(results.length, 2);
  adapter.receive({ data: { comment: 'IDなし' } }); assert.equal(results[2].canTrigger, false);
  adapter.receive(null); adapter.receive([]); adapter.receive({}); assert.equal(results.length, 3);
  scope.document.hidden = true; adapter.receive({ data: { id: 'b', comment: '非表示' } }); assert.equal(results.length, 3);
  scope.document.hidden = false; adapter.destroy(); adapter.receive(raw); assert.equal(results.length, 3);
});
