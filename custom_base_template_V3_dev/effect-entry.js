// 制作者の演出選択箇所。index.htmlから読込完了を待って起動する。
window.VCT_EFFECT_READY = new Promise((resolve) => {
  const script = document.createElement('script');
  script.src = './effects/glow.js';
  script.onload = resolve;
  script.onerror = () => { console.error('演出ファイルを読み込めません。コメント表示を継続します。'); resolve(); };
  document.head.append(script);
});
