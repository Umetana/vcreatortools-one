// 共通カードを通常ログと配置カードの両方で描画する。
(function () {
  'use strict';
  const { ref, reactive, watch, nextTick, onMounted, onBeforeUnmount } = Vue;
  // 設定変更は新着の受付だけに適用し、配置済みカードは消さない。
  window.VCT_BOARD_ELIGIBLE = (comment, config) => {
    if (!config.SUPPORT_BOARD_ENABLED) return false;
    const key = {
      superchat: 'SUPPORT_BOARD_SUPERCHAT',
      supersticker: 'SUPPORT_BOARD_SUPERSTICKER',
      jewel: 'SUPPORT_BOARD_JEWEL',
      membership_gift: 'SUPPORT_BOARD_MEMBERSHIP_GIFT',
      membership_gift_received: 'SUPPORT_BOARD_GIFT_RECEIVED',
      unknown: 'SUPPORT_BOARD_OTHER',
    }[comment.eventKind];
    if (!key || (comment.eventKind === 'unknown' && !comment.isSupport)) return false;
    return key === 'SUPPORT_BOARD_SUPERCHAT' ? config[key] !== false : config[key] === true;
  };
  window.VCT_COMMENT_CARD = {
    props: ['cmt', 'config'], template: '#comment-card-template',
    components: { StarsEffect: window.VCT_STARS.component, HeartEffect: window.VCT_HEART.component, FlashEffect: window.VCT_FLASH.component }
  };
  window.VCT_SUPPORT_BOARD = {
    props: ['cards', 'config'], emits: ['remove'],
    components: { CommentCard: window.VCT_COMMENT_CARD },
    setup(props, { emit }) {
      const launcherHidden = ref(false);
      const store = window.VCT_BOARD_STORE;
      const storageError = ref(store.error);
      const storageStatus = event => { storageError.value = event.detail; };
      const editing = ref(false), layer = ref(null), positions = reactive(store.read().positions);
      let drag = null, order = Math.max(0, ...Object.values(positions).map(p=>p.z)), observer;
      const release = () => {
        if (drag?.el.hasPointerCapture(drag.pointerId)) drag.el.releasePointerCapture(drag.pointerId);
        if (drag) store.setPositions(positions);
        drag = null;
      };
      // 対話を閉じた際にCSSのhoverが残っても、操作を再開するまで表示を抑止する。
      const suspendLauncher = () => {
        launcherHidden.value = true;
        document.getElementById('support-board-toggle')?.blur();
        release();
      };
      const resumeLauncher = () => { launcherHidden.value = false; };
      const visibilityChanged = () => { if (document.hidden) suspendLauncher(); };
      const toggle = () => { editing.value = !editing.value; release(); };
      const layout = () => {
        if (!layer.value) return;
        for (const el of layer.value.querySelectorAll('.support-board-card')) {
          const key = el.dataset.key, rect = el.getBoundingClientRect();
          const maxX = Math.max(0, window.innerWidth - rect.width), maxY = Math.max(0, window.innerHeight - rect.height);
          if (!positions[key]) positions[key] = { x: Math.random() * maxX, y: Math.random() * maxY, z: ++order };
          positions[key].x = Math.min(maxX, Math.max(0, positions[key].x));
          positions[key].y = Math.min(maxY, Math.max(0, positions[key].y));
          observer?.observe(el);
        }
        if (props.cards.length) store.setPositions(positions);
      };
      const style = card => {
        const p = positions[card.displayOrder];
        return { left: (p?.x || 0) + 'px', top: (p?.y || 0) + 'px', zIndex: p?.z || 0,
          visibility: p ? 'visible' : 'hidden', width: Math.min(window.innerWidth, Math.max(180, Math.min(1200, Number(props.config.SUPPORT_BOARD_WIDTH) || 420))) + 'px' };
      };
      const down = (event, card) => {
        if (!editing.value || event.button !== 0 || event.target.closest('button')) return;
        event.preventDefault(); release();
        const p = positions[card.displayOrder]; if (!p) return;
        p.z = ++order;
        const el = event.currentTarget;
        drag = { el, pointerId: event.pointerId, p, dx: event.clientX - p.x, dy: event.clientY - p.y };
        el.setPointerCapture(event.pointerId);
      };
      const move = event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const r = drag.el.getBoundingClientRect();
        drag.p.x = Math.max(0, Math.min(window.innerWidth - r.width, event.clientX - drag.dx));
        drag.p.y = Math.max(0, Math.min(window.innerHeight - r.height, event.clientY - drag.dy));
      };
      const remove = card => { release(); emit('remove', card.displayOrder); };
      const keydown = event => {
        if (event.repeat || event.isComposing || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
        // 埋め込みブラウザでcodeが空でも、文字キーから判定できるようにする。
        const isEditKey = event.code === 'KeyE' || String(event.key || '').toLowerCase() === 'e';
        if (props.config.SUPPORT_BOARD_ENABLED && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && isEditKey) { event.preventDefault(); resumeLauncher(); toggle(); }
        if (event.key === 'Escape' && editing.value) { editing.value = false; release(); }
      };
      watch(() => [props.cards.map(c => c.displayOrder).join(','), props.config.SUPPORT_BOARD_ENABLED, props.config.SUPPORT_BOARD_WIDTH], async () => {
        if (drag && (!props.config.SUPPORT_BOARD_ENABLED || !props.cards.some(c => String(c.displayOrder) === drag.el.dataset.key))) release();
        if (!props.config.SUPPORT_BOARD_ENABLED) editing.value = false;
        const keys = new Set(props.cards.map(c => String(c.displayOrder)));
        for (const key of Object.keys(positions)) if (!keys.has(key)) delete positions[key];
        observer?.disconnect(); await nextTick(); layout();
      }, { immediate: true });
      onMounted(() => { observer = new ResizeObserver(layout); layout(); window.addEventListener('vct-board-storage-status', storageStatus); window.addEventListener('resize', layout); window.addEventListener('keydown', keydown); window.addEventListener('blur', suspendLauncher); document.addEventListener('mouseleave', suspendLauncher); document.addEventListener('visibilitychange', visibilityChanged); window.addEventListener('pointermove', resumeLauncher); });
      onBeforeUnmount(() => { release(); observer?.disconnect(); window.removeEventListener('vct-board-storage-status', storageStatus); window.removeEventListener('resize', layout); window.removeEventListener('keydown', keydown); window.removeEventListener('blur', suspendLauncher); document.removeEventListener('mouseleave', suspendLauncher); document.removeEventListener('visibilitychange', visibilityChanged); window.removeEventListener('pointermove', resumeLauncher); });
      return { storageError, launcherHidden, resumeLauncher, editing, layer, style, toggle, down, move, release, remove };
    },
    template: `<teleport to="body"><div v-if="config.SUPPORT_BOARD_ENABLED" ref="layer" class="support-board" :class="{'is-editing':editing}">
      <div v-for="card in cards" :key="card.displayOrder" class="support-board-card" :data-key="card.displayOrder" :style="style(card)"
        @pointerdown="down($event,card)" @pointermove="move" @pointerup="release" @pointercancel="release" @lostpointercapture="release" @dragstart.prevent>
        <comment-card :cmt="card" :config="config"></comment-card>
        <button v-if="editing" class="support-board-remove" type="button" :aria-label="card.name+'のカードを削除'" @pointerdown.stop @click.stop="remove(card)">×</button>
      </div>
      <span v-if="storageError" class="support-board-error" role="status">{{storageError}}</span>
      <button id="support-board-toggle" :class="{'is-suspended':launcherHidden}" @focus="resumeLauncher" type="button" :aria-pressed="editing" title="配置編集 ON/OFF（Alt+Shift+E）" aria-label="ギフトカードの配置編集" @click="toggle">⚙<small v-if="editing">編集</small></button>
    </div></teleport>`
  };
})();
