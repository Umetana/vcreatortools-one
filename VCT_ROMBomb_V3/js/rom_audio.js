// MIT Copyright (c) 2026 Umetana
(function (root) {
  'use strict';
  function create(AudioContextClass, report = () => {}) {
    let context = null;
    let disposed = false;
    let lastStart = -Infinity;
    let unlocking = null;
    const voices = new Set();
    const blocked = () => { if (!disposed) report('音声を開始できません。「爆発音を試聴」を操作してください。'); };
    function getContext() {
      if (disposed || !AudioContextClass) return null;
      if (!context) context = new AudioContextClass();
      return context;
    }
    async function prepare() {
      try {
        const ctx = getContext();
        if (!ctx) { blocked(); return false; }
        if (ctx.state !== 'running') {
          // 自動再生制限でresumeが保留されても、後から音を再生しない。
          let timeout;
          try { await Promise.race([ctx.resume(), new Promise(resolve => { timeout = setTimeout(resolve, 1000); })]); }
          finally { clearTimeout(timeout); }
        }
        if (disposed || ctx.state !== 'running') { if (!disposed) blocked(); return false; }
        return true;
      } catch (_) { blocked(); return false; }
    }
    function unlock() {
      if (!unlocking) unlocking = prepare().finally(() => { unlocking = null; });
      return unlocking;
    }
    function stop() {
      for (const voice of voices) voice.finish();
      lastStart = -Infinity;
    }
    function play(volume) {
      const level = Math.min(100, Math.max(0, Number(volume) || 0)) / 100;
      if (disposed || !level) return false;
      let voice;
      try {
        const ctx = getContext();
        if (!ctx || ctx.state !== 'running') { void unlock(); return false; }
        const now = ctx.currentTime;
        // 連続・同時爆発は一発にまとめ、音量の積み重なりを防ぐ。
        if (now - lastStart < .4) return false;
        const noise = ctx.createBufferSource();
        const tone = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();
        const toneGain = ctx.createGain();
        const output = ctx.createGain();
        const nodes = [noise, tone, filter, noiseGain, toneGain, output];
        let finished = false;
        voice = { finish() {
          if (finished) return;
          finished = true;
          for (const source of [noise, tone]) { try { source.stop(); } catch (_) {} }
          for (const node of nodes) node.disconnect();
          voices.delete(voice);
        } };
        voices.add(voice);
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .28), ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + .27);
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(.55, now + .008);
        noiseGain.gain.exponentialRampToValueAtTime(.001, now + .27);
        tone.type = 'sine';
        tone.frequency.setValueAtTime(145, now);
        tone.frequency.exponentialRampToValueAtTime(42, now + .22);
        toneGain.gain.setValueAtTime(0, now);
        toneGain.gain.linearRampToValueAtTime(.45, now + .008);
        toneGain.gain.exponentialRampToValueAtTime(.001, now + .27);
        output.gain.value = level * .65;
        noise.connect(filter).connect(noiseGain).connect(output);
        tone.connect(toneGain).connect(output);
        output.connect(ctx.destination);
        tone.onended = () => voice.finish();
        noise.start(now); tone.start(now);
        noise.stop(now + .28); tone.stop(now + .28);
        lastStart = now;
        report('爆発音を再生しました。');
        return true;
      } catch (_) {
        voice?.finish();
        report('この環境では効果音を再生できません。');
        return false;
      }
    }
    function dispose() {
      disposed = true;
      stop();
      if (context) void context.close().catch(() => {});
    }
    return Object.freeze({ unlock, play, stop, dispose });
  }
  if (typeof module === 'object' && module.exports) module.exports = { create };
  else root.RomBombAudio = Object.freeze({ create });
})(typeof window === 'object' ? window : globalThis);
