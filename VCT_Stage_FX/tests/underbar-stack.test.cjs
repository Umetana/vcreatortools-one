const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const window = {};
for (const file of ['underbar-stack.js', 'underbar.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../widgets/comments/display/' + file), 'utf8'), { window, getComputedStyle: el => ({ width: el.getBoundingClientRect().width }) });
function setup(direction = 'rtl') {
  let now = 0, callback = null;
  const removed = [], elements = [];
  const env = { now: () => now, width: () => 1000, frame: fn => { callback = fn; return 1; }, cancel: () => { callback = null; } };
  const controller = window.VCT_UNDERBAR.create(key => { removed.push(key); const i=elements.findIndex(el=>Number(el.dataset.displayOrder)===key); if(i>=0) elements.splice(i,1); }, env);
  const config = { UNDERBAR_MODE: 'stack', UNDERBAR_DIRECTION: direction, UNDERBAR_WIDTH: 300, UNDERBAR_GAP: 10, UNDERBAR_SLIDE_MS: 500, UNDERBAR_EXIT_CARDS: 2 };
  return { removed, elements, config, controller,
    add(key, width=300) { const el={dataset:{displayOrder:String(key)},style:{removeProperty(k){delete this[k];}},querySelector:()=>({getBoundingClientRect:()=>({width})})}; elements.push(el); controller.sync(elements,config); return el; },
    step(ms) {now=ms;const fn=callback;callback=null;if(fn)fn();}, pending:()=>!!callback
  };
}
const x = el => Number(el.style.transform.match(/translateX\(([-.0-9]+)px/)[1]);
test('新着なしでは残り、画面外の2枚分を超えたものだけを除去', () => {
  const t=setup(), first=t.add(1);t.step(500);
  assert.equal(x(first),680);assert.ok(!t.pending());
  t.step(50000);assert.deepEqual(t.removed,[]);
  for(let i=2;i<=5;i++){t.add(i);t.step(50000+i*1000);}
  assert.ok(x(first)+300<0);assert.deepEqual(t.removed,[]);
  t.add(6);t.step(57000);assert.deepEqual(t.removed,[]);
  t.add(7);t.step(58000);assert.ok(t.removed.includes(1));
});
test('可変幅の連投で位置が逆戻りせず、左右とも最終間隔を維持', () => {
  for(const direction of ['rtl','ltr']) {
    const t=setup(direction), a=t.add(1,200);t.step(500);
    const b=t.add(2,300);t.step(650);const before=x(a);
    const c=t.add(3,250);t.step(660);const after=x(a);
    assert.ok(direction==='rtl'?after<=before:after>=before);
    t.step(1200);
    assert.equal(direction==='rtl'?x(b)-(x(a)+200):x(a)-(x(b)+300),10);
    assert.equal(direction==='rtl'?x(c)-(x(b)+300):x(b)-(x(c)+250),10);
    t.controller.reset();assert.ok(!t.pending());assert.equal(a.dataset.underbarState,undefined);
  }
});
