// MIT Copyright (c) 2026 Umetana
// 素材の描画だけを担当する。位置・動き・個数は演出モジュールが所有する。
(function () {
  'use strict';
  const defaults = { FX_MATERIAL_MODE: 'emoji', FX_MATERIAL_FILE: '', FX_MATERIAL_SIZE: 32 };
  function imageUrl(filename) {
    const parts = String(filename || '').trim().split('/');
    if (!parts.length || parts.some(part => !part || part === '.' || part === '..' || /[\\:%?#\x00-\x1f]/.test(part))) return null;
    if (!/\.(png|jpe?g|webp|gif)$/i.test(parts.at(-1))) return null;
    return new URL('assets/' + parts.map(encodeURIComponent).join('/'), new URL('.', document.baseURI)).href;
  }
  function create(settings, emoji = '✨', report = () => {}) {
    const element = document.createElement('span');
    element.className = 'vct-material';
    element.setAttribute('aria-hidden', 'true');
    Object.assign(element.style, { display:'inline-flex', alignItems:'center', justifyContent:'center', lineHeight:'1', pointerEvents:'none', verticalAlign:'middle' });
    let disposed = false, pending = null, source = null;
    const fallback = () => element.replaceChildren(document.createTextNode(emoji));
    function update(next) {
      if (disposed) return;
      const number = Number(next.FX_MATERIAL_SIZE);
      const size = Number.isFinite(number) ? Math.min(512, Math.max(1, number)) : 32;
      Object.assign(element.style, { width:size+'px', height:size+'px', fontSize:size+'px', flex:'0 0 '+size+'px' });
      const url = next.FX_MATERIAL_MODE === 'image' ? imageUrl(next.FX_MATERIAL_FILE) : null;
      const key = next.FX_MATERIAL_MODE === 'image' ? (url || 'invalid') : 'emoji';
      if (source === key) return;
      source = key;
      if (pending) { pending.onload = pending.onerror = null; pending = null; }
      fallback();
      if (key === 'emoji') { report(''); return; }
      if (!url) { report('画像ファイル名を確認してください。assets内のPNG・JPEG・WebP・GIFを指定します。'); return; }
      report('画像を読み込み中…');
      const img = new Image();
      pending = img;
      img.alt = '';
      Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', display:'block' });
      img.onload = () => {
        if (disposed || pending !== img) return;
        pending = null;
        img.onload = img.onerror = null;
        element.replaceChildren(img);
        report('');
      };
      img.onerror = () => {
        if (disposed || pending !== img) return;
        pending = null;
        img.onload = img.onerror = null;
        fallback();
        report('画像を読み込めません。ファイル名と配置を確認してください。既定の絵文字で表示します。');
      };
      img.src = url;
    }
    update(settings);
    return { element, update, destroy() { disposed = true; if(pending) pending.onload = pending.onerror = null; pending = null; element.remove(); } };
  }
  window.VCT_MATERIAL = { defaults, create, imageUrl };
})();
