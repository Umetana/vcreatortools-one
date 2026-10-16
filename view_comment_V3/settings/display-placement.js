// MIT Copyright (c) 2026 Umetana
// 共通配置部品と、可変サイズの描画エリア・既存設定の対応だけを担当する。
(function () {
  'use strict';
  function create({ mount, onChange, onState }) {
    const handle = document.createElement('div');
    handle.id = 'vct-display-placement';
    handle.hidden = true;
    const label = document.createElement('span');
    handle.appendChild(label);
    mount.appendChild(handle);
    let config = {}, enabled = false, editor = null, signature = '';
    const clamp = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;
    const supported = () => ['stack', 'popup', 'underbar'].includes(config.DISPLAY_MODE);
    function update() {
      const w = window.innerWidth, h = window.innerHeight;
      const stack = config.DISPLAY_MODE === 'stack';
      const up = config.STACK_DIRECTION !== 'down';
      const scaleKey = stack ? 'STACK_SCALE' : config.DISPLAY_MODE === 'popup' ? 'POPUP_SCALE' : 'UNDERBAR_SCALE';
      const popup = config.DISPLAY_MODE === 'popup';
      const random = popup && config.POPUP_PLACEMENT !== 'anchor';
      if (!supported()) enabled = false;
      const x = stack ? clamp(config.STACK_X, 0, 3840, 20) : popup && !random ? clamp(config.POPUP_X, 0, 100, 50) * w / 100 : w / 2;
      const y = stack ? (up ? h - clamp(config.STACK_EDGE, 0, 2160, 20) : clamp(config.STACK_EDGE, 0, 2160, 20)) : popup ? (random ? h / 2 : clamp(config.POPUP_Y, 0, 100, 50) * h / 100)
        : h - clamp(config.UNDERBAR_BOTTOM, 0, 500, 28);
      const value = { x, y, width: 1, height: 1, scale: clamp(config[scaleKey], 25, 200, 100) / 100 };
      const nextSignature = [w, h, config.DISPLAY_MODE, random, up].join(':');
      if (signature !== nextSignature || !editor) {
        editor?.destroy();
        signature = nextSignature;
        editor = window.VCTPlacementEditor.create({
          element: handle, getCanvasRect: () => ({ width: window.innerWidth, height: window.innerHeight }),
          canvasWidth: w, canvasHeight: h, value,
          limits: { x: stack ? [0, 3840, 20] : popup && !random ? [0, w, w / 2] : [w / 2, w / 2, w / 2],
            y: stack ? (up ? [h - 2160, h, h - 20] : [0, 2160, 20]) : random ? [h / 2, h / 2, h / 2] : popup ? [0, h, h / 2] : [h - 500, h, h - 28],
            width: [1, 1, 1], height: [1, 1, 1], scale: [.25, 2, 1] },
          onChange(next, changed) {
            const patch = {};
            if (changed.includes('scale')) patch[scaleKey] = Math.round(next.scale * 20) * 5;
            if (stack) {
              if (changed.includes('x')) patch.STACK_X = Math.round(next.x);
              if (changed.includes('y')) patch.STACK_EDGE = Math.round(up ? h - next.y : next.y);
            } else if (popup && !random) {
              if (changed.includes('x')) patch.POPUP_X = Math.round(next.x / w * 100);
              if (changed.includes('y')) patch.POPUP_Y = Math.round(next.y / h * 100);
            } else if (!popup && changed.includes('y')) patch.UNDERBAR_BOTTOM = Math.round(h - next.y);
            if (Object.keys(patch).length) onChange(patch);
          }
        });
      }
      editor.setValue(value);
      editor.setEnabled(enabled);
      handle.hidden = !enabled;
      handle.dataset.mode = stack ? 'stack' : popup ? (random ? 'random' : 'anchor') : 'underbar';
      handle.style.left = stack ? Math.min(x, Math.max(0, w - 240)) + 'px' : popup ? x + 'px' : '16px';
      handle.style.top = stack ? Math.max(0, Math.min(h - 56, up ? y - 56 : y)) + 'px' : popup ? y + 'px' : Math.max(0, y - 56) + 'px';
      handle.style.width = stack || popup ? 'min(240px, 90vw)' : Math.max(1, w - 32) + 'px';
      label.textContent = stack ? (up ? '左下基準' : '左上基準') + '：ドラッグで移動／ホイールで倍率' + (x > w || y < 0 || y > h ? '（基準位置は画面外）' : '') : popup ? (random ? '全面ランダム：ホイールで倍率' : '基準位置：ドラッグで移動／ホイールで倍率')
        : '下端位置：上下ドラッグ／ホイールで倍率' + (y < 0 ? '（基準位置は画面外）' : '');
      onState({ enabled, supported: supported() });
    }
    function setEnabled(next) { enabled = !!next && supported(); update(); }
    window.addEventListener('resize', update);
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && enabled) setEnabled(false);
    });
    return { setConfig(next) { if (config.DISPLAY_MODE !== next.DISPLAY_MODE) enabled = false; config = { ...next }; update(); }, setEnabled, toggle() { setEnabled(!enabled); } };
  }
  window.VCT_DISPLAY_PLACEMENT = Object.freeze({ create });
})();
