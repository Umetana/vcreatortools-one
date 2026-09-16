const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../widgets/comments/display/underbar.js'), 'utf8'), { window, getComputedStyle: el => ({ width: el.getBoundingClientRect().width }) });
function setup(random = () => 0) {
  let now = 0, callback = null;
  const removed = [];
  const env = { random, now: () => now, width: () => 1000, frame: fn => { callback = fn; return 1; }, cancel: () => { callback = null; } };
  const controller = window.VCT_UNDERBAR.create(key => removed.push(key), env);
  const element = (key, width, height = 80) => ({ dataset: { displayOrder: String(key) }, style: { removeProperty(k) { delete this[k]; } }, querySelector: () => ({ offsetHeight: height, getBoundingClientRect: () => ({ width }) }) });
  return { controller, element, removed, step: ms => { now = ms; const fn = callback; callback = null; if (fn) fn(); }, pending: () => !!callback };
}
test('待機の古いものを落とし、可変幅・倍率の間隔を確保して流し切る', () => {
  const t = setup(), a = t.element(1, 200), b = t.element(2, 400), c = t.element(3, 300);
  const conf = { UNDERBAR_SPEED: 100, UNDERBAR_SCALE: 50, UNDERBAR_GAP: 60, UNDERBAR_QUEUE: 1 };
  t.controller.sync([a], conf); t.step(0);
  assert.equal(a.dataset.underbarState, 'active');
  t.controller.sync([a, b, c], conf); assert.deepEqual(t.removed, [2]);
  t.step(1000); assert.equal(c.dataset.underbarState, 'waiting');
  t.step(2000); assert.equal(c.dataset.underbarState, 'active');
  t.step(20000); assert.deepEqual(t.removed, [2, 1, 3]);
  assert.ok(!t.pending());
});
test('左から右へ移動し、resetで移動・待機を解除する', () => {
  const t = setup(), a = t.element(1, 200);
  t.controller.sync([a], { UNDERBAR_DIRECTION: 'ltr', UNDERBAR_SPEED: 100 }); t.step(0);
  assert.match(a.style.transform, /translateX\(-240px\)/);
  t.step(1000); assert.match(a.style.transform, /translateX\(-140px\)/);
  t.controller.reset(); assert.ok(!t.pending()); assert.equal(a.dataset.underbarState, undefined);
  t.step(30000); assert.deepEqual(t.removed, []);
});

test('複数レーンの可変幅・倍率・上下間隔と入口待ち、resetの掃除', () => {
  for (const direction of ['rtl', 'ltr']) {
    const t = setup(), a = t.element(1, 200), b = t.element(2, 600, 120), c = t.element(3, 300);
    const conf = { UNDERBAR_LANES: 2, UNDERBAR_LANE_GAP: 15, UNDERBAR_BOTTOM: 20, UNDERBAR_SCALE: 50, UNDERBAR_SPEED: 100, UNDERBAR_GAP: 10, UNDERBAR_DIRECTION: direction };
    t.controller.sync([a,b,c], conf); t.step(0);
    assert.equal(a.dataset.underbarLane, '0'); assert.equal(b.dataset.underbarLane, '1');
    assert.equal(a.style.bottom, '20px'); assert.equal(b.style.bottom, '95px');
    assert.equal(c.dataset.underbarState, 'waiting');
    t.step(1200); assert.equal(c.dataset.underbarLane, '0');
    t.controller.reset();
    assert.equal(b.style.bottom, undefined); assert.equal(b.dataset.underbarLane, undefined);
    assert.ok(!t.pending());
  }
});

test('ゆっくり来ても順番に全段を使い、resetで下段から再開する', () => {
  const t=setup(), conf={UNDERBAR_LANES:3, UNDERBAR_LANE_MODE:'sequence'};
  for(let i=0;i<5;i++) {
    const el=t.element(i,200);t.controller.sync([el],conf);t.step(i*10000);
    assert.equal(el.dataset.underbarLane,String(i%3));
  }
  t.controller.reset();const el=t.element(6,200);t.controller.sync([el],conf);t.step(60000);
  assert.equal(el.dataset.underbarLane,'0');
});
test('ランダムは一度だけ抽選し、同じ段では間隔を待つ。他段は独立して発車', () => {
  let calls=0;const values=[.9,.9,.1],t=setup(()=>values[calls++]);
  const els=[1,2,3].map(i=>t.element(i,300)),conf={UNDERBAR_LANES:3,UNDERBAR_LANE_MODE:'random',UNDERBAR_SPEED:100};
  t.controller.sync(els,conf);t.step(0);
  assert.equal(els[0].dataset.underbarLane,'2');assert.equal(els[1].dataset.underbarState,'waiting');
  assert.equal(els[2].dataset.underbarLane,'0');
  t.controller.sync(els,conf);t.step(1000);assert.equal(calls,3);assert.equal(els[1].dataset.underbarState,'waiting');
  t.step(4000);assert.equal(els[1].dataset.underbarLane,'2');assert.equal(calls,3);
});
