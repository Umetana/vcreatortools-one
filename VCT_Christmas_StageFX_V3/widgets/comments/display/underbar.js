// 複数レーンの横流し。実寸で間隔を確保し、待機中の古いコメントから整理する。
(function () {
  'use strict';
  const limit = (v, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(v)) ? Number(v) : fallback));
  const settings = c => ({ speed: limit(c.UNDERBAR_SPEED, 140, 30, 600), scale: limit(c.UNDERBAR_SCALE, 100, 25, 200) / 100,
    gap: limit(c.UNDERBAR_GAP, 60, 0, 300), bottom: limit(c.UNDERBAR_BOTTOM, 28, 0, 500), width: limit(c.UNDERBAR_WIDTH, 600, 180, 1200),
    slide: limit(c.UNDERBAR_SLIDE_MS, 450, 0, 2000), exit: limit(c.UNDERBAR_EXIT_CARDS, 2, 0, 4),
    laneMode: ['sequence', 'random'].includes(c.UNDERBAR_LANE_MODE) ? c.UNDERBAR_LANE_MODE : 'available',
    lanes: Math.round(limit(c.UNDERBAR_LANES, 1, 1, 5)), laneGap: limit(c.UNDERBAR_LANE_GAP, 20, 0, 200),
    queue: Math.round(limit(c.UNDERBAR_QUEUE, 20, 1, 100)), rtl: c.UNDERBAR_DIRECTION !== 'ltr' });
  const createTicker = (remove, env = { now: () => performance.now(), frame: fn => requestAnimationFrame(fn), cancel: id => cancelAnimationFrame(id), width: () => window.innerWidth }) => {
    let records = [], frame = null, laneHeight = 0, nextLane = 0, config = settings({});
    const reset = () => {
      if (frame !== null) env.cancel(frame);
      frame = null;
      for (const r of records) { r.el.style.removeProperty('transform'); r.el.style.removeProperty('visibility'); r.el.style.removeProperty('width'); r.el.style.removeProperty('bottom'); delete r.el.dataset.underbarLane; delete r.el.dataset.underbarState; }
      records = []; laneHeight = 0; nextLane = 0;
    };
    const tick = () => {
      frame = null;
      const now = env.now(), viewport = env.width();
      const done = [];
      for (const r of records) {
        if (r.start === null) continue;
        const distance = (now - r.start) * config.speed / 1000;
        r.x = config.rtl ? r.origin - distance : r.origin + distance;
        r.el.style.transform = `translateX(${r.x}px) scale(${config.scale})`;
        if (config.rtl ? r.x + r.width < -40 : r.x > viewport + 40) done.push(r);
      }
      for (const r of done) { records = records.filter(x => x !== r); remove(r.key); }
      // 空き優先は下段から、指定方式は各レーンの待機順に発車する。
      for (let lane = 0; lane < config.lanes; lane++) {
        const waiting = records.find(r => r.start === null && (r.assignedLane === null || r.assignedLane === lane));
        if (!waiting) continue;
        const active = records.filter(r => r.start !== null && r.lane === lane);
        const last = active[active.length - 1];
        // 発車直前に計測して幅を固定。読込後の文字・画像で走行中の幅を変えない。
        // 小数幅を切り上げ、名前が端数不足だけで省略されることを防ぐ。
        const width = Math.ceil((env.measureWidth || (card => parseFloat(getComputedStyle(card).width)) )(waiting.el.querySelector('.cmt'))) * config.scale;
        const ready = !last || (config.rtl ? last.x + last.width + config.gap <= viewport + 40 : last.x >= config.gap - 40);
        if (ready) {
          waiting.lane = lane;
          waiting.el.dataset.underbarLane = String(lane);
          waiting.width = width;
          waiting.el.style.width = width / config.scale + 'px';
          waiting.start = now;
          waiting.origin = config.rtl ? viewport + 40 : -width - 40;
          waiting.x = waiting.origin;
          waiting.el.style.transform = `translateX(${waiting.x}px) scale(${config.scale})`;
          waiting.el.style.visibility = 'visible';
          waiting.el.dataset.underbarState = 'active';
        }
      }
      // 高さが異なる通知にも合わせる。退場で段間隔を縮めて上下に揺らさない。
      for (const r of records) if (r.start !== null) {
        r.el.style.bottom = config.bottom + r.lane * (laneHeight + config.laneGap) + 'px';
      }
      if (records.length) frame = env.frame(tick);
    };
    const sync = (elements, c) => {
      config = settings(c);
      for (const el of elements) {
        const height = el.querySelector('.cmt').offsetHeight;
        if (Number.isFinite(height)) laneHeight = Math.max(laneHeight, Math.ceil(height) * config.scale);
      }
      const keys = new Set(elements.map(el => Number(el.dataset.displayOrder)));
      records = records.filter(r => keys.has(r.key));
      for (const el of elements) {
        const key = Number(el.dataset.displayOrder);
        if (records.some(r => r.key === key)) continue;
        el.style.visibility = 'hidden'; el.dataset.underbarState = 'waiting';
        // 抽選・順番は受け付け時に一度だけ決め、待機中は変更しない。
        let assignedLane = null;
        if (config.laneMode === 'sequence') { assignedLane = nextLane; nextLane = (nextLane + 1) % config.lanes; }
        if (config.laneMode === 'random') assignedLane = Math.floor((env.random || Math.random)() * config.lanes);
        records.push({ key, el, assignedLane, start: null, x: 0, width: 0 });
      }
      const waiting = records.filter(r => r.start === null);
      for (const r of waiting.slice(0, Math.max(0, waiting.length - config.queue))) {
        records = records.filter(x => x !== r); remove(r.key);
      }
      if (frame === null && records.length) frame = env.frame(tick);
    };
    return { sync, reset };
  };
  const create = (remove, env = { now: () => performance.now(), frame: fn => requestAnimationFrame(fn), cancel: id => cancelAnimationFrame(id), width: () => window.innerWidth }) => {
    let controller = null, mode = null;
    return {
      reset() { controller?.reset(); controller = null; mode = null; },
      sync(elements, config) {
        const nextMode = config.UNDERBAR_MODE === 'stack' ? 'stack' : 'ticker';
        if (mode !== nextMode) {
          controller?.reset(); mode = nextMode;
          controller = mode === 'stack' ? window.VCT_UNDERBAR_STACK.create(remove, env) : createTicker(remove, env);
        }
        controller.sync(elements, mode === 'stack' ? settings(config) : config);
      }
    };
  };
  window.VCT_UNDERBAR = Object.freeze({ settings, create });
})();
