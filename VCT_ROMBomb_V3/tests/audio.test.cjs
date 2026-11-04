const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/rom_audio.js');

function fixture(state = 'running', createMedia) {
  const sources = [], gains = [], buffers = [];
  let context;
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect(target) { return target; }, disconnect() { this.disconnected = true; } });
  class Context {
    constructor() { context = this; this.state = state; this.currentTime = 0; this.sampleRate = 48000; this.destination = node(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createBuffer(_, length) { const samples = new Float32Array(length); buffers.push(samples); return { getChannelData: () => samples }; }
    createBufferSource() { const source = { ...node(), start(at) { this.started = at; }, stop(at) { this.stopped = at; } }; sources.push(source); return source; }
    createOscillator() { const source = this.createBufferSource(); source.frequency = parameter(); return source; }
    createBiquadFilter() { return { ...node(), frequency: parameter() }; }
    createGain() { const gain = { ...node(), gain: parameter() }; gains.push(gain); return gain; }
  }
  const messages = [];
  const audio = create(Context, message => messages.push(message), createMedia);
  return { audio, sources, gains, buffers, messages, get context() { return context; } };
}

test('無音ではContextを作らず、同時・連続爆発を400msに一発へまとめる', async () => {
  const f = fixture();
  assert.equal(f.audio.play(0), false);
  assert.equal(f.context, undefined);
  assert.equal(await f.audio.unlock(), true);
  for (let i = 0; i < 30; i++) f.audio.play(30);
  assert.equal(f.sources.length, 2);
  assert.equal(f.buffers[0].length, Math.ceil(48000 * .28));
  assert.ok(f.buffers[0].some(sample => sample !== 0));
  assert.equal(f.gains[2].gain.value, .3 * .65);
  f.context.currentTime = .399;
  assert.equal(f.audio.play(100), false);
  f.context.currentTime = .4;
  assert.equal(f.audio.play(100), true);
  f.audio.stop();
  assert.ok(f.sources.every(source => source.disconnected));
  f.audio.dispose();
  assert.equal(f.context.state, 'closed');
  assert.equal(f.audio.play(30), false);
});

test('MP3の音量・再生中の重複抑止・終了後の再生・停止を共通制御する', async () => {
  const media = [];
  const f = fixture('running', url => {
    const item = { url, play() { return Promise.resolve(); }, pause() { this.paused = true; }, removeAttribute() { this.removed = true; }, load() {} };
    media.push(item); return item;
  });
  await f.audio.unlock();
  assert.equal(f.audio.play(17, 'mp3'), true);
  await Promise.resolve();
  assert.equal(media[0].volume, .17);
  assert.match(media[0].url, /Explosion Sound\.mp3$/);
  f.context.currentTime = 2;
  assert.equal(f.audio.play(17, 'mp3'), false);
  assert.equal(f.audio.play(17, 'synth'), false);
  assert.equal(media.length, 1);
  media[0].onended();
  assert.equal(f.audio.play(30, 'mp3'), true);
  f.audio.stop();
  await Promise.resolve();
  assert.ok(media.every(item => item.paused && item.removed));
  f.audio.dispose();
});

test('MP3再生の拒否・読込失敗・開始待ちの取消を処理する', async () => {
  let media, resolvePlay;
  const f = fixture('running', () => {
    media = { play() { return Promise.reject(new Error('blocked')); }, pause() { this.paused = true; }, removeAttribute() {}, load() {} };
    return media;
  });
  await f.audio.unlock();
  f.audio.play(30, 'mp3');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(media.paused);
  assert.match(f.messages.at(-1), /再生できません/);
  f.audio.stop();
  f.audio.play(30, 'mp3');
  media.onerror();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(f.messages.at(-1), /読み込めません/);
  f.audio.dispose();
  // 保留Promiseが取消後に成功しても鳴らし直さない。
  const pending = fixture('running', () => ({ play: () => new Promise(resolve => { resolvePlay = resolve; }), pause() { this.paused = true; }, removeAttribute() {}, load() {} }));
  await pending.audio.unlock();
  pending.audio.play(30, 'mp3');
  pending.audio.stop();
  resolvePlay();
  await Promise.resolve();
  assert.equal(pending.messages.length, 0);
  pending.audio.dispose();
});

test('制限中の爆発は遅延再生せず、操作後の試聴で再生できる', async () => {
  const f = fixture('suspended');
  assert.equal(f.audio.play(30), false);
  await Promise.resolve();
  assert.equal(f.sources.length, 0);
  assert.equal(await f.audio.unlock(), true);
  assert.equal(f.audio.play(30), true);
  f.audio.dispose();
});

test('再開失敗・非対応時は例外を漏らさず通知する', async () => {
  const f = fixture('suspended');
  await f.audio.unlock();
  f.context.state = 'suspended';
  f.context.resume = () => Promise.reject(new Error('blocked'));
  assert.equal(await f.audio.unlock(), false);
  assert.equal(f.sources.length, 0);
  assert.match(f.messages.at(-1), /試聴/);
  f.audio.dispose();
  const messages = [];
  assert.equal(await create(undefined, message => messages.push(message)).unlock(), false);
  assert.equal(messages.length, 1);
});
