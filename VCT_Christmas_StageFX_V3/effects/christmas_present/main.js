// 開封は既存Hostの実行枠・終了時間・Contextの一括破棄に従う。
(function () {
  'use strict';
  const profiles = {
    small: { time: .85, box: .9, particle: .85, spread: .8, count: 10 / 18 },
    standard: { time: 1, box: 1, particle: 1, spread: 1, count: 1 },
    large: { time: 1.15, box: 1.15, particle: 1.2, spread: 1.25, count: 26 / 18 },
    extra: { time: 1.3, box: 1.3, particle: 1.4, spread: 1.5, count: 34 / 18 }
  };
  class ChristmasPresent {
    // Hostの終了時刻にも同じ実効時間を渡し、強い開封が途中で切れないようにする。
    static durationFor(base, intensity) {
      return Math.min(10000, Math.round(window.VCTStage.number(base, 1200, 10000, 3000) * (profiles[intensity] || profiles.standard).time));
    }
    static manifest = { stageApi: 1, name: 'クリスマスのプレゼント開封', lifecycle: 'host', usesCommonCount: false,
      assetDisclosure: 'ai-generated', settings: {
        CHRISTMAS_PRESENT_AUTO: { type: 'checkbox', label: '支援コメントで追加の開封演出を出す', default: true },
        CHRISTMAS_PRESENT_PARTICLE_COUNT: { type: 'range-number', label: '飛び出す飾りの基準数', default: 18, min: 1, max: 60, step: 1 },
        CHRISTMAS_PRESENT_BOX_SIZE: { type: 'range-number', label: '箱の基準サイズ（px）', default: 268, min: 80, max: 800, step: 10, numberStep: 1 },
        CHRISTMAS_PRESENT_PARTICLE_SIZE: { type: 'range-number', label: '飛び出す飾りの基準サイズ（px）', default: 48, min: 12, max: 240, step: 4, numberStep: 1 },
        CHRISTMAS_PRESENT_SPREAD: { type: 'range-number', label: '中身の飛散距離（px）', default: 260, min: 40, max: 1600, step: 20, numberStep: 1 }
      } };
    constructor(context, params) { this.context = context; this.params = params; }
    start() {
      const ctx = this.context, p = this.params;
      const duration = window.VCTStage.number(p.duration, 100, 10000, 3000);
      const rank = ({ small: 0, standard: 1, large: 2, extra: 3 })[p.intensity] ?? 1;
      const profile = profiles[p.intensity] || profiles.standard;
      const settings = p.settings || {};
      const count = Math.max(1, Math.min(120, Math.round(window.VCTStage.number(settings.CHRISTMAS_PRESENT_PARTICLE_COUNT, 1, 60, 18) * profile.count)));
      // 領域はクリップ範囲。箱・飾り・飛距離を領域寸法から独立させる。
      const width = window.VCTStage.number(settings.CHRISTMAS_PRESENT_BOX_SIZE, 80, 800, 268) * profile.box;
      const particleSize = window.VCTStage.number(settings.CHRISTMAS_PRESENT_PARTICLE_SIZE, 12, 240, 48) * profile.particle;
      const spread = window.VCTStage.number(settings.CHRISTMAS_PRESENT_SPREAD, 40, 1600, 260) * profile.spread;
      const generated = p.settings?.CHRISTMAS_ASSET_MODE !== 'plain';
      ctx.root.classList.add('fx-christmas-present'); ctx.root.dataset.intensity = p.intensity;
      const scene = document.createElement('div'); scene.className = 'fx-christmas-present-scene';
      scene.style.width = `${width}px`; scene.style.height = `${width * 1.2}px`;
      scene.dataset.mode = generated ? 'generated' : 'plain'; ctx.root.append(scene);
      const body = document.createElement('div'), lid = document.createElement('div');
      body.className = 'fx-christmas-present-body'; lid.className = 'fx-christmas-present-lid';
      for (const [part, symbol] of [[body, ''], [lid, '🎀']]) {
        const fallback = document.createElement('span'); fallback.className = 'fx-christmas-present-fallback'; fallback.textContent = symbol; part.append(fallback);
        if (generated) {
          const image = document.createElement('img'); image.src = './assets/present-open-atlas-v1.png'; image.alt = ''; image.draggable = false;
          image.addEventListener('error', () => { if (!ctx.signal.aborted) scene.dataset.mode = 'plain'; }, { once: true }); part.append(image);
        }
      }
      const glow = document.createElement('div'); glow.className = 'fx-christmas-present-glow'; scene.append(glow, body, lid);
      ctx.animations.animate(scene, [
        { opacity: 0, transform: 'translate(-50%, -35%) scale(.65)' },
        { offset: .18, opacity: 1, transform: 'translate(-50%, -53%) scale(1.05)' },
        { offset: .28, transform: 'translate(-50%, -50%) scale(1)' },
        { offset: .35, transform: 'translate(-50%, -52%) scale(1)' },
        { offset: .42, transform: 'translate(-50%, -50%) scale(1)' },
        { offset: .83, opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.94)' }
      ], { duration, fill: 'both', easing: 'ease-out' });
      ctx.animations.animate(lid, [
        { transform: 'translateY(0) rotate(0)' }, { offset: .4, transform: 'translateY(0) rotate(0)' },
        { offset: .58, transform: `translateY(${-width * .47}px) rotate(-17deg)` },
        { offset: .86, opacity: 1 }, { opacity: 0, transform: `translateY(${-width * .6}px) rotate(-23deg)` }
      ], { duration, fill: 'both', easing: 'ease-out' });
      ctx.animations.animate(glow, [{ opacity: 0, transform: 'scale(.2)' }, { offset: .4, opacity: 0 },
        { offset: .58, opacity: .55 + rank * .12, transform: `scale(${1 + rank * .14})` }, { opacity: 0, transform: 'scale(1.4)' }
      ], { duration, fill: 'both' });
      const kinds = [ ['star-gold-v1.png', '⭐'], ['bauble-red-v1.png', '🔴'], ['ribbon-red-v1.png', '🎀'] ];
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('span'); particle.className = 'fx-christmas-present-particle';
        const [file, symbol] = kinds[i % kinds.length];
        if (generated) {
          const image = document.createElement('img'); image.src = `./assets/${file}`; image.alt = ''; image.draggable = false;
          image.addEventListener('error', () => { if (!ctx.signal.aborted) particle.textContent = symbol; }, { once: true }); particle.append(image);
        } else particle.textContent = symbol;
        const size = particleSize * (.85 + i % 3 * .15); particle.style.width = particle.style.height = particle.style.fontSize = `${size}px`; scene.append(particle);
        const angle = Math.PI * (1.1 + (i + .5) / count * .8);
        const distance = spread * (.5 + (i % 4) * .12);
        const x = Math.cos(angle) * distance, y = Math.sin(angle) * distance;
        ctx.animations.animate(particle, [ { opacity: 0, transform: 'translate(-50%, -50%) scale(.15)' },
          { offset: .1, opacity: 1 }, { offset: .65, opacity: 1, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${i * 33}deg) scale(1)` },
          { opacity: 0, transform: `translate(calc(-50% + ${x * 1.3}px), calc(-50% + ${y + spread * .3}px)) rotate(${i * 47}deg) scale(.5)` }
        ], { duration: duration * .5, delay: duration * (.43 + i % 3 * .015), fill: 'both', easing: 'ease-out' });
      }
    }
    destroy() { /* アニメーションとDOMはContextがまとめて解放する。 */ }
  }
  window.VCTStage.registry.register('christmas_present', ChristmasPresent);
})();
