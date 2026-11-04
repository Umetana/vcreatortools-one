// StageFX / OBS Screen EffectのContextを基に、破棄・素材待ち・論理座標を整理。
(function () {
  'use strict';
  class EffectContext {
    constructor({ effectId, container, size, onComplete }) {
      this.effectId = effectId;
      this.size = size;
      this.onComplete = onComplete;
      this.controller = new AbortController();
      this.signal = this.controller.signal;
      this.disposed = false;
      this.timerIds = new Set();
      this.paused = false;
      this.handles = new Set();
      this.cleanups = new Set();
      this.root = document.createElement('div');
      this.root.className = 'stage-effect';
      this.root.dataset.effectId = effectId;
      container.appendChild(this.root);
      this.timers = {
        setTimeout: (callback, delay) => this.setTimeout(callback, delay),
        clearTimeout: id => this.clearTimeout(id), wait: delay => this.wait(delay)
      };
      this.animations = { animate: (element, frames, options) => this.animate(element, frames, options) };
      this.assets = { url: path => this.assetUrl(path), ready: image => this.imageReady(image) };
      this.logger = { warn: (...args) => console.warn(`[演出:${effectId}]`, ...args), error: (...args) => console.error(`[演出:${effectId}]`, ...args) };
    }
    addCleanup(callback) {
      if (this.disposed) callback(); else this.cleanups.add(callback);
      return () => this.cleanups.delete(callback);
    }
    setTimeout(callback, delay) {
      if (this.disposed) return null;
      const id = { remaining: Math.max(0, Number(delay) || 0), callback };
      this.timerIds.add(id);
      if (!this.paused) this.armTimer(id);
      return id;
    }
    armTimer(id) {
      id.started = Date.now();
      id.handle = setTimeout(() => {
        this.timerIds.delete(id);
        if (this.disposed) return;
        try { id.callback(); } catch (error) { this.logger.error(error); this.complete(); }
      }, id.remaining);
    }
    clearTimeout(id) { if (id) clearTimeout(id.handle); this.timerIds.delete(id); }
    wait(delay) {
      if (this.disposed) return Promise.resolve(false);
      return new Promise(resolve => {
        const finish = ok => { this.signal.removeEventListener('abort', abort); this.clearTimeout(id); resolve(ok); };
        const abort = () => finish(false);
        const id = this.setTimeout(() => finish(true), delay);
        this.signal.addEventListener('abort', abort, { once: true });
      });
    }
    animate(element, frames, options) {
      if (this.disposed) return null;
      const animation = element.animate(frames, options);
      this.handles.add(animation);
      if (this.paused) { animation.pause(); animation.stagePaused = true; }
      // fill状態を含め終了時にcancelするため、Host終了まで所有する。
      return animation;
    }
    assetUrl(path) {
      if (typeof path !== 'string' || !path || path.includes('\\') || /[?#:%]/.test(path) || path.startsWith('/') || path.split('/').some(p => p === '..' || p === '.')) {
        throw new Error('素材はPluginフォルダ内の相対パスで指定してください');
      }
      return `./effects/${this.effectId}/${path}`;
    }
    imageReady(image) {
      if (this.disposed) return Promise.resolve(false);
      if (image.complete) return Promise.resolve(image.naturalWidth > 0);
      return new Promise(resolve => {
        const finish = ok => {
          image.removeEventListener('load', load); image.removeEventListener('error', fail);
          this.signal.removeEventListener('abort', fail); resolve(ok);
        };
        const load = () => finish(!this.disposed && image.naturalWidth > 0);
        const fail = () => finish(false);
        image.addEventListener('load', load, { once: true });
        image.addEventListener('error', fail, { once: true });
        this.signal.addEventListener('abort', fail, { once: true });
      });
    }
    complete() { if (!this.disposed) this.onComplete(); }
    setPaused(paused) {
      if (this.disposed || this.paused === paused) return;
      this.paused = paused;
      this.root.classList?.toggle('stage-effect-paused', paused);
      for (const timer of this.timerIds) {
        if (paused) { clearTimeout(timer.handle); timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.started)); }
        else this.armTimer(timer);
      }
      for (const handle of this.handles) {
        if (paused && handle.playState !== 'finished') { handle.pause(); handle.stagePaused = true; }
        else if (!paused && handle.stagePaused) { handle.play(); handle.stagePaused = false; }
      }
    }
    place(placement = {}) {
      const number = window.VCTStage.number;
      this.size = { width: number(placement.width, 40, 1920, 1920), height: number(placement.height, 40, 1080, 1080) };
      Object.assign(this.root.style, {
        inset: 'auto', left: `${number(placement.x, 0, 1920, 0)}px`, top: `${number(placement.y, 0, 1080, 0)}px`,
        width: `${this.size.width}px`, height: `${this.size.height}px`,
        transformOrigin: 'top left', transform: `scale(${number(placement.scale, .1, 3, 1)})`
      });
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.controller.abort();
      this.timerIds.forEach(id => clearTimeout(id.handle)); this.timerIds.clear();
      this.handles.forEach(handle => { try { handle.cancel(); } catch (error) { this.logger.warn(error); } }); this.handles.clear();
      this.cleanups.forEach(callback => { try { callback(); } catch (error) { this.logger.warn(error); } }); this.cleanups.clear();
      this.root.remove();
    }
  }
  window.VCTStage.EffectContext = EffectContext;
})();
