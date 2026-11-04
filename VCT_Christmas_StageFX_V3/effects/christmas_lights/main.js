// 吊り下げ電飾。CSS描画なので生成素材なしでも同じ表示を使用する。
(function () {
  'use strict';
  class ChristmasLights {
    static manifest = { stageApi: 1, name: 'クリスマスのイルミネーション', lifecycle: 'persistent', usesCommonCount: false,
      settings: { CHRISTMAS_LIGHTS_COLOR: { type: 'select', label: '電飾の色', default: 'warm', options: ['warm', 'colorful'], labels: { warm: '暖かな金色', colorful: 'クリスマスカラー' } } } };
    constructor(context, params) { this.context = context; this.params = params; this.signature = ''; }
    start() { this.context.root.classList.add('fx-christmas-lights'); this.update(this.params); }
    update(params) {
      this.params = params;
      const colorful = params.settings?.CHRISTMAS_LIGHTS_COLOR === 'colorful';
      const signature = `${params.intensity}:${colorful}`;
      if (signature === this.signature) return;
      this.signature = signature;
      const count = ({ small: 12, standard: 18, large: 24, extra: 30 })[params.intensity] || 18;
      const wire = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      wire.setAttribute('viewBox', '0 0 100 100'); wire.setAttribute('preserveAspectRatio', 'none');
      wire.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(wire.namespaceURI, 'path');
      path.setAttribute('d', 'M 0 12 Q 50 92 100 12'); wire.append(path);
      const bulbs = [];
      for (let i = 0; i < count; i++) {
        const t = (i + .5) / count, bulb = document.createElement('i');
        const color = colorful ? ['#ff7970', '#ffd66c', '#82dca1', '#9ecfff'][i % 4] : '#ffe1a0';
        Object.assign(bulb.style, { left: `${t * 100}%`, top: `${12 + 160 * t * (1 - t)}%`, animationDelay: `${i % 7 * -.63}s` });
        bulb.style.setProperty('--bulb-color', color); bulbs.push(bulb);
      }
      this.context.root.replaceChildren(wire, ...bulbs);
    }
    destroy() { this.context.root.replaceChildren(); }
  }
  window.VCTStage.registry.register('christmas_lights', ChristmasLights);
})();
