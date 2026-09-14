// view comment V3

const { createApp, ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } = window.Vue || Vue;

createApp({
  components: { StarsEffect: window.VCT_STARS.component, HeartEffect: window.VCT_HEART.component, FlashEffect: window.VCT_FLASH.component },
  setup() {
    const comments = ref([]);
    const C = reactive({ ...(window.CONFIG || {}) });
    const appliedConfig = { ...(window.CONFIG || {}) };
    const display = window.VCT_DISPLAY;
    const isPopup = computed(() => display.popup(C));
    const isUnderbar = computed(() => C.DISPLAY_MODE === 'underbar');
    const displayStyle = cmt => display.style(cmt, C);
    let displayOrder = 0;
    const removeDisplayed = key => {
      const index = comments.value.findIndex(c => c.displayOrder === key);
      if (index !== -1) comments.value.splice(index, 1);
    };
    const lifetime = display.createLifetime(removeDisplayed);
    const underbar = window.VCT_UNDERBAR.create(removeDisplayed);
    let displayRevision = 0;
    const syncDisplay = () => {
      if (isUnderbar.value) {
        lifetime.clear();
        const revision = ++displayRevision;
        nextTick(() => { if (revision === displayRevision && isUnderbar.value) underbar.sync(Array.from(document.querySelectorAll('.cmt-shell')), C); });
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
        (hasOwn(runtime.localOverrides, 'BG_GLASS') && !hasOwn(runtime.localOverrides, 'BG_COLOR')) ||
        (hasOwn(runtime.fileConfig, 'BG_GLASS') && !hasOwn(runtime.fileConfig, 'BG_COLOR'));
      if (usesLegacySetting) return C.BG_GLASS || 'rgba(0, 0, 0, 0.45)';

      const color = String(C.BG_COLOR || '').trim();
      const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (!match) return C.BG_GLASS || 'rgba(0, 0, 0, 0.45)';
      const opacity = Math.min(1, Math.max(0, Number(C.BG_OPACITY ?? 0.45)));
      return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${opacity})`;
    };

    const updateStyle = () => {
      const root = document.documentElement;
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

      const app = document.getElementById('app');
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
        const refreshed = current.raw ? parseComment(current.raw) : null;
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

    const handleSettingsPreview = (event) => {
      applyPreviewConfig(event.detail);
    };

    const handleSettingsReset = () => {
      applyPreviewConfig(appliedConfig);
    };

    const normalizeComment = (parsed, raw) => {
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
        raw
      };
    };

    const parseComment = (raw) => {
      if (!window.VCT_SDK?.normalize) return null;
      return normalizeComment(VCT_SDK.normalize(raw), raw);
    };

    const addComment = (raw) => {
      const comment = parseComment(raw);
      if (!comment) return;

      if (comments.value.some(c => c.id === comment.id)) return;

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

    const handleDisplayResize = () => {
      if (isUnderbar.value) syncDisplay();
    };
    onMounted(() => {
      window.addEventListener('resize', handleDisplayResize);
      updateStyle();
      window.addEventListener('vct-settings-preview', handleSettingsPreview);
      window.addEventListener('vct-settings-reset-preview', handleSettingsReset);
      if (!window.OneSDK) {
        console.error('OneSDK not found.');
        return;
      }

      OneSDK.setup({
        mode: 'diff',
        permissions: ['comments', 'clear']
      });

      OneSDK.subscribe({
        action: 'comments',
        callback: (res) => {
          const list = Array.isArray(res) ? res : [res];
          list.forEach(addComment);
        }
      });

      OneSDK.subscribe({
        action: 'clear',
        callback: () => {
          ++displayRevision;
          underbar.reset();
          lifetime.clear();
          comments.value = [];
        }
      });

      OneSDK.ready().then(() => {
        OneSDK.connect();
        console.log(`View Comment V3: Ready (SDK: ${VCT_SDK.VERSION}, Stack: ${C.STACK_DIRECTION || 'up'})`);
      });
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleDisplayResize);
      ++displayRevision;
      underbar.reset();
      lifetime.clear();
      window.removeEventListener('vct-settings-preview', handleSettingsPreview);
      window.removeEventListener('vct-settings-reset-preview', handleSettingsReset);
    });

    return {
      comments,
      config: C,
      stackClass,
      isPopup,
      isUnderbar,
      displayStyle
    };
  }
}).mount('#app');
