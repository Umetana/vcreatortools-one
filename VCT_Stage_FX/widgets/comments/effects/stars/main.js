// Stars V2の星降りをV3の表示モデルに接続する。配置乱数はコメントごとに保持。
(function () {
  'use strict';
  const limit = (v, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(v)) ? Number(v) : fallback));
  const createSeeds = () => ({
    direction: Math.random() < .5 ? -1 : 1,
    particles: Array.from({ length: 48 }, (_, id) => ({ id, x: Math.random(), y: Math.random(), dx: Math.random(), dy: Math.random(), delay: Math.random(), duration: Math.random(), size: Math.random(), rotation: Math.random() }))
  });
  const eligible = (comment, config) => config.COMMENT_EFFECT === 'stars' && (
    config.STAR_TARGET === 'all' ||
    config.STAR_TARGET === 'support' && comment.isSupport ||
    config.STAR_TARGET === 'support-membership' && (comment.isSupport || comment.isMembership)
  );
  const palette = value => {
    const colors = String(value || '').split(',').map(s => s.trim()).filter(s => /^#[0-9a-f]{6}$/i.test(s));
    return colors.length ? colors : ['#fff7ad', '#ffd166', '#7dd3fc'];
  };
  const particleStyle = (p, seeds, config) => {
    const sign = config.STAR_DIRECTION === 'random' ? seeds.direction : config.STAR_DIRECTION === 'down-left' ? -1 : 1;
    const sizeMin = limit(config.STAR_SIZE_MIN, 14, 8, 64);
    const sizeMax = Math.max(sizeMin, limit(config.STAR_SIZE_MAX, 28, 8, 64));
    const durationMin = limit(config.STAR_DURATION_MIN, 1.8, 1, 12);
    const durationMax = Math.max(durationMin, limit(config.STAR_DURATION_MAX, 3.2, 1, 12));
    const colors = palette(config.STAR_COLORS);
    return {
      left: ((sign > 0 ? -10 : 15) + p.x * 95) + '%', top: (-38 + p.y * 28) + '%',
      fontSize: (sizeMin + p.size * (sizeMax - sizeMin)) + 'px', color: colors[p.id % colors.length],
      animationDelay: (p.delay * .7) + 's', animationDuration: (durationMin + p.duration * (durationMax - durationMin)) + 's',
      '--star-dx': (sign * (36 + p.dx * 68)) + 'px', '--star-dy': (58 + p.dy * 78) + 'px', '--star-rotate': (120 + p.rotation * 300) + 'deg'
    };
  };
  window.VCT_STARS = Object.freeze({ createSeeds, eligible, palette, particleStyle, component: {
    props: ['comment', 'config'],
    computed: {
      active() { return eligible(this.comment, this.config); },
      particles() { return (this.comment.starSeeds?.particles || []).slice(0, Math.round(limit(this.config.STAR_COUNT, 12, 1, 48))); }
    },
    methods: { style(p) { return particleStyle(p, this.comment.starSeeds, this.config); } },
    template: `<div v-if="active" class="v3-stars-layer" aria-hidden="true"><span v-for="p in particles" :key="p.id" class="v3-star" :style="style(p)">★</span></div>`
  } });
})();
