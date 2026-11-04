// 同梱のFlash演出。購読やタイマーは所有しない。
(function () {
  'use strict';
  const modes = Object.freeze(['glow', 'shimmer', 'glint', 'trace', 'aurora', 'aurora-background', 'sweep']);
  const createMode = () => modes[Math.floor(Math.random() * modes.length)];
  const resolveMode = (comment, config) => config.FLASH_MODE === 'random'
    ? (modes.includes(comment.flashMode) ? comment.flashMode : 'glow') : config.FLASH_MODE;
  const eligible = (comment, config) => config.COMMENT_EFFECT === 'flash' && (
    config.FLASH_TARGET === 'all' ||
    config.FLASH_TARGET === 'support' && comment.isSupport ||
    config.FLASH_TARGET === 'support-membership' && (comment.isSupport || comment.isMembership)
  );
  // SDK V2のrgb形式とHEXを受け付ける。未指定・不正値は指定色へ戻す。
  const validColor = value => {
    if (typeof value !== 'string') return false;
    if (/^#[0-9a-f]{6}$/i.test(value)) return true;
    const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    return !!rgb && rgb.slice(1).every(n => Number(n) <= 255);
  };
  const resolveColor = (comment, config) => {
    const fixed = validColor(config.FLASH_COLOR) ? config.FLASH_COLOR : '#ffd166';
    return config.FLASH_COLOR_MODE === 'comment' && validColor(comment.colorStr) ? comment.colorStr : fixed;
  };
  window.VCT_FLASH = Object.freeze({ modes, createMode, resolveMode, eligible, resolveColor, component: {
    props: ['comment', 'config'],
    computed: {
      mode() { return resolveMode(this.comment, this.config); },
      active() { return eligible(this.comment, this.config); },
      appearance() {
        const duration = Number(this.config.FLASH_DURATION);
        const strength = Number(this.config.FLASH_STRENGTH);
        return {
          '--flash-color': resolveColor(this.comment, this.config),
          '--flash-duration': (Number.isFinite(duration) ? Math.min(12, Math.max(1, duration)) : 3) + 's',
          '--flash-strength': Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : .75
        };
      }
    },
    template: `<div v-if="active" class="v3-flash-layer" :data-flash-mode="mode" :class="{ 'v3-flash-background-layer': mode === 'aurora-background' }" :style="appearance" aria-hidden="true">
      <div class="v3-flash-glow"></div>
      <div v-if="mode === 'aurora-background'" class="v3-flash-aurora-background"></div>
      <div v-if="mode === 'aurora'" class="v3-flash-aurora"><div class="v3-flash-aurora-ribbon"></div></div>
      <svg v-if="mode === 'trace'" class="v3-flash-trace">
        <rect class="v3-flash-trace-halo" pathLength="100" />
        <rect class="v3-flash-trace-core" pathLength="100" />
      </svg>
      <div v-if="mode === 'shimmer'" class="v3-flash-clip"><div class="v3-flash-band"></div></div>
      <div v-if="mode === 'sweep'" class="v3-flash-clip"><div class="v3-flash-sweep"></div></div>
      <div v-if="mode === 'glint'" class="v3-flash-glints">
        <svg v-for="size in ['large', 'small']" :key="size" class="v3-flash-glint" :class="'v3-flash-glint--' + size" viewBox="0 0 40 40">
          <path d="M20 0L24 15L40 20L24 25L20 40L16 25L0 20L16 15Z" />
          <path class="v3-flash-glint-core" d="M20 8L22 18L32 20L22 22L20 32L18 22L8 20L18 18Z" />
        </svg>
      </div>
    </div>`
  } });
})();
