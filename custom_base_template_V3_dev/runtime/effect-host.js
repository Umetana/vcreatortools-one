// MIT Copyright (c) 2026 Umetana
(function () {
  'use strict';
  const instances = new Map();
  function stop(element) {
    const state = instances.get(element);
    if (!state) return;
    instances.delete(element);
    try { state.instance?.destroy(); } catch (error) { console.error('演出の終了に失敗', error); }
    state.root.remove();
  }
  function sync(element, binding) {
    const { comment, settings } = binding.value;
    const effect = window.VCT_EFFECT;
    const eligible = settings.EFFECT_ENABLED !== false && (comment.isSupport || comment.isMembership);
    if (!eligible || effect?.apiVersion !== 1) { stop(element); return; }
    const keys = Object.keys({ ...(effect.material ? window.VCT_MATERIAL.defaults : {}), ...effect.defaults });
    const values = Object.fromEntries(keys.map(key => [key, settings[key]]));
    const signature = JSON.stringify(values);
    const current = instances.get(element);
    if (current) {
      if (current.signature === signature) return;
      try { current.instance.update(values); current.signature = signature; } catch (error) { console.error('演出更新に失敗', error); stop(element); }
      return;
    }
    const root = document.createElement('div');
    root.className = 'effect-root';
    element.append(root);
    const state = { root, signature };
    instances.set(element, state);
    try {
      state.instance = effect.mount({ root, settings: values, createMaterial: effect.material ? (initial = values) => window.VCT_MATERIAL.create(initial, effect.material.emoji || '✨') : undefined, comment: Object.freeze({ isSupport: !!comment.isSupport, isMembership: !!comment.isMembership }) });
      if (typeof state.instance?.update !== 'function' || typeof state.instance?.destroy !== 'function') throw new Error('演出契約違反');
    } catch (error) { console.error('演出の開始に失敗', error); stop(element); }
  }
  window.VCT_EFFECT_DIRECTIVE = { mounted: sync, updated: sync, beforeUnmount: stop };
  window.addEventListener('pagehide', () => [...instances.keys()].forEach(stop));
})();
