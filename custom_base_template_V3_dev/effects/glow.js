// MIT Copyright (c) 2026 Umetana
// 最小例。DOMは本体から渡された描画先だけに追加する。
window.VCT_EFFECT = {
  apiVersion: 1,
  id: 'glow',
  title: '枠の発光',
  material: { emoji: '✨' },
  defaults: { FX_GLOW_COLOR: '#ffd700', FX_GLOW_SIZE: 12 },
  fields: {
    FX_GLOW_COLOR: { type: 'color', label: '発光色' },
    FX_GLOW_SIZE: { type: 'number', label: '発光の広がり (0～60px)' }
  },
  mount({ root, settings, createMaterial }) {
    const frame = document.createElement('div');
    Object.assign(frame.style, { position: 'absolute', inset: '0', borderRadius: '12px', pointerEvents: 'none' });
    root.append(frame);
    const material = createMaterial(settings);
    Object.assign(material.element.style, { position:'absolute', right:'8px', top:'4px' });
    root.append(material.element);
    const update = (next) => {
      material.update(next);
      const color = /^#[0-9a-f]{6}$/i.test(next.FX_GLOW_COLOR) ? next.FX_GLOW_COLOR : '#ffd700';
      const size = Math.max(0, Math.min(60, Number(next.FX_GLOW_SIZE) || 0));
      frame.style.boxShadow = `0 0 ${size}px ${color}, inset 0 0 ${size / 2}px ${color}`;
    };
    update(settings);
    const animation = frame.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 900, direction: 'alternate', iterations: Infinity });
    const materialAnimation = material.element.animate([{ transform:'scale(.85)', opacity:.6 }, { transform:'scale(1)', opacity:1 }], { duration:900, direction:'alternate', iterations:Infinity });
    return { update, destroy() { animation.cancel(); materialAnimation.cancel(); material.destroy(); frame.remove(); } };
  }
};
