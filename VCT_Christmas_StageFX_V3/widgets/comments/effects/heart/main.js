// 同梱の枠演出。乱数はコメント受信時にだけ生成し、プレビューでは保持する。
(function () {
  'use strict';
  const limit = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const createSeeds = () => Array.from({ length: 24 }, (_, id) => ({
    id, x: Math.random() * 100, y: Math.random() * 100,
    scale: 0.7 + Math.random() * 0.6, phase: Math.random(),
    rise: 45 + Math.random() * 25, spin: Math.random() < 0.5 ? -360 : 360,
    drift: -18 + Math.random() * 36, tilt: -20 + Math.random() * 40,
    tempo: 0.8 + Math.random() * 0.4
  }));
  const eligible = (comment, config) => config.COMMENT_EFFECT === 'heart' && (
    config.HEART_TARGET === 'all' ||
    config.HEART_TARGET === 'support' && comment.isSupport ||
    config.HEART_TARGET === 'support-membership' && (comment.isSupport || comment.isMembership)
  );
  const component = {
    props: ['comment', 'config'],
    computed: {
      active() { return eligible(this.comment, this.config); },
      particles() { return (this.comment.effectSeeds || []).slice(0, Math.round(limit(this.config.HEART_COUNT, 6, 1, 24))); }
    },
    methods: {
      particleStyle(p) {
        const duration = limit(this.config.HEART_DURATION, 2.5, 1, 12) * p.tempo;
        return {
          left: p.x + '%', top: p.y + '%',
          width: limit(this.config.HEART_SIZE, 32, 8, 64) * p.scale + 'px',
          color: /^#[0-9a-f]{6}$/i.test(this.config.HEART_COLOR || '') ? this.config.HEART_COLOR : '#ff416c',
          animationDuration: duration + 's', animationDelay: -duration * p.phase + 's',
          '--heart-rise': p.rise + 'px', '--heart-spin': p.spin + 'deg',
          '--heart-drift': p.drift + 'px', '--heart-tilt': p.tilt + 'deg'
        };
      }
    },
    template: `<div v-if="active" class="v3-heart-layer" aria-hidden="true">
      <svg v-for="p in particles" :key="p.id" class="v3-heart-particle" :style="particleStyle(p)" viewBox="0 0 24 24">
        <path d="M12 21C9 18 2 13 2 7.5 2 1.5 9 0 12 5 15 0 22 1.5 22 7.5 22 13 15 18 12 21Z" />
      </svg>
    </div>`
  };
  window.VCT_HEART = Object.freeze({ createSeeds, eligible, component });
})();
