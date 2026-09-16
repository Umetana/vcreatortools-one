// 素材不要の制作ひな形。色付きの輪を表示し、時間管理をHostへ任せる。
(function () {
  class SampleEffect {
    static manifest = { stageApi: 1, name: 'サークル', lifecycle: 'host' };
    constructor(context, params) { this.context = context; this.params = params; }
    start() {
      this.context.root.classList.add('fx-sample-root');
      const factor = ({ small: .6, standard: 1, large: 1.45, extra: 2 })[this.params.intensity] || 1;
      const count = Math.round(window.VCTStage.number(Number(this.params.count || 18) * factor, 1, 60, 18));
      const duration = window.VCTStage.number(this.params.duration, 100, 10000, 3000);
      for (let i = 0; i < count; i++) {
        const ring = document.createElement('span');
        ring.className = 'fx-sample-ring';
        ring.style.left = `${80 + Math.random() * (this.context.size.width - 160)}px`;
        ring.style.top = `${80 + Math.random() * (this.context.size.height - 160)}px`;
        ring.style.borderColor = `hsl(${170 + Math.random() * 80} 80% 75%)`;
        this.context.root.appendChild(ring);
        this.context.animations.animate(ring, [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' },
          { offset: .2, opacity: .8 },
          { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5)' }
        ], { duration: duration * .7, delay: i / count * duration * .25, fill: 'both', easing: 'ease-out' });
      }
    }
    destroy() { /* DOM、タイマー、アニメーションはContextが破棄する。 */ }
  }
  window.VCTStage.registry.register('sample_effect', SampleEffect);
})();
