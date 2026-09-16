// 追加パッケージを使わず、実際のHostとContextの終了契約を確認する。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function setup(maxRuntimeMs = 1000) {
  const elements = [];
  const document = { createElement() {
    const element = { dataset: {}, style: {}, remove() { this.removed = true; } };
    elements.push(element); return element;
  } };
  const scope = { window: {}, document, console: { warn() {}, error() {} }, AbortController, setTimeout, clearTimeout };
  vm.createContext(scope);
  for (const name of ['stage-layout', 'effect-registry', 'effect-context', 'effect-host']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../runtime', `${name}.js`), 'utf8'), scope);
  }
  const api = scope.window.VCTStage;
  const container = { appendChild() {} };
  const host = new api.EffectHost({ container, backdrop: { style: {} }, maxRuntimeMs });
  const instances = [];
  class Effect {
    static manifest = { stageApi: 1, name: '試験', lifecycle: 'effect' };
    constructor(context, params) { this.context = context; this.params = params; this.destroyCount = 0; instances.push(this); }
    start() {}
    destroy() { this.destroyCount++; }
  }
  api.registry.register('test', Effect);
  return { api, host, instances, elements, Effect };
}
test('queueは上限を守り、元paramsの変更が待機へ漏れず、個別取消とFIFOに対応', () => {
  const { host, instances } = setup();
  try {
    host.configure({ maxActive: 1, queueLimit: 2 });
    const first = host.trigger('test');
    const params = { nested: { count: 3 } };
    const second = host.trigger('test', params);
    params.nested.count = 99;
    const third = host.trigger('test');
    assert.equal(second.status, 'queued');
    assert.equal(host.trigger('test').reason, 'capacity');
    assert.equal(host.stop(third.id), true);
    host.stop(first.id);
    assert.equal(instances[1].params.nested.count, 3);
    assert.equal(host.active.has(second.id), true);
    instances[1].context.complete();
    instances[1].context.complete();
    assert.equal(instances[1].destroyCount, 1);
    assert.equal(host.active.size, 0);
  } finally { host.destroy(); }
});
test('overlap/ignore、設定変更、停止後の再開、破棄後の拒否', () => {
  const { host } = setup();
  host.configure({ policy: 'overlap', maxActive: 2 });
  host.trigger('test'); host.trigger('test');
  assert.equal(host.trigger('test').status, 'rejected');
  host.configure({ policy: 'ignore', maxActive: 4 });
  assert.equal(host.trigger('test').reason, 'busy');
  host.stopAll();
  host.configure({ queueLimit: 3 });
  host.trigger('test'); host.trigger('test'); host.trigger('test');
  host.configure({ queueLimit: 1 });
  assert.equal(host.queue.length, 1);
  host.configure({ enabled: false });
  assert.equal(host.queue.length, 0); assert.equal(host.active.size, 0);
  assert.equal(host.trigger('test').reason, 'disabled');
  host.configure({}); assert.equal(host.trigger('test').status, 'started');
  host.destroy(); assert.equal(host.trigger('test').reason, 'disabled');
});
test('stopAllは待機を開始せず、DOM/タイマー/アニメーション/待機Promiseを破棄', async () => {
  const { host, instances, elements } = setup();
  host.trigger('test'); host.trigger('test');
  const ctx = instances[0].context;
  let called = false, cancelled = false, cleaned = false;
  ctx.timers.setTimeout(() => { called = true; }, 10);
  ctx.animations.animate({ animate: () => ({ cancel() { cancelled = true; } }) }, [], {});
  ctx.addCleanup(() => { cleaned = true; });
  const waiting = ctx.timers.wait(1000);
  host.stopAll();
  assert.equal(await waiting, false);
  await sleep(20);
  assert.equal(instances.length, 1); assert.equal(called, false);
  assert.equal(cancelled, true); assert.equal(cleaned, true);
  assert.equal(elements.every(e => e.removed), true);
  host.destroy();
});
test('即時終了、開始例外、Promise拒否、破棄例外でも実行枠を解放', async () => {
  const { host, api, Effect } = setup();
  class Immediate extends Effect { start() { this.context.complete(); } }
  class Broken extends Effect { start() { throw new Error('試験'); } destroy() { throw new Error('試験'); } }
  class AsyncBroken extends Effect { async start() { throw new Error('試験'); } }
  api.registry.register('immediate', Immediate); api.registry.register('broken', Broken); api.registry.register('async', AsyncBroken);
  host.trigger('immediate'); assert.equal(host.active.size, 0);
  assert.equal(host.trigger('broken').reason, 'execution-error');
  host.trigger('async'); await sleep(0); assert.equal(host.active.size, 0);
  host.destroy();
});
test('終了通知漏れにも上限時間が働き、待機を消化する', async () => {
  const { host, instances } = setup(20);
  host.trigger('test'); host.trigger('test');
  await sleep(75);
  assert.equal(instances.length, 2); assert.equal(host.active.size, 0);
  assert.equal(instances.every(i => i.destroyCount === 1), true);
  host.destroy();
});
test('登録検証と素材境界、画像待ちは停止時に解決する', async () => {
  const { api, Effect, host, instances } = setup();
  assert.throws(() => api.registry.register('../bad', Effect));
  assert.throws(() => api.registry.register('test', Effect));
  assert.throws(() => api.registry.register('bad', class {}));
  host.trigger('test');
  const ctx = instances[0].context;
  for (const value of ['../image.png', '%2e%2e/a', 'https://a', '/a', 'a\\b']) assert.throws(() => ctx.assets.url(value));
  assert.equal(ctx.assets.url('assets/a.png'), './effects/test/assets/a.png');
  const image = new EventTarget(); image.complete = false;
  const ready = ctx.assets.ready(image);
  host.destroy(); assert.equal(await ready, false);
});
