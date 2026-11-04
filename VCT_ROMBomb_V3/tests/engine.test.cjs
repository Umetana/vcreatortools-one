// 実コメント・外部通信を使わず、受信時刻を指定して状態遷移を検証する。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const Engine = require('../js/rom_bomb_engine.js');
const context = { window: {} };
vm.createContext(context);
for (const file of ['config_default.js','settings/settings-schema.js','settings/settings-contract.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const defaults = context.window.CONFIG_DEFAULT;
const minute = 60000;
const base = Date.parse('2026-11-02T00:00:00Z');
const config = (override = {}) => ({ ...defaults, ...override });
const comment = (override = {}) => ({ id: 'c1', userId: 'u1', service: 'youtube', timestamp: base, name: 'リスナー', ...override });

test('初期履歴・時刻不明・ID欠落・システム・配信者・モデレーターの除外', () => {
  const engine = new Engine(config(), base);
  for (const data of [{ timestamp: base - 1 },{ timestamp: NaN },{ userId: '' },{ id: '' },{ service: '' },{ system: true },{ owner: true },{ moderator: true }]) {
    assert.equal(engine.receive(comment({ id: JSON.stringify(data), ...data }), base), false);
  }
  assert.equal(engine.listeners.size, 0);
  assert.equal(engine.receive(comment(), base), true);
});
test('5分待って経過0で登場し、登場後10/15/20分の境界で変化する', () => {
  const engine = new Engine(config(), base);
  engine.receive(comment(), base);
  assert.equal(engine.snapshot(base + 5 * minute - 1).length, 0);
  assert.equal(engine.snapshot(base + 5 * minute)[0].stage, 0);
  assert.equal(engine.snapshot(base + 5 * minute)[0].elapsed, 0);
  assert.equal(engine.snapshot(base + 15 * minute - 1)[0].stage, 0);
  assert.equal(engine.snapshot(base + 15 * minute)[0].stage, 1);
  assert.equal(engine.snapshot(base + 20 * minute)[0].stage, 2);
  assert.equal(engine.snapshot(base + 25 * minute)[0].status, 'exploding');
  assert.equal(engine.listeners.size, 0);
  assert.equal(engine.snapshot(base + 25 * minute + 1999)[0].status, 'exploding');
  assert.equal(engine.snapshot(base + 25 * minute + 2000).length, 0);
  assert.equal(engine.snapshot(base + 30 * minute).length, 0);
});
test('再コメントによる解除・重複受信抑止・再登録を古い演出終了が消さない', () => {
  const engine = new Engine(config(), base);
  engine.receive(comment(), base);
  engine.snapshot(base + 6 * minute);
  const second = comment({ id: 'c2', timestamp: base + 6 * minute });
  assert.equal(engine.receive(second, second.timestamp), true);
  assert.equal(engine.snapshot(second.timestamp)[0].status, 'released');
  assert.equal(engine.receive(second, second.timestamp + 100), false);
  assert.equal(engine.snapshot(second.timestamp + 650).length, 0);
  assert.equal(engine.snapshot(second.timestamp + 5 * minute)[0].elapsed, 0);
  engine.snapshot(second.timestamp + 25 * minute);
  assert.equal(engine.listeners.size, 0);
  const third = comment({ id: 'c3', timestamp: second.timestamp + 25 * minute + 100 });
  engine.receive(third, third.timestamp);
  assert.equal(engine.snapshot(third.timestamp).length, 0);
  engine.snapshot(third.timestamp + 2000);
  assert.equal(engine.listeners.size, 1);
});
test('停止時間を除外し、停止中のコメント・新規登録を経過時間0で再開する', () => {
  const engine = new Engine(config(), base);
  engine.receive(comment(), base);
  engine.configure(config({ ENABLED: false }), base + 3 * minute);
  assert.equal(engine.snapshot(base + 60 * minute).length, 0);
  engine.receive(comment({ id: 'c2', timestamp: base + 60 * minute }), base + 60 * minute);
  engine.receive(comment({ id: 'c3', userId: 'u2', timestamp: base + 61 * minute }), base + 61 * minute);
  engine.configure(config(), base + 70 * minute);
  assert.equal(engine.snapshot(base + 74 * minute).length, 0);
  const rows = engine.snapshot(base + 75 * minute);
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row.elapsed === 0));
});
test('コメントのないユーザーは停止前の経過から再開・初期OFFも正しく動作する', () => {
  const engine = new Engine(config(), base);
  engine.receive(comment(), base);
  engine.snapshot(base + 5 * minute);
  engine.configure(config({ ENABLED: false }), base + 6 * minute);
  assert.equal(engine.snapshot(base + 80 * minute)[0].elapsed, minute);
  engine.configure(config(), base + 80 * minute);
  assert.equal(engine.snapshot(base + 82 * minute)[0].elapsed, 3 * minute);
  const stopped = new Engine(config({ ENABLED: false }), base);
  stopped.receive(comment(), base);
  stopped.configure(config(), base + 100 * minute);
  assert.equal(stopped.snapshot(base + 105 * minute)[0].elapsed, 0);
});
test('上位人数・解除中の上限維持・枠外の期限処理・サービス間のID分離', () => {
  const engine = new Engine(config({ MAX_ITEMS: 2 }), base);
  for (let i = 0; i < 12; i++) engine.receive(comment({ id: `c${i}`, userId: `u${i}`, timestamp: base + i * 1000 }), base + i * 1000);
  assert.deepEqual(engine.snapshot(base + 6 * minute).map(row => row.name), ['リスナー','リスナー']);
  engine.receive(comment({ id: 'reset', timestamp: base + 6 * minute }), base + 6 * minute);
  assert.equal(engine.snapshot(base + 6 * minute).length, 2);
  assert.equal(engine.snapshot(base + 6 * minute + 650).length, 2);
  const rows = engine.snapshot(base + 26 * minute + 1000);
  assert.equal(rows.length, 2);
  assert.equal(engine.listeners.size, 1);
  assert.ok(rows.every(row => row.status === 'exploding'));
  const cross = new Engine(config(), base);
  cross.receive(comment(), base);
  cross.receive(comment({ service: 'twitch' }), base);
  assert.equal(cross.listeners.size, 2);
});
test('時刻設定・モデレーター設定・演出OFFを即時適用', () => {
  const engine = new Engine(config({ INCLUDE_MODERATORS: true }), base);
  engine.receive(comment({ moderator: true }), base);
  engine.configure(config({ START_MIN: 1, WARN_MIN: 2, DANGER_MIN: 3, EXPLODE_MIN: 4, INCLUDE_MODERATORS: true }), base + minute);
  assert.equal(engine.snapshot(base + minute).length, 1);
  engine.configure(config(), base + minute);
  assert.equal(engine.listeners.size, 0);
  engine.receive(comment({ id: 'normal', timestamp: base + minute }), base + minute);
  engine.snapshot(base + 6 * minute);
  engine.configure(config({ EXPLOSION_EFFECT: false }), base + 6 * minute);
  assert.equal(engine.snapshot(base + 26 * minute).length, 0);
});
test('長時間復帰時に枠外を含め期限処理・重複履歴を掃除・古い再送を拒否', () => {
  const engine = new Engine(config(), base);
  for (let i = 0; i < 1000; i++) engine.receive(comment({ id: `c${i}`, userId: `u${i}` }), base);
  engine.snapshot(base + 6 * minute);
  assert.equal(engine.snapshot(base + 120 * minute).length, 10);
  engine.snapshot(base + 120 * minute + 2000);
  assert.equal(engine.listeners.size, 0);
  assert.equal(engine.effects.size, 0);
  assert.equal(engine.seen.size, 0);
  assert.equal(engine.receive(comment(), base + 120 * minute), false);
});
test('設定の型・時刻順・人数の整数制約と不正な保存値のフォールバック', () => {
  context.window.CONFIG = { ...defaults };
  context.window.VCT_CONFIG_RUNTIME = { baseline: { ...defaults } };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../settings/rom-settings.js'), 'utf8'), context);
  const validate = context.window.VCT_TEMPLATE_SETTINGS.validate;
  assert.equal(validate(config()).MAX_ITEMS, 10);
  assert.equal(validate(config({ START_MIN: 30, WARN_MIN: 1, DANGER_MIN: 2, EXPLODE_MIN: 3 })).START_MIN, 30);
  for (const override of [{ START_MIN: 0 },{ WARN_MIN: 16 },{ EXPLODE_MIN: 15 },{ MAX_ITEMS: 1.5 },{ SCALE: Infinity },{ ENABLED: 'false' },{ POSITION: 'center' },{ TIME_MODE: 'unknown' },{ EXPLOSION_SECONDS: .2 },{ EXPLOSION_SECONDS: 31 },{ ARRANGEMENT: 'unknown' },{ ITEM_GAP_PX: -1 },{ ITEM_GAP_PX: 201 },{ WRAP_COUNT: -1 },{ WRAP_COUNT: 31 },{ WRAP_COUNT: 1.5 },{ RANDOM_X: 1 },{ RANDOM_WIDTH: 0 },{ RANDOM_HEIGHT: 1081 },{ VISUAL_MODE: 'unknown' },{ SHATTER_CARDS: 'true' }]) {
    assert.throws(() => validate(config(override)));
  }
  context.window.CONFIG = { ...defaults, WARN_MIN: 0 };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../settings/rom-settings.js'), 'utf8'), context);
  assert.equal(context.window.CONFIG.WARN_MIN, 10);
});
test('爆発から退場までの時間を保持し、変更は次の爆発から適用する', () => {
  const engine = new Engine(config({ EXPLOSION_SECONDS: 4 }), base);
  engine.receive(comment(), base);
  engine.snapshot(base + 5 * minute);
  const explosionAt = base + 25 * minute;
  assert.equal(engine.snapshot(explosionAt)[0].duration, 4000);
  engine.configure(config({ EXPLOSION_SECONDS: .3 }), explosionAt + 1000);
  assert.equal(engine.snapshot(explosionAt + 3999)[0].status, 'exploding');
  assert.equal(engine.snapshot(explosionAt + 4000).length, 0);
  engine.receive(comment({ id: 'new', timestamp: explosionAt + 5000 }), explosionAt + 5000);
  engine.snapshot(explosionAt + 5000 + 5 * minute);
  const nextExplosion = explosionAt + 5000 + 25 * minute;
  assert.equal(engine.snapshot(nextExplosion)[0].duration, 300);
  assert.equal(engine.snapshot(nextExplosion + 300).length, 0);
});
test('長い爆発演出中の再コメント・演出OFFでも旧サイクルが残らない', () => {
  const engine = new Engine(config({ EXPLOSION_SECONDS: 30 }), base);
  engine.receive(comment(), base);
  engine.snapshot(base + 5 * minute);
  engine.snapshot(base + 25 * minute);
  engine.receive(comment({ id: 'new', timestamp: base + 25 * minute + 1000 }), base + 25 * minute + 1000);
  assert.equal(engine.snapshot(base + 25 * minute + 31000).length, 0);
  assert.equal(engine.listeners.size, 1);
  engine.snapshot(base + 30 * minute + 1000);
  engine.snapshot(base + 50 * minute + 1000);
  engine.configure(config({ EXPLOSION_EFFECT: false }), base + 50 * minute + 1100);
  assert.equal(engine.snapshot(base + 50 * minute + 1100).length, 0);
});
test('枠待ちで遅れて登場する人も0から開始し、一度も登場しない人は期限処理する', () => {
  const engine = new Engine(config({ MAX_ITEMS: 1, RELEASE_EFFECT: false }), base);
  engine.receive(comment(), base);
  engine.receive(comment({ id: 'c2', userId: 'u2' }), base);
  engine.snapshot(base + 5 * minute);
  engine.receive(comment({ id: 'reset', timestamp: base + 10 * minute }), base + 10 * minute);
  const first = engine.snapshot(base + 10 * minute)[0];
  assert.equal(first.key, JSON.stringify(['youtube','u2']));
  assert.equal(first.elapsed, 0);
  assert.equal(engine.snapshot(base + 11 * minute)[0].elapsed, minute);
  engine.configure(config({ MAX_ITEMS: 1, START_MIN: 30 }), base + 11 * minute);
  assert.equal(engine.snapshot(base + 12 * minute)[0].elapsed, 2 * minute);
  const hidden = new Engine(config({ MAX_ITEMS: 1 }), base);
  hidden.receive(comment(), base);
  hidden.receive(comment({ id: 'c2', userId: 'u2' }), base);
  hidden.snapshot(base + 5 * minute);
  hidden.snapshot(base + 25 * minute);
  assert.equal(hidden.listeners.size, 0);
});
test('追加前の保存設定には新項目の初期値だけを補い、既存値を保つ', () => {
  const legacy = { window: {
    CONFIG_DEFAULT: { ...defaults }, CONFIG: {},
    location: { pathname: '/VCT_ROMBomb_V3/index.html' },
    localStorage: { getItem: () => JSON.stringify({ MAX_ITEMS: 4, OFFSET_X: 75 }) }
  } };
  vm.createContext(legacy);
  for (const file of ['settings/config-runtime.js','settings/settings-schema.js','settings/settings-contract.js','settings/rom-settings.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), legacy);
  }
  assert.equal(legacy.window.CONFIG.MAX_ITEMS, 4);
  assert.equal(legacy.window.CONFIG.OFFSET_X, 75);
  assert.equal(legacy.window.CONFIG.EXPLOSION_SECONDS, 2);
  assert.equal(legacy.window.CONFIG.TIME_MODE, 'elapsed');
  assert.equal(legacy.window.CONFIG.ARRANGEMENT, 'vertical');
  assert.equal(legacy.window.CONFIG.ITEM_GAP_PX, 6);
  assert.equal(legacy.window.CONFIG.WRAP_COUNT, 0);
  assert.equal(legacy.window.CONFIG.RANDOM_WIDTH, 1920);
  assert.equal(legacy.window.CONFIG.RANDOM_HEIGHT, 1080);
  assert.equal(legacy.window.CONFIG.VISUAL_MODE, 'emoji');
  assert.equal(legacy.window.CONFIG.SHATTER_CARDS, false);
  assert.equal(legacy.window.CONFIG.EXPLOSION_SOUND, false);
  assert.equal(legacy.window.CONFIG.SOUND_VOLUME, 30);
  assert.equal(legacy.window.VCT_CONFIG_RUNTIME.storageKey, 'vct.template-settings.vct_rombomb_v3.v1');
});
