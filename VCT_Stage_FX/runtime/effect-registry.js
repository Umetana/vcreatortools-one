// 明示的に読み込まれた同梱Pluginだけを登録する。
(function () {
  'use strict';
  class EffectRegistry {
    constructor() { this.effects = new Map(); }
    register(id, EffectClass) {
      const script = typeof document !== 'undefined' ? document.currentScript : null;
      if (!script?.dataset.effectId) return this.validateAndRegister(id, EffectClass);
      if (script.dataset.expired === 'true') return;
      try {
        if (script.dataset.effectId !== id) throw new Error('フォルダ名と登録IDが一致しません');
        this.validateAndRegister(id, EffectClass);
      } catch (error) { script.effectError = error; }
    }
    validateAndRegister(id, EffectClass) {
      if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(id) || this.effects.has(id)) throw new Error('演出IDが不正または重複しています');
      const manifest = EffectClass?.manifest;
      if (typeof EffectClass !== 'function' || manifest?.stageApi !== 1 || typeof manifest.name !== 'string' || !manifest.name.trim() ||
          !['host', 'effect'].includes(manifest.lifecycle) || typeof EffectClass.prototype.start !== 'function' || typeof EffectClass.prototype.destroy !== 'function') {
        throw new Error(`演出契約が不正です: ${id}`);
      }
      this.effects.set(id, EffectClass);
    }
    get(id) { return this.effects.get(id); }
  }
  window.VCTStage.EffectRegistry = EffectRegistry;
  window.VCTStage.registry = new EffectRegistry();
})();
