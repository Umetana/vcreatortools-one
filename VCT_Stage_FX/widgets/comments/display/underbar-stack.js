// 新着の実寸分だけ横へ押し出す。移動中の追加は現在位置から続ける。
(function () {
  'use strict';
  const create = (remove, env) => {
    let records = [], frame = null, config, viewport = env.width();
    const sample = now => {
      for (const r of records) {
        const t = config.slide ? Math.min(1, Math.max(0, (now - r.began) / config.slide)) : 1;
        r.x = r.from + (r.target - r.from) * (1 - Math.pow(1 - t, 3));
      }
    };
    const reset = () => {
      if (frame !== null) env.cancel(frame);
      frame = null;
      for (const r of records) { for (const key of ['transform', 'visibility', 'width']) r.el.style.removeProperty(key); delete r.el.dataset.underbarState; }
      records = [];
    };
    const tick = () => {
      frame = null;
      sample(env.now());
      const margin = config.width * config.scale * config.exit;
      const done = [];
      for (const r of records) {
        r.el.style.transform = `translateX(${r.x}px) scale(${config.scale})`;
        if (config.rtl ? r.x + r.width < -margin : r.x > viewport + margin) done.push(r);
      }
      for (const r of done) { records = records.filter(x => x !== r); remove(r.key); }
      if (records.some(r => Math.abs(r.target - r.x) > .01)) frame = env.frame(tick);
    };
    const sync = (elements, nextConfig) => {
      const now = env.now();
      if (config) sample(now);
      config = nextConfig;
      const nextViewport = env.width(), shift = config.rtl ? nextViewport - viewport : 0;
      viewport = nextViewport;
      const keys = new Set(elements.map(el => Number(el.dataset.displayOrder)));
      records = records.filter(r => keys.has(r.key));
      for (const r of records) { r.from = r.x; r.target += shift; r.began = now; }
      for (const el of elements) {
        const key = Number(el.dataset.displayOrder);
        if (records.some(r => r.key === key)) continue;
        const width = Math.ceil((env.measureWidth || (card => parseFloat(getComputedStyle(card).width)) )(el.querySelector('.cmt'))) * config.scale;
        const last = records[records.length - 1];
        const origin = config.rtl ? Math.max(viewport + 40, last ? last.x + last.width + config.gap : 0)
          : Math.min(-width - 40, last ? last.x - width - config.gap : 0);
        for (const r of records) r.target += (config.rtl ? -1 : 1) * (width + config.gap);
        const target = config.rtl ? viewport - 20 - width : 20;
        el.style.width = width / config.scale + 'px';
        el.style.transform = `translateX(${origin}px) scale(${config.scale})`;
        el.style.visibility = 'visible'; el.dataset.underbarState = 'active';
        records.push({ key, el, width, x: origin, from: origin, target, began: now });
      }
      if (frame === null && records.length) frame = env.frame(tick);
    };
    return { sync, reset };
  };
  window.VCT_UNDERBAR_STACK = Object.freeze({ create });
})();
