// カード上を淡く光りながら漂う飾り。コメントの滞在時間や受信処理は変更しない。
(function () {
  'use strict';
  const receiver = c => c.parsed?.membership?.isGiftReceiver || c.parsed?.event?.kind === 'membership_gift_received';
  const eligible = (comment, config) => config.COMMENT_EFFECT === 'christmas' && !comment.isSticky && !receiver(comment);
  const component = {
    props: ['comment', 'config'],
    data() { return { failed: false }; },
    computed: {
      active() { return eligible(this.comment, this.config); },
      support() { return this.comment.isSupport === true; },
      generated() { return this.config.CHRISTMAS_ASSET_MODE !== 'plain' && !this.failed; },
      moving() { return !this.config.REDUCED_MOTION; },
      duration() { return this.support ? 1400 : 900; },
      icons() { return this.support ? [['gift-bell-v1.png', '🔔'], ['ribbon-red-v1.png', '🎀']] : [['star-gold-v1.png', '⭐']]; }
    },
    methods: {
      pulseStyle() {
        // 設定変更や表示方式切替で再作成されても、過去の新着発光を再生しない。
        const age = Math.max(0, Date.now() - Number(this.comment.displayStartedAt || 0));
        return { animationDelay: `${-age}ms`, animationDuration: `${this.duration}ms` };
      },
      driftStyle(index) {
        const period = this.support ? (index ? 17000 : 12000) : 14000;
        return { animationDuration: `${period}ms`, animationDelay: `${-((Number(this.comment.displayOrder) || 0) * 2300 + index * 5100) % period}ms` };
      },
      sparkStyle(n) {
        const order = Number(this.comment.displayOrder) || 0;
        return { '--spark-x': `${9 + (n * 31 + order * 17) % 82}%`, '--spark-y': `${12 + n * 23 % 68}%`,
          '--spark-end-x': `${9 + (n * 47 + order * 13) % 82}%`, '--spark-end-y': `${12 + n * 41 % 68}%`,
          animationDuration: `${6500 + n * 700}ms`, animationDelay: `${-(order * 900 + n * 1800)}ms` };
      }
    },
    template: `<div v-if="active" class="fx-christmas-card" :class="{'is-support': support, 'is-still': !moving}" aria-hidden="true">
      <div class="fx-christmas-card-icons">
        <span v-for="(icon, index) in icons" :key="icon[0]" class="fx-christmas-card-icon" :style="driftStyle(index)">
          <img v-if="generated" :src="'./assets/' + icon[0]" alt="" draggable="false" @error="failed = true">
          <span v-else>{{icon[1]}}</span>
        </span>
      </div>
      <span v-if="moving" class="fx-christmas-card-arrival" :class="{'fx-christmas-card-ring': support}" :style="pulseStyle()"></span>
      <div v-if="moving" class="fx-christmas-card-sparks">
        <span v-for="n in (support ? 6 : 3)" :key="n" class="fx-christmas-card-spark" :class="'is-' + n" :style="sparkStyle(n)">✦</span>
      </div>
    </div>`
  };
  window.VCT_CHRISTMAS_CARD = Object.freeze({ eligible, component });
})();
