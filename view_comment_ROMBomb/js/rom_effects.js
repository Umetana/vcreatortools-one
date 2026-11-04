// MIT Copyright (c) 2026 Umetana
// カード爆散はDOMの複製を切り抜く。画像をcanvasへ転写しない。
(function () {
  'use strict';
  const pieces = [
    ['polygon(0 0,35% 0,31% 51%,0 46%)',-95,-70,-24],
    ['polygon(35% 0,68% 0,72% 47%,31% 51%)',-5,-105,19],
    ['polygon(68% 0,100% 0,100% 51%,72% 47%)',100,-65,32],
    ['polygon(0 46%,31% 51%,36% 100%,0 100%)',-100,70,-35],
    ['polygon(31% 51%,72% 47%,66% 100%,36% 100%)',0,105,27],
    ['polygon(72% 47%,100% 51%,100% 100%,66% 100%)',105,75,38]
  ];
  function shatter(element, row, enabled) {
    if (row.status !== 'exploding' || !enabled) {
      element.fragments?.remove();
      element.fragments = null;
      element.shattered = false;
      delete element.shell.dataset.shattered;
      return;
    }
    if (element.shattered) return;
    element.shattered = true;
    element.shell.dataset.shattered = 'true';
    const layer = document.createElement('div');
    layer.className = 'rom-fragments';
    layer.setAttribute('aria-hidden', 'true');
    const duration = Math.max(1, Math.min(1200, row.until - Date.now()));
    for (const [clip, x, y, rotation] of pieces) {
      const fragment = document.createElement('div');
      fragment.className = 'rom-shard';
      fragment.style.clipPath = clip;
      fragment.style.setProperty('--shard-x', x + 'px');
      fragment.style.setProperty('--shard-y', y + 'px');
      fragment.style.setProperty('--shard-turn', rotation + 'deg');
      fragment.style.animationDuration = duration + 'ms';
      const copy = element.card.cloneNode(true);
      copy.querySelector('.rom-bomb')?.remove();
      fragment.append(copy);
      fragment.addEventListener('animationend', () => {
        fragment.remove();
        if (!layer.childElementCount) layer.remove();
      }, { once: true });
      layer.append(fragment);
    }
    element.fragments = layer;
    element.shell.append(layer);
  }
  function material(element, row, mode) {
    element.shell.dataset.visualMode = mode;
    const key = mode + ':' + row.status;
    if (element.materialKey === key) return;
    element.materialKey = key;
    element.symbol.textContent = row.status === 'exploding' ? '💥' : row.status === 'released' ? '✨' : '💣';
    element.symbol.hidden = false;
    element.artwork.hidden = true;
    element.artwork.onload = null;
    element.artwork.onerror = null;
    if (mode !== 'visual' || row.status === 'released') {
      element.artwork.removeAttribute('src');
      return;
    }
    const filename = row.status === 'exploding' ? 'explosion.png' : 'bomb.png';
    const expected = '/assets/visual/' + filename;
    element.artwork.onload = () => {
      if (element.materialKey !== key || !element.artwork.currentSrc.endsWith(expected) || !element.artwork.naturalWidth) return;
      element.artwork.hidden = false;
      element.symbol.hidden = true;
    };
    element.artwork.onerror = () => {
      if (element.materialKey !== key) return;
      element.artwork.hidden = true;
      element.symbol.hidden = false;
    };
    element.artwork.src = './assets/visual/' + filename;
  }
  window.RomBombEffects = Object.freeze({ shatter, material });
})();
