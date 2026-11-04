// クリスマス版の常設ツリー。進行と保存は接続部が担当する。
(function () {
  'use strict';
  class ChristmasTree {
    static manifest = { stageApi: 1, name: 'クリスマスツリー', lifecycle: 'persistent', usesCommonCount: false,
      assetDisclosure: 'ai-generated', settings: {
        CHRISTMAS_TREE_STAGES: { type: 'select', label: '成長の細かさ', default: '10', options: ['10','20','30'], labels: { '10': '大きく育つ（10段階）', '20': '少しずつ育つ（20段階）', '30': 'こまめに育つ（30段階）' } },
        CHRISTMAS_TREE_GOAL: { type: 'range-number', label: '完成までの目標ポイント', default: 500, min: 10, max: 1000000, step: 10, numberStep: 1 },
        CHRISTMAS_TREE_SHOW_COUNTER: { type: 'checkbox', label: '幹の下に現在値／目標値を表示', default: false },
        CHRISTMAS_TREE_COUNTER_SIZE: { type: 'range-number', label: 'カウントの文字サイズ（px）', default: 32, min: 16, max: 64, step: 2, numberStep: 1 },
        CHRISTMAS_TREE_SUPPORT_BASE: { type: 'range-number', label: '支援ボーナスの基準ポイント（0でなし）', default: 5, min: 0, max: 1000, step: 1 },
        CHRISTMAS_TREE_GIFT_LIMIT: { type: 'range-number', label: 'ギフト飾りの上限数', default: 30, min: 1, max: 120, step: 1 }
      } };
    constructor(context, params) {
      this.context = context; this.params = params; this.last = null; this.mode = null; this.pulse = null; this.failed = false;
      this.giftPulse = null; this.lastGiftId = 0; this.giftSignature = '';
    }
    start() {
      this.context.root.classList.add('fx-christmas-tree-root');
      this.scene = document.createElement('div'); this.scene.className = 'fx-christmas-tree-scene';
      this.context.root.append(this.scene);
      this.counter = document.createElement('div'); this.counter.className = 'fx-christmas-tree-counter'; this.counter.hidden = true;
      this.counterValue = document.createElement('span'); this.counter.append(this.counterValue);
      this.context.root.append(this.counter); this.update(this.params);
    }
    image(file, className) {
      const image = document.createElement('img'); image.className = className; image.alt = ''; image.draggable = false;
      image.src = `./assets/${file}`;
      image.addEventListener('error', () => {
        if (this.context.signal.aborted || this.mode !== 'generated' || this.failed) return;
        this.failed = true; this.context.root.dataset.assetError = 'true';
        this.context.logger.warn('ツリー素材を読み込めないため、生成素材なしの表示へ切り替えます。');
        this.draw(this.params);
      }, { once: true });
      return image;
    }
    draw(params) {
      this.scene.replaceChildren();
      const generated = params.settings?.CHRISTMAS_ASSET_MODE !== 'plain' && !this.failed;
      this.mode = generated ? 'generated' : 'plain'; this.scene.dataset.mode = this.mode;
      if (generated) this.scene.append(this.image('tree-base-v1.png', 'fx-christmas-tree-base'));
      else {
        const tree = document.createElement('div'); tree.className = 'fx-christmas-tree-plain';
        for (let i = 0; i < 5; i++) { const tier = document.createElement('i'); tier.style.setProperty('--tier', i); tree.append(tier); }
        const trunk = document.createElement('b'); tree.append(trunk); this.scene.append(tree);
      }
      const stage = params.progress?.stage || 0;
      const positions = window.VCTChristmasProgress.stagePositions(params.progress?.seed || 1);
      positions.slice(0, params.progress?.ornaments ?? stage * 3).forEach(([x,y], index) => {
        const kind = window.VCTChristmasProgress.stageKind(params.progress?.seed || 1, index);
        const ornament = generated ? this.image(({red:'bauble-red-v1.png',gold:'bauble-gold-v1.png',ribbon:'ribbon-red-v1.png'})[kind], 'fx-christmas-tree-ornament') : document.createElement('span');
        ornament.dataset.kind = kind;
        if (!generated) { ornament.className = 'fx-christmas-tree-ornament is-plain'; ornament.textContent = ({red:'🔴',gold:'🟡',ribbon:'🎀'})[kind]; }
        ornament.style.left = `${x}%`; ornament.style.top = `${y}%`; this.scene.append(ornament);
      });
      positions.slice(0, params.progress?.lights ?? stage * 2).forEach(([x,y], index) => {
        const light = document.createElement('span'); light.className = 'fx-christmas-tree-light';
        light.style.left = `${Math.min(90, x + 4)}%`; light.style.top = `${Math.max(12, y - 4)}%`;
        light.style.animationDelay = `${index % 7 * -.23}s`; this.scene.append(light);
      });
      if (params.progress?.completed === true) {
        const star = generated ? this.image('star-gold-v1.png', 'fx-christmas-tree-star') : document.createElement('span');
        if (!generated) { star.className = 'fx-christmas-tree-star is-plain'; star.textContent = '⭐'; }
        this.scene.append(star);
      }
      this.giftLayer = document.createElement('div'); this.giftLayer.className = 'fx-christmas-tree-gifts'; this.scene.append(this.giftLayer);
      this.drawGifts(params);
    }
    drawGifts(params) {
      this.giftPulse?.cancel(); this.giftPulse = null; this.giftLayer.replaceChildren();
      const gifts = params.progress?.gifts || [];
      const size = Math.max(5, 8 * Math.sqrt(12 / Math.max(12, gifts.length)));
      for (const gift of gifts) {
        // 120個の固定スロット。受信済みの飾りを追加のたびに移動しない。
        let row = 0, col = gift.slot;
        while (col >= row + 4) { col -= row + 4; row++; }
        const y = 24 + row * 5, half = (y - 9) * .55;
        const x = 50 + ((col + .5) / (row + 4) * 2 - 1) * half;
        const ornament = this.mode === 'generated' ? this.image(gift.kind === 'bell' ? 'gift-bell-v1.png' : 'gift-present-v1.png', 'fx-christmas-tree-gift') : document.createElement('span');
        if (this.mode !== 'generated') { ornament.className = 'fx-christmas-tree-gift is-plain'; ornament.textContent = gift.kind === 'bell' ? '🔔' : '🎁'; }
        Object.assign(ornament.dataset, { giftId: String(gift.id), slot: String(gift.slot), kind: gift.kind });
        Object.assign(ornament.style, { left: `${x}%`, top: `${y}%`, width: `${size}%`, height: `${size * 2 / 3}%`, fontSize: `${size / 8.5}em` });
        this.giftLayer.append(ornament);
      }
      this.giftSignature = JSON.stringify(gifts);
    }
    update(params) {
      this.params = params;
      if (!this.scene) return;
      const progress = params.progress || { count: 0, stage: 0, celebrations: 0, goal: 500 };
      const mode = params.settings?.CHRISTMAS_ASSET_MODE === 'plain' || this.failed ? 'plain' : 'generated';
      const changed = !this.last || this.last.stage !== progress.stage || this.last.stages !== progress.stages || this.last.seed !== progress.seed || this.mode !== mode;
      if (changed) this.draw(params);
      else if (this.giftSignature !== JSON.stringify(progress.gifts || [])) this.drawGifts(params);
      const height = Math.min(this.context.size.height * .91, this.context.size.width * 1.5);
      Object.assign(this.scene.style, { width: `${height * 2 / 3}px`, height: `${height}px`, fontSize: `${height * 2 / 3 * .085}px` });
      Object.assign(this.context.root.dataset, { stage: String(progress.stage), count: String(progress.count), paused: String(params.paused === true), preview: String(params.progressPreview === true) });
      this.updateCounter(params);
      if (params.paused) { this.pulse?.cancel(); this.pulse = null; this.giftPulse?.cancel(); this.giftPulse = null; }
      const latest = (progress.gifts || []).at(-1);
      if (this.last && latest && latest.id > this.lastGiftId && !params.paused) {
        const element = this.giftLayer.lastElementChild;
        const strength = ({small:1,standard:1.3,large:1.6,extra:2})[latest.rank] || 1.3;
        this.giftPulse?.cancel();
        this.giftPulse = element.animate([
          { transform: 'translate(-50%, -50%) scale(.6)', filter: 'brightness(1)' },
          { offset: .35, transform: 'translate(-50%, -50%) scale(1.35)', filter: `brightness(${strength}) drop-shadow(0 0 ${8 * strength}px #ffe29a)` },
          { transform: 'translate(-50%, -50%) scale(1)', filter: 'brightness(1)' }
        ], { duration: 1100, easing: 'ease-out' });
      }
      this.lastGiftId = latest?.id || 0;
      const sameGoal = this.last?.goal === progress.goal && this.last?.stages === progress.stages;
      const grown = sameGoal && progress.count > this.last.count && progress.stage > this.last.stage;
      const celebrate = sameGoal && progress.count > this.last.count && progress.celebrations > this.last.celebrations;
      if (!params.paused && (grown || celebrate)) {
        this.pulse?.cancel();
        const intensity = ({ small: .65, standard: 1, large: 1.3, extra: 1.6 })[params.intensity] || 1;
        const strong = celebrate || progress.completed;
        const blur = (strong ? 30 : 12) * intensity;
        this.pulse = this.scene.animate([
          { filter: 'brightness(1) drop-shadow(0 0 0px #ffd56a)' },
          { offset: .3, filter: `brightness(${strong ? 1.7 : 1.2}) drop-shadow(0 0 ${blur}px #ffd56a)` },
          { filter: 'brightness(1) drop-shadow(0 0 0px #ffd56a)' }
        ], { duration: strong ? 1700 : 950, easing: 'ease-out' });
        this.context.root.dataset.lastPulse = strong ? 'strong' : 'normal';
      }
      this.last = { ...progress };
    }
    updateCounter(params) {
      if (!this.counter) return;
      this.counter.hidden = params.settings?.CHRISTMAS_TREE_SHOW_COUNTER !== true;
      const progress = params.progress || { count: 0, goal: 500 };
      this.counterValue.textContent = `${progress.count.toLocaleString('ja-JP')} / ${progress.goal.toLocaleString('ja-JP')}`;
      this.counter.setAttribute('aria-label', `ツリーの成長ポイント：${this.counterValue.textContent}`);
      const size = window.VCTStage.number(params.settings?.CHRISTMAS_TREE_COUNTER_SIZE, 16, 64, 32);
      this.counter.style.fontSize = `${size}px`;
      if (!this.counter.hidden) {
        // 桁数が増えた場合も領域から文字を切らず、指定サイズを上限に収める。
        const available = Math.max(1, this.counter.clientWidth - 24);
        const width = this.counterValue.scrollWidth;
        if (width > available) this.counter.style.fontSize = `${Math.max(1, Math.floor(size * available / width))}px`;
      }
    }
    destroy() { this.pulse?.cancel(); this.giftPulse?.cancel(); this.scene?.replaceChildren(); }
  }
  window.VCTStage.registry.register('christmas_tree', ChristmasTree);
})();
