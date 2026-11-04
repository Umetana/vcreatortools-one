// 要素を固定数だけ再利用する常設の雪。外部素材・独自タイマーは使わない。
(function () {
  'use strict';
  class ChristmasSnow {
    static manifest = { stageApi: 1, name: 'クリスマスの雪', lifecycle: 'persistent', usesCommonCount: false };
    constructor(context, params) { this.context = context; this.params = params; this.intensity = null; }
    start() { this.context.root.classList.add('fx-christmas-snow'); this.update(this.params); }
    update(params) {
      this.params = params;
      if (this.intensity === params.intensity) return;
      this.intensity = params.intensity;
      const count = ({ small: 24, standard: 42, large: 66, extra: 96 })[params.intensity] || 42;
      const flakes = [];
      for (let i = 0; i < count; i++) {
        const flake = document.createElement('i');
        const duration = 14 + i * 7 % 13;
        Object.assign(flake.style, {
          left: `${2 + (i * 61.8034 % 96)}%`, width: `${3 + i % 4}px`, height: `${3 + i % 4}px`,
          opacity: String(.3 + i % 5 * .1), animationDuration: `${duration}s`,
          animationDelay: `${-(i * 3.71 % duration)}s`
        });
        flakes.push(flake);
      }
      this.context.root.replaceChildren(...flakes);
    }
    destroy() { this.context.root.replaceChildren(); }
  }
  window.VCTStage.registry.register('christmas_snow', ChristmasSnow);
})();
