// ステージの論理座標と配置先を管理する。表示内容はウィジェットが所有する。
(function () {
  'use strict';
  const api = window.VCTStage = window.VCTStage || {};
  const number = (value, min, max, fallback) => Number.isFinite(Number(value))
    ? Math.min(max, Math.max(min, Number(value))) : fallback;
  api.number = number;
  class StageLayout {
    constructor(element) {
      this.element = element;
      this.size = Object.freeze({ width: 1920, height: 1080 });
      this.regions = new Map();
      this.fit = 'contain';
      this.resize = () => {
        const x = window.innerWidth / this.size.width;
        const y = window.innerHeight / this.size.height;
        this.element.style.setProperty('--stage-scale', Math.max(.01, this.fit === 'cover' ? Math.max(x, y) : Math.min(x, y)));
      };
      window.addEventListener('resize', this.resize);
      this.resize();
    }
    configure(fit) { this.fit = fit === 'cover' ? 'cover' : 'contain'; this.resize(); }
    region(id, options = {}) {
      if (!/^[a-z][a-z0-9_-]*$/i.test(id)) throw new Error('配置領域IDが不正です');
      let element = this.regions.get(id);
      if (!element) {
        element = document.createElement('section');
        element.className = 'stage-region';
        element.dataset.regionId = id;
        this.element.querySelector('[data-layer="widgets"]').appendChild(element);
        this.regions.set(id, element);
      }
      Object.assign(element.style, {
        left: `${number(options.x, 0, 1920, 0)}px`, top: `${number(options.y, 0, 1080, 0)}px`,
        width: `${number(options.width, 40, 1920, 760)}px`, height: `${number(options.height, 40, 1080, 880)}px`,
        transform: `scale(${number(options.scale, .1, 3, 1)})`
      });
      return element;
    }
    destroy() { window.removeEventListener('resize', this.resize); this.regions.forEach(element => element.remove()); this.regions.clear(); }
  }
  api.StageLayout = StageLayout;
})();
