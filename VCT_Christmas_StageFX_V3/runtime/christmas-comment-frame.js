// コメントの内容とは独立した装飾。既存領域の確定した配置を写して追従する。
(function () {
  'use strict';
  class ChristmasCommentFrame {
    constructor(container, region) {
      this.region = region; this.mode = ''; this.failed = false;
      this.root = document.createElement('div'); this.root.className = 'fx-christmas-comment-frame';
      this.root.hidden = true; this.root.setAttribute('aria-hidden', 'true'); container.append(this.root);
      // 背景を文字より後ろへ置き、装飾の前面レイヤーとは分ける。
      this.backplate = document.createElement('div'); this.backplate.className = 'fx-christmas-comment-frame-backplate';
      this.backplate.hidden = true; this.backplate.setAttribute('aria-hidden', 'true');
      this.fill = document.createElement('div'); this.fill.className = 'fx-christmas-comment-frame-fill';
      this.backplate.append(this.fill); region.before(this.backplate);
    }
    configure(config) {
      this.config = config;
      this.root.style.cssText = this.region.style.cssText;
      this.backplate.style.cssText = this.region.style.cssText;
      const color = /^#[0-9a-f]{6}$/i.test(config.CHRISTMAS_COMMENT_FRAME_BG_COLOR) ? config.CHRISTMAS_COMMENT_FRAME_BG_COLOR : '#10202b';
      const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
      const opacity = window.VCTStage.number(config.CHRISTMAS_COMMENT_FRAME_BG_OPACITY, 0, 1, 0);
      this.fill.style.backgroundColor = `rgba(${rgb.join(',')},${opacity})`;
      const size = Math.min(parseFloat(this.region.style.width), parseFloat(this.region.style.height));
      this.root.style.setProperty('--frame-corner-size', `${Math.max(24, Math.min(110, size * .24))}px`);
      this.root.hidden = config.CHRISTMAS_COMMENT_FRAME !== true;
      this.backplate.hidden = this.root.hidden;
      if (this.root.hidden) { this.root.replaceChildren(); this.mode = ''; return; }
      const mode = config.CHRISTMAS_ASSET_MODE === 'plain' || this.failed ? 'plain' : 'generated';
      if (mode === this.mode) return;
      this.mode = mode; this.root.dataset.mode = mode;
      const line = document.createElement('div'); line.className = 'fx-christmas-comment-frame-line';
      const children = [line];
      for (const side of ['top', 'bottom', 'left', 'right']) {
        const edge = document.createElement('i'); edge.className = `fx-christmas-comment-frame-edge is-${side}`; children.push(edge);
      }
      for (const corner of ['tl', 'tr', 'bl', 'br']) {
        const ornament = document.createElement(mode === 'generated' ? 'img' : 'span');
        ornament.className = `fx-christmas-comment-frame-corner is-${corner}`;
        if (mode === 'generated') {
          ornament.alt = ''; ornament.draggable = false; ornament.src = './assets/comment-frame-corner-v1.png';
          ornament.addEventListener('error', () => {
            if (!this.root.isConnected || this.mode !== 'generated' || this.failed) return;
            this.failed = true;
            console.warn('[クリスマス枠] 素材を読めないため絵文字の枠へ切り替えます。');
            this.configure(this.config);
          }, { once: true });
        } else ornament.textContent = '🎀';
        children.push(ornament);
      }
      this.root.replaceChildren(...children);
    }
    destroy() { this.root.remove(); this.backplate.remove(); }
  }
  window.VCTStage.ChristmasCommentFrame = ChristmasCommentFrame;
})();
