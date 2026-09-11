// StageFX向けの最小エフェクト実行基盤。
// 汎用OBS Screen Effect V2のPlugin境界を保ちつつ、コメントテンプレート内で完結させる。
(function () {
  'use strict';

  class StageEffectHost {
    constructor(options = {}) {
      this.container = options.container;
      this.backdrop = options.backdrop;
      this.policy = 'queue';
      this.maxActive = 1;
      this.queueLimit = 6;
      this.active = new Set();
      this.queue = [];
      this.disposed = false;
    }

    configure(options = {}) {
      const policy = String(options.policy || 'queue').toLowerCase();
      this.policy = ['queue', 'overlap', 'ignore'].includes(policy) ? policy : 'queue';
      this.maxActive = this.clampInt(options.maxActive, 1, 4, 1);
      this.queueLimit = this.clampInt(options.queueLimit, 0, 20, 6);
    }

    trigger(effectId, params = {}) {
      if (this.disposed || !this.container) return false;
      const EffectClass = window.REGISTERED_EFFECTS?.[effectId];
      if (typeof EffectClass !== 'function') return false;

      if (this.policy === 'ignore' && this.active.size > 0) return false;
      if (this.active.size >= this.maxActive) {
        if (this.policy !== 'queue' || this.queue.length >= this.queueLimit) return false;
        this.queue.push({ effectId, params: { ...params } });
        return true;
      }

      this.start(effectId, EffectClass, params);
      return true;
    }

    start(effectId, EffectClass, params) {
      let instance = null;
      let context = null;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        try { instance?.destroy?.(); } catch (error) { console.warn('[StageEffectHost] destroy failed.', error); }
        context?.dispose();
        this.active.delete(record);
        this.updateBackdrop();
        this.drain();
      };
      const record = {
        effectId,
        finish,
        bgOpacity: Math.max(0, Math.min(0.7, Number(params.bgOpacity) || 0))
      };

      try {
        context = new window.EffectContext({ effectId, container: this.container, onComplete: finish });
        instance = new EffectClass(context, { ...params });
        this.active.add(record);
        this.updateBackdrop();
        Promise.resolve(instance.start()).catch((error) => {
          console.error(`[StageEffectHost:${effectId}] start failed.`, error);
          finish();
        });

        const lifecycleOwner = EffectClass.manifest?.runtime?.lifecycleOwner || 'host';
        if (lifecycleOwner === 'host') {
          context.timers.setTimeout(finish, Math.max(100, Number(params.duration) || 3000));
        }
      } catch (error) {
        console.error(`[StageEffectHost:${effectId}] execution failed.`, error);
        finish();
      }
    }

    drain() {
      if (this.disposed || this.queue.length === 0 || this.active.size >= this.maxActive) return;
      const next = this.queue.shift();
      const EffectClass = window.REGISTERED_EFFECTS?.[next.effectId];
      if (typeof EffectClass === 'function') this.start(next.effectId, EffectClass, next.params);
      if (this.active.size < this.maxActive) this.drain();
    }

    updateBackdrop() {
      if (!this.backdrop) return;
      if (this.active.size === 0) {
        this.backdrop.style.opacity = '0';
        return;
      }
      const alpha = Math.max(0, ...[...this.active].map((record) => record.bgOpacity));
      this.backdrop.style.background = `rgba(0, 0, 0, ${alpha})`;
      this.backdrop.style.opacity = alpha > 0 ? '1' : '0';
    }

    destroyAll() {
      this.queue.length = 0;
      [...this.active].forEach((record) => record.finish());
      this.active.clear();
      this.updateBackdrop();
    }

    destroy() {
      this.disposed = true;
      this.destroyAll();
      this.container = null;
      this.backdrop = null;
    }

    clampInt(value, min, max, fallback) {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
    }
  }

  window.StageEffectHost = StageEffectHost;
})();
