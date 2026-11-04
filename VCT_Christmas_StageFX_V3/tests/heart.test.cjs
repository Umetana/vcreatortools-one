const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../widgets/comments/effects/heart/main.js'), 'utf8'), { window, getComputedStyle: el => ({ width: el.getBoundingClientRect().width }) });
test('支援・メンバー・通常・固定の対象条件とOFF', () => {
  const effect = window.VCT_HEART;
  const c = { COMMENT_EFFECT: 'heart', HEART_TARGET: 'support-membership' };
  assert.ok(effect.eligible({ isSupport: true }, c));
  assert.ok(effect.eligible({ isMembership: true }, c));
  assert.ok(!effect.eligible({ isSticky: true }, c));
  assert.ok(!effect.eligible({}, c));
  assert.ok(!effect.eligible({ isMembership: true }, { ...c, HEART_TARGET: 'support' }));
  assert.ok(effect.eligible({}, { ...c, HEART_TARGET: 'all' }));
  assert.ok(!effect.eligible({ isSupport: true }, { ...c, COMMENT_EFFECT: 'none' }));
});
