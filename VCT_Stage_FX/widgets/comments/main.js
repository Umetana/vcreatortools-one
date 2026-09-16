// V3の表示を領域内に隔離。購読・正規化・発火はStage側が所有する。
(function () {

const { createApp, ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } = window.Vue || Vue;

class CommentWidget {
  constructor(region) {
    this.region = region;
    const mount = document.createElement('div');
    mount.className = 'vct-comments';
    region.appendChild(mount);
    const owner = this;
    this.vueApp = createApp({
      template: `
        <!-- コメントリスト -->
        <transition-group :css="!isUnderbar" :name="isPopup ? 'popup' : 'list'" tag="div" class="cmt-list">
          <div v-for="cmt in comments" :key="cmt.displayOrder" class="cmt-shell" :style="displayStyle(cmt)" :data-display-order="cmt.displayOrder">
            <div class="cmt" :class="{ 'cmt-gift': cmt.isSupport, 'cmt-member': cmt.isMembership, 'cmt-system': cmt.isSticky }"
              :style="cmt.giftColor ? { '--gift-color': cmt.giftColor } : {}">
              <stars-effect :comment="cmt" :config="decorationConfig"></stars-effect>
              <heart-effect :comment="cmt" :config="decorationConfig"></heart-effect>
              <flash-effect :comment="cmt" :config="decorationConfig"></flash-effect>

              <!-- アイコン -->
              <div v-if="config.SHOW_ICON && cmt.profileImage" class="cmt__icon">
                <img :src="cmt.profileImage" alt="">
              </div>

              <div class="cmt__content">
                <!-- ヘッダー (名前・バッジ・メタ情報) -->
                <div v-if="config.SHOW_NAME || config.SHOW_BADGES || config.SHOW_USER_FLAGS || cmt.metaLabels.length" class="cmt__header">
                  <span v-if="config.SHOW_NAME" class="cmt__name">{{ cmt.name }}</span>
                  <div v-if="config.SHOW_BADGES" class="cmt__badges">
                    <span v-for="(b, i) in cmt.badges" :key="b.url || b.label || i" class="cmt__badge">
                      <img v-if="b.url" :src="b.url" :title="b.label">
                      <span v-else class="cmt__badge-text">{{ b.label }}</span>
                    </span>
                  </div>
                  <div v-if="config.SHOW_USER_FLAGS && cmt.userFlags.length" class="cmt__user-flags">
                    <span v-for="flag in cmt.userFlags" :key="flag.type" class="cmt__user-flag"
                      :class="'cmt__user-flag--' + flag.type">{{ flag.text }}</span>
                  </div>
                  <div v-if="cmt.metaLabels.length" class="cmt__meta">
                    <span v-for="(label, i) in cmt.metaLabels" :key="label.type + ':' + label.text + ':' + i" class="cmt__meta-label"
                      :class="'cmt__meta-label--' + label.type">{{ label.text }}</span>
                  </div>
                </div>

                <!-- メッセージ本文 (テキスト+絵文字混合対応) -->
                <div v-if="cmt.parts.length" class="cmt__message">
                  <template v-for="(p, i) in cmt.parts" :key="i">
                    <span v-if="p.type === 'text'">{{ p.content }}</span>
                    <img v-else-if="p.type === 'emoji'" :src="p.url" class="emoji" :class="{ 'emoji--sticker': p.isSticker }"
                      :alt="p.alt">
                  </template>
                </div>
                <div v-if="cmt.translationParts && cmt.translationParts.length" class="cmt__message cmt__message--translation">
                  <template v-for="(p, i) in cmt.translationParts" :key="'tr-' + i">
                    <span v-if="p.type === 'text'">{{ p.content }}</span>
                    <img v-else-if="p.type === 'emoji'" :src="p.url" class="emoji" :class="{ 'emoji--sticker': p.isSticker }"
                      :alt="p.alt">
                  </template>
                </div>
              </div>

            </div>
          </div>
        </transition-group>
      `,
      components: { StarsEffect: window.VCT_STARS.component, HeartEffect: window.VCT_HEART.component, FlashEffect: window.VCT_FLASH.component },
      setup() {
        const comments = ref([]);
        const C = reactive({ ...(window.CONFIG || {}) });

        const display = window.VCT_DISPLAY;
        const isPopup = computed(() => display.popup(C));
        const isUnderbar = computed(() => C.DISPLAY_MODE === 'underbar');
        const displayStyle = cmt => display.style(cmt, C);
        const decorationConfig = computed(() => C.REDUCED_MOTION ? { ...C, COMMENT_EFFECT: "none" } : C);
        let displayOrder = 0;
        const removeDisplayed = key => {
          const index = comments.value.findIndex(c => c.displayOrder === key);
          if (index !== -1) comments.value.splice(index, 1);
        };
        const lifetime = display.createLifetime(removeDisplayed);
        const underbar = window.VCT_UNDERBAR.create(removeDisplayed, { now: () => performance.now(), frame: fn => requestAnimationFrame(fn), cancel: id => cancelAnimationFrame(id), width: () => region.clientWidth });
        let displayRevision = 0;
        const syncDisplay = () => {
          if (isUnderbar.value) {
            lifetime.clear();
            const revision = ++displayRevision;
            nextTick(() => { if (revision === displayRevision && isUnderbar.value) underbar.sync(Array.from(mount.querySelectorAll('.cmt-shell:not(.list-leave-active):not(.popup-leave-active)')), C); });
            return;
          }
          const count = display.capacity(C);
          if (comments.value.length > count) comments.value.splice(0, comments.value.length - count);
          lifetime.sync(comments.value, C);
        };


        const resolveBackgroundColor = () => {
          const runtime = window.VCT_CONFIG_RUNTIME || {};
          const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);
          const usesLegacySetting =
            (hasOwn(runtime.localOverrides, 'BG_GLASS') && !hasOwn(runtime.localOverrides, 'COMMENT_BG_COLOR')) ||
            (hasOwn(runtime.fileConfig, 'BG_GLASS') && !hasOwn(runtime.fileConfig, 'COMMENT_BG_COLOR'));
          if (usesLegacySetting) return C.BG_GLASS || 'rgba(0, 0, 0, 0.45)';

          const color = String(C.COMMENT_BG_COLOR || '').trim();
          const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
          if (!match) return C.BG_GLASS || 'rgba(0, 0, 0, 0.45)';
          const opacity = Math.min(1, Math.max(0, Number(C.BG_OPACITY ?? 0.45)));
          return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${opacity})`;
        };

        const updateStyle = () => {
          const root = mount;
          root.style.setProperty('--max-width', C.MAX_WIDTH || '900px');
          root.style.setProperty('--font-size', (C.FONT_SIZE || 24) + 'px');
          root.style.setProperty('--font-family', C.FONT_FAMILY || 'sans-serif');
          root.style.setProperty('--icon-size', (C.ICON_SIZE || 48) + 'px');
          root.style.setProperty('--meta-scale', C.META_SCALE || 0.8);
          root.style.setProperty('--item-gap', (C.ITEM_GAP_PX !== undefined ? C.ITEM_GAP_PX : 12) + 'px');
          root.style.setProperty('--fade-in', (C.FADE_IN_MS || 300) + 'ms');
          root.style.setProperty('--fade-out', (C.FADE_OUT_MS || 500) + 'ms');
          root.style.setProperty('--gift-bg-opacity', (C.GIFT_BG_OPACITY !== undefined ? C.GIFT_BG_OPACITY : 0.4));
          root.style.setProperty('--gift-border-opacity', (C.GIFT_BORDER_OPACITY !== undefined ? C.GIFT_BORDER_OPACITY : 0.8));
          root.style.setProperty('--member-bg-opacity', (C.MEMBER_BG_OPACITY !== undefined ? C.MEMBER_BG_OPACITY : 0.9));
          root.style.setProperty('--member-border-opacity', (C.MEMBER_BORDER_OPACITY !== undefined ? C.MEMBER_BORDER_OPACITY : 1.0));

          root.style.setProperty('--bg-glass', resolveBackgroundColor());
          root.style.setProperty('--bg-blur', C.BG_BLUR || '12px');
          root.style.setProperty('--base-border-color', C.BASE_BORDER_COLOR || '#ffffff');
          root.style.setProperty('--base-border-opacity', (C.BASE_BORDER_OPACITY !== undefined ? C.BASE_BORDER_OPACITY : 0.15));
          root.style.setProperty('--base-border-width', (C.BASE_BORDER_WIDTH !== undefined ? C.BASE_BORDER_WIDTH : 1) + 'px');
          root.style.setProperty('--system-border-opacity', (C.SYSTEM_BORDER_OPACITY !== undefined ? C.SYSTEM_BORDER_OPACITY : 0.35));
          root.style.setProperty('--text-main', C.TEXT_MAIN || '#ffffff');
          root.style.setProperty('--text-name', C.TEXT_NAME || '#eeeeee');
          root.style.setProperty('--accent-color', C.ACCENT_COLOR || '#ffd700');
          root.style.setProperty('--shadow-soft', C.SHADOW_SOFT || '0 4px 12px rgba(0, 0, 0, 0.3)');

          const app = mount;
          if (app) {
            app.classList.remove('stack-up', 'stack-down');
            app.classList.add(stackClass.value);
            app.classList.toggle('display-popup', isPopup.value);
            app.classList.toggle('display-underbar', isUnderbar.value);
            const u = window.VCT_UNDERBAR.settings(C);
            root.style.setProperty('--underbar-width', u.width + 'px');
            root.style.setProperty('--underbar-bottom', u.bottom + 'px');
          }
        };

        const stackClass = computed(() => {
          const dir = (C.STACK_DIRECTION || 'up').toLowerCase();
          return dir === 'down' ? 'stack-down' : 'stack-up';
        });

        const extractMembershipMonths = (parsed) => {
          const membership = parsed?.membership || {};
          const source = `${membership.primary || ''} ${membership.sub || ''}`;
          const match = source.match(/(\d+|N)\s*(?:か月|ヶ月|カ月|ヵ月|月|年)/u);
          if (!match) return '';

          if (match[0].includes('年')) {
            return `${match[1]}年`;
          }

          return `${match[1]}ヶ月`;
        };

        const buildMetaLabels = (parsed) => {
          const event = parsed?.event || {};
          const labels = [];

          if (event.kind === 'superchat') {
            const amountText = event.displayLabel === 'スパチャ' ? '' : event.displayLabel;
            labels.push({ type: 'gift', text: amountText ? `スパチャ ${amountText}` : 'スパチャ' });
          } else if (event.kind === 'supersticker') {
            const amountText = event.displayLabel === 'ステッカー' ? '' : event.displayLabel;
            labels.push({ type: 'gift', text: amountText ? `ステッカー ${amountText}` : 'ステッカー' });
          } else if (event.kind === 'jewel') {
            labels.push({ type: 'gift', text: event.displayLabel || 'ジュエル' });
          } else if (event.kind === 'membership_gift') {
            const count = parsed?.membership?.giftCount || 0;
            labels.push({ type: 'gift', text: count ? `メンギフ ${count}件` : 'メンギフ' });
          } else if (event.kind === 'membership_gift_received') {
            labels.push({ type: 'gift', text: 'メンギフ受取' });
          } else if (event.kind === 'unknown' && event.isSupport) {
            labels.push({ type: 'gift', text: event.displayLabel || 'ギフト' });
          }

          if (event.kind === 'member_join') {
            labels.push({ type: 'member', text: 'メンバー加入' });
          } else if (event.kind === 'member_milestone' || event.kind === 'membership_event') {
            const months = extractMembershipMonths(parsed);
            labels.push({ type: 'member', text: months ? `メンバー ${months}` : 'メンバー' });
          }

          if (parsed?.system?.sticky) {
            labels.push({ type: 'system', text: '固定' });
          }

          return labels;
        };

        const truncateParts = (parts) => {
          const limit = Number(C.MAX_COMMENT_UNITS || 0);
          if (!limit || limit <= 0) return parts;

          const result = [];
          let used = 0;
          let truncated = false;

          for (const part of parts) {
            if (part.type === 'text') {
              const chars = Array.from(part.content || '');
              const remaining = limit - used;

              if (remaining <= 0) {
                truncated = true;
                break;
              }

              if (chars.length > remaining) {
                result.push({ ...part, content: chars.slice(0, remaining).join('') });
                truncated = true;
                break;
              }

              result.push(part);
              used += chars.length;
              continue;
            }

            const cost = 2;
            if (used + cost > limit) {
              truncated = true;
              break;
            }

            result.push(part);
            used += cost;
          }

          if (truncated) {
            result.push({ type: 'text', content: '...' });
          }

          return result;
        };

        const getEventMessageSetting = (kind) => {
          const map = {
            superchat: C.SHOW_EVENT_MESSAGE_SUPERCHAT,
            supersticker: C.SHOW_EVENT_MESSAGE_SUPERSTICKER,
            member_milestone: C.SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT,
            membership_event: C.SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT,
            member_join: C.SHOW_EVENT_MESSAGE_MEMBER_JOIN,
            membership_gift: C.SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT,
            membership_gift_received: C.SHOW_EVENT_MESSAGE_GIFT_RECEIVED
          };

          return Object.prototype.hasOwnProperty.call(map, kind) ? map[kind] : undefined;
        };

        const shouldShowEventMessage = (parsed) => {
          const event = parsed?.event || {};
          const kind = event.kind || 'normal';

          if (kind === 'normal') return true;
          if (C.SHOW_EVENT_MESSAGES === false) return false;

          const setting = getEventMessageSetting(kind);
          if (setting !== undefined) {
            return setting !== false;
          }

          return event.shouldShowMessage !== false;
        };

        const getTranslationMode = () => {
          const mode = String(C.COMMENT_TRANSLATION_MODE || 'original').toLowerCase();
          return ['original', 'translated', 'both'].includes(mode) ? mode : 'original';
        };

        const getDisplayParts = (parsed) => {
          if (!shouldShowEventMessage(parsed)) {
            return { parts: [], translationParts: [] };
          }

          const messageParts = parsed?.message?.parts || [];
          const announcementText = parsed?.event?.announcementText || '';
          const parts = messageParts.length > 0
            ? messageParts
            : (announcementText ? [{ type: 'text', content: announcementText }] : []);
          const translation = parsed?.message?.translation || {};
          const translationParts = translation.available
            ? (Array.isArray(translation.parts) && translation.parts.length
              ? translation.parts
              : [{ type: 'text', content: translation.text || '' }].filter(part => part.content))
            : [];
          const mode = getTranslationMode();

          if (mode === 'translated' && translationParts.length) {
            return { parts: truncateParts(translationParts), translationParts: [] };
          }

          if (mode === 'both' && translationParts.length) {
            return {
              parts: truncateParts(parts),
              translationParts: truncateParts(translationParts)
            };
          }

          return { parts: truncateParts(parts), translationParts: [] };
        };

        const buildUserFlags = (user = {}) => {
          if (user.roles?.owner) {
            return [{ type: 'owner', text: 'OWNER' }];
          }

          if (user.roles?.moderator) {
            return [{ type: 'moderator', text: 'MOD' }];
          }

          return [];
        };

        const applyPreviewConfig = (nextConfig) => {
          if (!nextConfig || typeof nextConfig !== 'object') return;
          const previousMode = C.DISPLAY_MODE;
          if (previousMode === 'underbar') { underbar.reset(); ++displayRevision; }
          Object.assign(C, nextConfig);
          const modeChanged = previousMode !== C.DISPLAY_MODE;
          updateStyle();

          comments.value = comments.value.map((current) => {
            const refreshed = normalizeComment(current.parsed);
            if (!refreshed) return current;

            return {
              ...refreshed,
              popupSeed: current.popupSeed,
              displayOrder: current.displayOrder,
              displayStartedAt: modeChanged ? Date.now() : current.displayStartedAt,
              effectSeeds: current.effectSeeds,
              starSeeds: current.starSeeds,
              flashMode: current.flashMode,
              giftColor: refreshed.isSpecial ? refreshed.colorStr : null,
              timestamp: current.timestamp
            };
          });

          syncDisplay();
        };

        const normalizeComment = (parsed) => {
          const event = parsed?.event || {};
          const isSpecial = !!(event.isSupport || event.isMembership || parsed.system?.sticky);
          const isSupport = !!event.isSupport;
          const isMembership = !!event.isMembership;
          const displayParts = getDisplayParts(parsed);

          return {
            id: parsed.id,
            name: parsed.user?.displayName || parsed.user?.name || 'Anonymous',
            profileImage: parsed.user?.profileImage || '',
            badges: parsed.user?.badges || [],
            userFlags: buildUserFlags(parsed.user),
            parts: displayParts.parts,
            translationParts: displayParts.translationParts,
            hasTranslation: !!parsed.message?.translation?.available,
            hasGift: isSupport,
            isSupport,
            isMembership,
            isSticky: !!parsed.system?.sticky,
            isSpecial,
            colorStr: parsed.style?.colorString,
            metaLabels: buildMetaLabels(parsed),
            parsed
          };
        };

        const addComment = (parsed) => {
          const comment = normalizeComment(parsed);
          if (!comment) return;

          // 受信の重複抑制はadapterが担当。IDなしの表示も受け付ける。

          const newCmt = {
            ...comment,
            popupSeed: display.createSeed(),
            displayOrder: ++displayOrder,
            displayStartedAt: Date.now(),
            effectSeeds: window.VCT_HEART.createSeeds(),
            starSeeds: window.VCT_STARS.createSeeds(),
            // 表示中のプレビューや演出切り替えでも抽選結果を維持する。
            flashMode: window.VCT_FLASH.createMode(),
            giftColor: comment.isSpecial ? comment.colorStr : null,
            timestamp: Date.now()
          };

          comments.value.push(newCmt);
          syncDisplay();
        };

        owner.configure = next => {
          applyPreviewConfig(next);
          region.classList.toggle('show-frame', next.SHOW_COMMENT_FRAME === true);
        };
        owner.add = addComment;
        owner.clear = () => { ++displayRevision; underbar.reset(); lifetime.clear(); comments.value = []; };
        onMounted(updateStyle);
        onBeforeUnmount(() => { ++displayRevision; underbar.reset(); lifetime.clear(); });

        return {
          comments,
          config: C,
          decorationConfig,
          stackClass,
          isPopup,
          isUnderbar,
          displayStyle
        };
      }
    });
    this.vueApp.mount(mount);
  }
  destroy() { this.vueApp.unmount(); this.region.replaceChildren(); }
}
window.VCTStage.CommentWidget = CommentWidget;
})();
