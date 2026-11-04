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
          !['host', 'effect', 'persistent'].includes(manifest.lifecycle) || typeof EffectClass.prototype.start !== 'function' || typeof EffectClass.prototype.destroy !== 'function' ||
          (manifest.lifecycle === 'persistent' && typeof EffectClass.prototype.update !== 'function')) {
        throw new Error(`演出契約が不正です: ${id}`);
      }
      this.effects.set(id, EffectClass);
    }
    get(id) { return this.effects.get(id); }
  }
  window.VCTStage.EffectRegistry = EffectRegistry;
  window.VCTStage.registry = new EffectRegistry();
  // IDをそのまま使い、大文字小文字やハイフンが異なるPluginの保存先を分離する。
  window.VCTStage.effectKey = (id, name) => `STAGE_PLUGIN_${id}_${name}`;
  window.VCTStage.effectFields = (id, Effect) => {
    const field = (type, label, value, extra = {}) => ({ type, label, default: value, ...extra });
    const fields = {
      ENABLED: field('checkbox', Effect.manifest.lifecycle === 'persistent' ? '常設表示を有効にする' : 'この演出を有効にする', Effect.manifest.lifecycle !== 'persistent'),
      X: field('range-number', '演出のX位置', 0, { min: 0, max: 1920, step: 5, numberStep: 1 }),
      Y: field('range-number', '演出のY位置', 0, { min: 0, max: 1080, step: 5, numberStep: 1 }),
      WIDTH: field('range-number', '演出領域の幅', 1920, { min: 40, max: 1920, step: 5, numberStep: 1 }),
      HEIGHT: field('range-number', '演出領域の高さ', 1080, { min: 40, max: 1080, step: 5, numberStep: 1 }),
      SCALE: field('range-number', '演出全体の倍率', 1, { min: .1, max: 3, step: .05, numberStep: .01 }),
      INTENSITY: field('select', 'この演出の強度', 'inherit', { options: ['inherit', 'small', 'standard', 'large', 'extra'], labels: { inherit: '共通設定を使用', small: '弱', standard: '標準', large: '強', extra: '最大' } })
    };
    return { ...Object.fromEntries(Object.entries(fields).map(([name, value]) => [window.VCTStage.effectKey(id, name), value])), ...Effect.manifest.settings };
  };
})();
