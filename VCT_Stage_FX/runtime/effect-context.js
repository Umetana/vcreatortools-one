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
      const id = setTimeout(() => {
        this.timerIds.delete(id);
        if (this.disposed) return;
        try { callback(); } catch (error) { this.logger.error(error); this.complete(); }
      }, delay);
      this.timerIds.add(id);
      return id;
    }
    clearTimeout(id) { clearTimeout(id); this.timerIds.delete(id); }
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
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.controller.abort();
      this.timerIds.forEach(id => clearTimeout(id)); this.timerIds.clear();
      this.handles.forEach(handle => { try { handle.cancel(); } catch (error) { this.logger.warn(error); } }); this.handles.clear();
      this.cleanups.forEach(callback => { try { callback(); } catch (error) { this.logger.warn(error); } }); this.cleanups.clear();
      this.root.remove();
    }
  }
  window.VCTStage.EffectContext = EffectContext;
})();
