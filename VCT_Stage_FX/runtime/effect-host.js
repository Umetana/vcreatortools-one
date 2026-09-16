// 実行枠、待機、終了理由をHostが一元管理する。
(function () {
  'use strict';
  const api = window.VCTStage;
  class EffectHost {
    constructor({ container, backdrop, registry = api.registry, size = { width: 1920, height: 1080 }, maxRuntimeMs = 15000 }) {
      Object.assign(this, { container, backdrop, registry, size });
      this.maxRuntimeMs = api.number(maxRuntimeMs, 10, 15000, 15000);
      this.active = new Map(); this.queue = []; this.serial = 0;
      this.disposed = false; this.stopping = false; this.draining = false;
      this.configure({});
    }
    configure({ policy = 'queue', maxActive = 1, queueLimit = 6, enabled = true } = {}) {
      this.policy = ['queue', 'overlap', 'ignore'].includes(policy) ? policy : 'queue';
      this.maxActive = Math.floor(api.number(maxActive, 1, 4, 1));
      this.queueLimit = Math.floor(api.number(queueLimit, 0, 20, 6));
      this.enabled = enabled;
      if (!enabled) { this.stopAll(); return; }
      if (this.policy !== 'queue') this.queue.length = 0;
      else this.queue.splice(this.queueLimit);
      this.drain();
    }
    trigger(effectId, params = {}) {
      const reject = reason => ({ status: 'rejected', reason });
      if (this.disposed || this.stopping || !this.enabled) return reject('disabled');
      if (!this.registry.get(effectId)) return reject('unknown-effect');
      if (this.policy === 'ignore' && this.active.size) return reject('busy');
      let snapshot;
      try { snapshot = JSON.parse(JSON.stringify(params)); } catch { return reject('invalid-params'); }
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return reject('invalid-params');
      const record = { id: `run-${++this.serial}`, effectId, params: snapshot, finished: false };
      if (this.active.size >= this.maxActive) {
        if (this.policy !== 'queue' || this.queue.length >= this.queueLimit) return reject('capacity');
        this.queue.push(record);
        return { status: 'queued', id: record.id };
      }
      const ok = this.start(record);
      return ok ? { status: 'started', id: record.id } : reject('execution-error');
    }
    start(record) {
      const EffectClass = this.registry.get(record.effectId);
      this.active.set(record.id, record);
      try {
        record.context = new api.EffectContext({ effectId: record.effectId, container: this.container, size: this.size, onComplete: () => this.finish(record) });
        record.instance = new EffectClass(record.context, record.params);
        const duration = api.number(record.params.duration, 100, 10000, 3000);
        record.context.timers.setTimeout(() => this.finish(record), EffectClass.manifest.lifecycle === 'host' ? Math.min(duration, this.maxRuntimeMs) : this.maxRuntimeMs);
        this.updateBackdrop();
        Promise.resolve(record.instance.start()).catch(error => {
          if (!record.finished) { console.error('[Stage] 演出の開始に失敗', error); this.finish(record); }
        });
        return true;
      } catch (error) {
        console.error('[Stage] 演出の実行に失敗', error); this.finish(record); return false;
      }
    }
    finish(record) {
      if (record.finished) return;
      record.finished = true;
      try { record.instance?.destroy(); } catch (error) { console.warn('[Stage] 演出の破棄に失敗', error); }
      finally {
        record.context?.dispose(); this.active.delete(record.id); this.updateBackdrop(); this.drain();
      }
    }
    drain() {
      if (this.draining || this.stopping || this.disposed || !this.enabled) return;
      this.draining = true;
      try { while (this.queue.length && this.active.size < this.maxActive) this.start(this.queue.shift()); }
      finally { this.draining = false; }
    }
    stop(id) {
      const record = this.active.get(id);
      if (record) { this.finish(record); return true; }
      const index = this.queue.findIndex(item => item.id === id);
      if (index < 0) return false;
      this.queue.splice(index, 1); return true;
    }
    stopAll() {
      this.stopping = true; this.queue.length = 0;
      try { [...this.active.values()].forEach(record => this.finish(record)); }
      finally { this.stopping = false; this.updateBackdrop(); }
    }
    updateBackdrop() {
      if (!this.backdrop) return;
      const opacity = Math.max(0, ...[...this.active.values()].map(record => api.number(record.params.bgOpacity, 0, .7, 0)));
      this.backdrop.style.opacity = String(opacity);
    }
    destroy() { this.disposed = true; this.stopAll(); }
  }
  api.EffectHost = EffectHost;
})();
