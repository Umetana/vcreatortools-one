// MIT Copyright (c) 2026 Umetana
(function () {
  'use strict';
  const stage = document.getElementById('stage');
  const area = document.getElementById('app');
  let config = { ...window.CONFIG }, editing = false, drag = null;
  const bounds = { COMMENT_X: [0,1920,80], COMMENT_Y: [0,1080,80], COMMENT_WIDTH: [160,1920,760], COMMENT_HEIGHT: [80,1080,880], COMMENT_SCALE: [.1,3,1] };
  const clamp = (key, value) => { const [min,max,fallback] = bounds[key]; return Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback; };
  const overlay = document.createElement('div');
  overlay.id = 'placement-editor'; overlay.hidden = true;
  overlay.textContent = 'ドラッグで移動・ホイールで倍率';
  document.body.append(overlay);
  function render() {
    for (const key of Object.keys(bounds)) config[key] = clamp(key, config[key]);
    const scale = Math.max(.01, Math.min(innerWidth / 1920, innerHeight / 1080));
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    Object.assign(area.style, { left: config.COMMENT_X+'px', top: config.COMMENT_Y+'px', width: config.COMMENT_WIDTH+'px', height: config.COMMENT_HEIGHT+'px', transform: `scale(${config.COMMENT_SCALE})` });
    const rect = area.getBoundingClientRect();
    Object.assign(overlay.style, { left:rect.left+'px', top:rect.top+'px', width:rect.width+'px', height:rect.height+'px' });
    overlay.hidden = !editing;
  }
  function endDrag() { if (drag && overlay.hasPointerCapture(drag.id)) overlay.releasePointerCapture(drag.id); drag = null; }
  function end() { editing = false; endDrag(); render(); }
  function change(key, value) { window.dispatchEvent(new CustomEvent('vct-placement-change', { detail: { key, value: clamp(key,value) } })); }
  overlay.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); drag = { id:event.pointerId, x:event.clientX,y:event.clientY,left:config.COMMENT_X,top:config.COMMENT_Y,scale:stage.getBoundingClientRect().width/1920 }; overlay.setPointerCapture(event.pointerId); });
  overlay.addEventListener('pointermove', event => { if (!drag || event.pointerId !== drag.id) return; change('COMMENT_X',Math.round(drag.left+(event.clientX-drag.x)/drag.scale)); change('COMMENT_Y',Math.round(drag.top+(event.clientY-drag.y)/drag.scale)); });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) overlay.addEventListener(type,endDrag);
  overlay.addEventListener('wheel', event => { event.preventDefault(); if(event.deltaY) change('COMMENT_SCALE', Math.round((config.COMMENT_SCALE-Math.sign(event.deltaY)*.05)*100)/100); }, {passive:false});
  window.addEventListener('vct-placement-toggle', () => { editing = !editing; endDrag(); render(); });
  window.addEventListener('vct-settings-preview', event => { config = {...event.detail}; render(); });
  window.addEventListener('vct-settings-reset-preview', () => { config = {...window.CONFIG}; end(); });
  window.addEventListener('resize', () => { endDrag(); render(); });
  window.addEventListener('blur',endDrag);
  window.addEventListener('pagehide',end);
  document.addEventListener('visibilitychange', () => { if(document.hidden) end(); });
  render();
})();
