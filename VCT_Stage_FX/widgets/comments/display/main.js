// 表示方式の配置と寿命を管理する。SDK購読や本文整形は本体が所有する。
(function () {
  'use strict';
  const limit = (v, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(v)) ? Number(v) : fallback));
  const popup = c => c.DISPLAY_MODE === 'popup';
  const capacity = c => popup(c) ? Math.round(limit(c.POPUP_MAX_ITEMS, 12, 1, 50)) : Math.max(1, Number(c.MAX_ITEMS) || 10);
  const duration = c => popup(c) ? limit(c.POPUP_DURATION, 6, 1, 30) * 1000 : Math.max(0, Number(c.AUTO_HIDE_MS) || 0);
  const createSeed = () => ({ x: Math.random(), y: Math.random() });
  const style = (comment, c) => {
    if (!popup(c)) return {};
    const seed = comment.popupSeed;
    const random = c.POPUP_PLACEMENT !== 'anchor';
    const x = random ? seed.x * 100 : limit(c.POPUP_X, 50, 0, 100) + (seed.x * 2 - 1) * limit(c.POPUP_SPREAD_X, 8, 0, 100);
    const y = random ? seed.y * 100 : limit(c.POPUP_Y, 50, 0, 100) + (seed.y * 2 - 1) * limit(c.POPUP_SPREAD_Y, 6, 0, 100);
    return { left: x + '%', top: y + '%', width: limit(c.POPUP_WIDTH, 420, 160, 1200) + 'px',
      '--popup-scale': limit(c.POPUP_SCALE, 100, 25, 200) / 100, zIndex: comment.displayOrder };
  };
  // 表示用の一意キーで管理し、同一コメントID再受信に古いタイマーを当てない。
  const createLifetime = (remove, clock = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: id => clearTimeout(id), now: () => Date.now() }) => {
    const timers = new Map();
    const clear = () => { timers.forEach(t => clock.clearTimeout(t.handle)); timers.clear(); };
    const sync = (comments, c) => {
      const keys = new Set(comments.map(x => x.displayOrder));
      for (const [key, t] of timers) if (!keys.has(key)) { clock.clearTimeout(t.handle); timers.delete(key); }
      for (const item of comments) {
        const ms = duration(c), deadline = ms ? item.displayStartedAt + ms : 0;
        const previous = timers.get(item.displayOrder);
        if (previous?.deadline === deadline) continue;
        if (previous) { clock.clearTimeout(previous.handle); timers.delete(item.displayOrder); }
        if (!deadline) continue;
        const handle = clock.setTimeout(() => { timers.delete(item.displayOrder); remove(item.displayOrder); }, Math.max(0, deadline - clock.now()));
        timers.set(item.displayOrder, { handle, deadline });
      }
    };
    return { sync, clear };
  };
  window.VCT_DISPLAY = Object.freeze({ popup, capacity, duration, createSeed, style, createLifetime });
})();
