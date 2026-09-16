const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../widgets/comments/effects/flash/main.js'), 'utf8'), { window, getComputedStyle: el => ({ width: el.getBoundingClientRect().width }) });
test('指定色・SDK強調色・欠落や不正色の復帰', () => {
  const color = window.VCT_FLASH.resolveColor;
  const fixed = { FLASH_COLOR_MODE: 'fixed', FLASH_COLOR: '#123456' };
  const linked = { ...fixed, FLASH_COLOR_MODE: 'comment' };
  assert.equal(color({ colorStr: 'rgb(20, 100, 255)' }, fixed), '#123456');
  assert.equal(color({ colorStr: 'rgb(20, 100, 255)' }, linked), 'rgb(20, 100, 255)');
  assert.equal(color({ colorStr: '#abcdef' }, linked), '#abcdef');
  for (const value of [undefined, '', 'rgb(256, 0, 0)', 'var(--other)', {}]) assert.equal(color({ colorStr: value }, linked), '#123456');
  assert.equal(color({}, { FLASH_COLOR_MODE: 'comment', FLASH_COLOR: 'invalid' }), '#ffd166');
});
test('支援・メンバー・通常・固定の対象条件とOFF', () => {
  const effect = window.VCT_FLASH;
  const c = { COMMENT_EFFECT: 'flash', FLASH_TARGET: 'support-membership' };
  assert.ok(effect.eligible({ isSupport: true }, c));
  assert.ok(effect.eligible({ isMembership: true }, c));
  assert.ok(!effect.eligible({ isSticky: true }, c));
  assert.ok(!effect.eligible({}, c));
  assert.ok(!effect.eligible({ isMembership: true }, { ...c, FLASH_TARGET: 'support' }));
  assert.ok(effect.eligible({}, { ...c, FLASH_TARGET: 'all' }));
  assert.ok(!effect.eligible({ isSupport: true }, { ...c, COMMENT_EFFECT: 'none' }));
});

test('ランダムは7種類から抽選し、コメントの結果を設定変更でも維持する', () => {
  const effect = window.VCT_FLASH;
  for (let i = 0; i < 7; i++) {
    const sandbox = { window: {}, Math: Object.assign(Object.create(Math), { random: () => (i + .5) / 7 }) };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../widgets/comments/effects/flash/main.js'), 'utf8'), sandbox);
    const mode = sandbox.window.VCT_FLASH.createMode();
    assert.equal(mode, effect.modes[i]);
    const comment = { flashMode: mode };
    assert.equal(effect.resolveMode(comment, { FLASH_MODE: 'random' }), mode);
    assert.equal(effect.resolveMode(comment, { FLASH_MODE: 'sweep' }), 'sweep');
    assert.equal(effect.resolveMode(comment, { FLASH_MODE: 'random', FLASH_COLOR: '#ffffff' }), mode);
  }
});
