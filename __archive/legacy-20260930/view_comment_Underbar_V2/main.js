// view comment Underbar V2

const { createApp, ref, reactive, computed, onMounted, onBeforeUnmount } = window.Vue || Vue;

createApp({
  setup() {
    const comments = ref([]);
    const C = reactive({ ...(window.CONFIG || {}) });
    const appliedConfig = { ...(window.CONFIG || {}) };
    const removeTimers = new Map();
    const stackTrackOffset = ref(0);
    const stackTrackTransitionMs = ref(0);
    let laneAvailableAt = [];
    let stackSlideTimer = null;

    const updateStyle = () => {
      const root = document.documentElement;
      root.style.setProperty('--max-width', C.MAX_WIDTH || '900px');
      root.style.setProperty('--font-size', (C.FONT_SIZE || 24) + 'px');
      root.style.setProperty('--font-family', C.FONT_FAMILY || 'sans-serif');
      root.style.setProperty('--icon-size', (C.ICON_SIZE || 48) + 'px');
      root.style.setProperty('--meta-scale', C.META_SCALE || 0.8);
      root.style.setProperty('--item-gap', (C.ITEM_GAP_PX !== undefined ? C.ITEM_GAP_PX : 12) + 'px');
      root.style.setProperty('--underbar-bottom', (C.UNDERBAR_BOTTOM_PX !== undefined ? C.UNDERBAR_BOTTOM_PX : 28) + 'px');
      root.style.setProperty('--underbar-side-padding', (C.UNDERBAR_SIDE_PADDING_PX !== undefined ? C.UNDERBAR_SIDE_PADDING_PX : 32) + 'px');
      root.style.setProperty('--underbar-card-min-width', C.UNDERBAR_CARD_MIN_WIDTH || '180px');
      root.style.setProperty('--underbar-card-max-width', C.UNDERBAR_CARD_WIDTH || '760px');
      root.style.setProperty('--underbar-card-height', (C.UNDERBAR_CARD_HEIGHT_PX || 92) + 'px');
      root.style.setProperty('--underbar-stack-card-height', (C.UNDERBAR_STACK_CARD_HEIGHT_PX || 128) + 'px');
      root.style.setProperty('--underbar-stack-message-lines', Math.max(1, Math.floor(Number(C.UNDERBAR_STACK_MESSAGE_LINES || 3))));
      root.style.setProperty('--underbar-stack-slide-ms', (C.UNDERBAR_STACK_SLIDE_MS || 450) + 'ms');
      root.style.setProperty('--underbar-lane-height', (C.UNDERBAR_LANE_HEIGHT_PX || 104) + 'px');
      root.style.setProperty('--message-marquee-duration', (C.MESSAGE_MARQUEE_MS || 9000) + 'ms');
      root.style.setProperty('--fade-in', (C.FADE_IN_MS || 300) + 'ms');
      root.style.setProperty('--fade-out', (C.FADE_OUT_MS || 500) + 'ms');
      root.style.setProperty('--gift-bg-opacity', (C.GIFT_BG_OPACITY !== undefined ? C.GIFT_BG_OPACITY : 0.4));
      root.style.setProperty('--gift-border-opacity', (C.GIFT_BORDER_OPACITY !== undefined ? C.GIFT_BORDER_OPACITY : 0.8));
      root.style.setProperty('--member-bg-opacity', (C.MEMBER_BG_OPACITY !== undefined ? C.MEMBER_BG_OPACITY : 0.9));
      root.style.setProperty('--member-border-opacity', (C.MEMBER_BORDER_OPACITY !== undefined ? C.MEMBER_BORDER_OPACITY : 1.0));

      root.style.setProperty('--bg-glass', C.BG_GLASS || 'rgba(0, 0, 0, 0.45)');
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
        app.classList.remove('underbar-rtl', 'underbar-ltr', 'underbar-ticker', 'underbar-stack');
        app.classList.add(...appClass.value);
      }
    };

    const isStackMode = computed(() => String(C.UNDERBAR_LAYOUT_MODE || 'ticker').toLowerCase() === 'stack');

    const directionClass = computed(() => {
      const dir = (C.UNDERBAR_DIRECTION || 'rtl').toLowerCase();
      return dir === 'ltr' ? 'underbar-ltr' : 'underbar-rtl';
    });

    const appClass = computed(() => [
      directionClass.value,
      isStackMode.value ? 'underbar-stack' : 'underbar-ticker'
    ]);

    const getLaneCount = () => Math.max(1, Math.floor(Number(C.UNDERBAR_LANES || 2)));
    const getScrollDuration = () => Math.max(1000, Math.floor(Number(C.UNDERBAR_SCROLL_MS || 14000)));
    const getActiveMaxItems = () => Math.max(1, Math.floor(Number(
      isStackMode.value ? (C.UNDERBAR_STACK_MAX_ITEMS || C.MAX_ITEMS || 5) : (C.MAX_ITEMS || 30)
    )));

    const getShellStyle = (comment) => ({
      '--lane-index': comment.laneIndex || 0,
      '--scroll-duration': `${comment.scrollDurationMs || getScrollDuration()}ms`,
      '--scroll-delay': `${comment.startDelayMs || 0}ms`
    });

    const getTrackStyle = () => ({
      '--stack-track-offset': `${stackTrackOffset.value}px`,
      '--stack-track-transition-ms': `${stackTrackTransitionMs.value}ms`
    });

    const parsePx = (value, fallback) => {
      const match = String(value || '').trim().match(/^([\d.]+)px$/i);
      if (!match) return fallback;
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const countPartUnits = (parts = []) => parts.reduce((sum, part) => {
      if (part.type === 'text') return sum + Array.from(part.content || '').length;
      return sum + 2;
    }, 0);

    const estimateCardWidth = (comment) => {
      const minWidth = parsePx(C.UNDERBAR_CARD_MIN_WIDTH, 180);
      const maxWidth = parsePx(C.UNDERBAR_CARD_WIDTH, 760);
      const fontSize = Number(C.FONT_SIZE || 24);
      const metaScale = Number(C.META_SCALE || 0.8);
      const iconWidth = C.SHOW_ICON && comment.profileImage ? Number(C.ICON_SIZE || 48) + 18 : 0;
      const nameUnits = C.SHOW_NAME ? Array.from(comment.name || '').length : 0;
      const badgeUnits = C.SHOW_BADGES ? (comment.badges || []).length * 2 : 0;
      const flagUnits = C.SHOW_USER_FLAGS ? (comment.userFlags || []).length * 4 : 0;
      const metaUnits = (comment.metaLabels || []).reduce((sum, label) => sum + Array.from(label.text || '').length + 2, 0);
      const headerWidth = (nameUnits + badgeUnits + flagUnits + metaUnits) * fontSize * metaScale * 0.58;
      const messageWidth = Math.max(
        countPartUnits(comment.parts),
        countPartUnits(comment.translationParts)
      ) * fontSize * 0.68;
      const estimated = 36 + iconWidth + Math.max(headerWidth, messageWidth);
      return Math.max(minWidth, Math.min(maxWidth, estimated));
    };

    const getTravelSpeed = () => {
      const viewportWidth = window.innerWidth || 1920;
      const maxWidth = parsePx(C.UNDERBAR_CARD_WIDTH, 760);
      const sidePadding = Number(C.UNDERBAR_SIDE_PADDING_PX || 32);
      return (viewportWidth + maxWidth + sidePadding * 2) / getScrollDuration();
    };

    const getScrollDurationForWidth = (cardWidth) => {
      const viewportWidth = window.innerWidth || 1920;
      const sidePadding = Number(C.UNDERBAR_SIDE_PADDING_PX || 32);
      const speed = getTravelSpeed();
      return Math.max(1000, Math.round((viewportWidth + cardWidth + sidePadding * 2) / speed));
    };

    const getItemGapPx = () => Number(C.ITEM_GAP_PX !== undefined ? C.ITEM_GAP_PX : 12);

    const getStackVisibleWidth = () => {
      const sidePadding = Number(C.UNDERBAR_SIDE_PADDING_PX || 32);
      return Math.max(1, (window.innerWidth || 1920) - sidePadding * 2);
    };

    const getStackExitDistance = () => {
      const exitCards = Math.max(0, Number(C.UNDERBAR_STACK_EXIT_CARDS || 2));
      return parsePx(C.UNDERBAR_CARD_WIDTH, 760) * exitCards;
    };

    const getStoredCardWidth = (comment) => {
      const minWidth = parsePx(C.UNDERBAR_CARD_MIN_WIDTH, 180);
      const maxWidth = parsePx(C.UNDERBAR_CARD_WIDTH, 760);
      const width = Number(comment?.estimatedWidth);
      return Number.isFinite(width) ? Math.max(minWidth, Math.min(maxWidth, width)) : maxWidth;
    };

    const getStackTrackWidth = (list) => {
      if (!list.length) return 0;
      const gap = getItemGapPx();
      const cardSum = list.reduce((sum, comment) => sum + getStoredCardWidth(comment), 0);
      return cardSum + Math.max(0, list.length - 1) * gap;
    };

    const isFirstStackCardSafelyOutside = () => {
      if (comments.value.length <= 1) return false;
      const remainingWidth = getStackTrackWidth(comments.value.slice(1));
      return remainingWidth >= getStackVisibleWidth() + getStackExitDistance();
    };

    const cleanupStackOverflow = () => {
      const maxItems = getActiveMaxItems();
      const hardLimit = maxItems + Math.max(12, Math.ceil(Number(C.UNDERBAR_STACK_EXIT_CARDS || 2) * 8));

      while (comments.value.length > maxItems && isFirstStackCardSafelyOutside()) {
        const removed = comments.value.shift();
        if (removed) clearRemoveTimer(removed.id);
      }

      while (comments.value.length > hardLimit) {
        const removed = comments.value.shift();
        if (removed) clearRemoveTimer(removed.id);
      }
    };

    const ensureLaneSchedule = () => {
      const laneCount = isStackMode.value ? 1 : getLaneCount();
      while (laneAvailableAt.length < laneCount) laneAvailableAt.push(0);
      if (laneAvailableAt.length > laneCount) laneAvailableAt = laneAvailableAt.slice(0, laneCount);
    };

    const pickLaneSchedule = (cardWidth) => {
      ensureLaneSchedule();
      const now = Date.now();
      let laneIndex = 0;
      for (let i = 1; i < laneAvailableAt.length; i++) {
        if (laneAvailableAt[i] < laneAvailableAt[laneIndex]) laneIndex = i;
      }

      const speed = getTravelSpeed();
      const gapPx = Number(C.UNDERBAR_MIN_GAP_PX || 80);
      const startAt = Math.max(now, laneAvailableAt[laneIndex] || 0);
      const nextGapMs = Math.max(250, Math.round((cardWidth + gapPx) / speed));
      laneAvailableAt[laneIndex] = startAt + nextGapMs;

      return {
        laneIndex,
        startDelayMs: Math.max(0, startAt - now)
      };
    };

    const clearRemoveTimer = (id) => {
      const timer = removeTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        removeTimers.delete(id);
      }
    };

    const removeCommentById = (id) => {
      clearRemoveTimer(id);
      const idx = comments.value.findIndex(c => c.id === id);
      if (idx !== -1) comments.value.splice(idx, 1);
    };

    const clearComments = () => {
      removeTimers.forEach(timer => clearTimeout(timer));
      removeTimers.clear();
      if (stackSlideTimer) {
        clearTimeout(stackSlideTimer);
        stackSlideTimer = null;
      }
      stackTrackOffset.value = 0;
      stackTrackTransitionMs.value = 0;
      laneAvailableAt = [];
      comments.value = [];
    };

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
      } else if (event.kind === 'membership_gift') {
        const count = event.giftCount || 0;
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

      if (parsed?.system?.isSticky) {
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

      const parts = parsed?.message?.parts || [];
      const translation = parsed?.translation || {};
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
      if (user.isOwner) {
        return [{ type: 'owner', text: 'OWNER' }];
      }

      if (user.isModerator) {
        return [{ type: 'moderator', text: 'MOD' }];
      }

      return [];
    };

    const normalizeLegacyComment = (parsed) => ({
      id: parsed.id,
      name: parsed.user,
      profileImage: parsed.profileImage,
      badges: parsed.badges || [],
      userFlags: buildUserFlags(parsed),
      parts: truncateParts(parsed.parts || []),
      hasGift: !!parsed.hasGift,
      isSticky: !!parsed.isSticky,
      isSpecial: !!(parsed.hasGift || parsed.isSticky || parsed.membership),
      colorStr: parsed.colorStr,
      metaLabels: [],
      raw: parsed.raw
    });

    const applyPreviewConfig = (nextConfig) => {
      if (!nextConfig || typeof nextConfig !== 'object') return;
      Object.assign(C, nextConfig);
      updateStyle();

      comments.value = comments.value.map((current) => {
        const refreshed = current.raw ? parseComment(current.raw) : null;
        if (!refreshed) return current;

        return {
          ...refreshed,
          giftColor: refreshed.isSpecial ? refreshed.colorStr : null,
          timestamp: current.timestamp,
          laneIndex: current.laneIndex,
          scrollDurationMs: current.scrollDurationMs,
          startDelayMs: current.startDelayMs
        };
      });

      const maxItems = getActiveMaxItems();
      if (comments.value.length > maxItems) {
        if (isStackMode.value) {
          cleanupStackOverflow();
        } else {
          comments.value.splice(0, comments.value.length - maxItems);
        }
      }
    };

    const handleSettingsPreview = (event) => {
      applyPreviewConfig(event.detail);
    };

    const handleSettingsReset = () => {
      applyPreviewConfig(appliedConfig);
    };

    const normalizeComment = (parsed) => {
      const event = parsed?.event || {};
      const isSpecial = !!(event.isSupport || event.isMembership || parsed.system?.isSticky);
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
        hasTranslation: !!parsed.translation?.available,
        hasGift: isSupport,
        isSupport,
        isMembership,
        isSticky: !!parsed.system?.isSticky,
        isSpecial,
        colorStr: parsed.style?.colorStr,
        metaLabels: buildMetaLabels(parsed),
        raw: parsed.raw
      };
    };

    const parseComment = (raw) => {
      if (!window.VCT) return null;

      if (typeof VCT.parseStructured === 'function') {
        return normalizeComment(VCT.parseStructured(raw));
      }

      return normalizeLegacyComment(VCT.parse(raw));
    };

    const addComment = (raw) => {
      const comment = parseComment(raw);
      if (!comment) return;

      if (comments.value.some(c => c.id === comment.id)) return;

      const cardWidth = estimateCardWidth(comment);
      const schedule = isStackMode.value
        ? { laneIndex: 0, startDelayMs: 0 }
        : pickLaneSchedule(cardWidth);
      const scrollDurationMs = isStackMode.value ? 0 : getScrollDurationForWidth(cardWidth);
      const newCmt = {
        ...comment,
        giftColor: comment.isSpecial ? comment.colorStr : null,
        timestamp: Date.now(),
        estimatedWidth: cardWidth,
        laneIndex: schedule.laneIndex,
        startDelayMs: schedule.startDelayMs,
        scrollDurationMs
      };

      const maxItems = getActiveMaxItems();

      if (isStackMode.value) {
        if (stackSlideTimer) {
          clearTimeout(stackSlideTimer);
          stackSlideTimer = null;
        }

        const direction = directionClass.value === 'underbar-ltr' ? -1 : 1;
        const gapPx = getItemGapPx();
        const slideMs = Math.max(0, Number(C.UNDERBAR_STACK_SLIDE_MS || 450));
        stackTrackTransitionMs.value = 0;
        stackTrackOffset.value = direction * (cardWidth + gapPx);
        cleanupStackOverflow();
        comments.value.push(newCmt);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            stackTrackTransitionMs.value = slideMs;
            stackTrackOffset.value = 0;
          });
        });

        if (comments.value.length > maxItems) {
          stackSlideTimer = setTimeout(() => {
            stackSlideTimer = null;
          }, slideMs + 40);
        }
      } else {
        comments.value.push(newCmt);
      }

      if (!isStackMode.value && comments.value.length > maxItems) {
        const removed = comments.value.shift();
        if (removed) clearRemoveTimer(removed.id);
      }

      if (C.AUTO_HIDE_MS > 0 || !isStackMode.value) {
        const removeAfterMs = isStackMode.value
          ? Number(C.AUTO_HIDE_MS)
          : newCmt.startDelayMs + (C.AUTO_HIDE_MS > 0 ? Number(C.AUTO_HIDE_MS) : newCmt.scrollDurationMs + 800);
        const timer = setTimeout(() => removeCommentById(newCmt.id), removeAfterMs);
        removeTimers.set(newCmt.id, timer);
      }
    };

    onMounted(() => {
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
          clearComments();
        }
      });

      OneSDK.ready().then(() => {
        OneSDK.connect();
        console.log(`view comment Underbar V2: Ready (Direction: ${C.UNDERBAR_DIRECTION || 'rtl'})`);
      });
    });

    onBeforeUnmount(() => {
      window.removeEventListener('vct-settings-preview', handleSettingsPreview);
      window.removeEventListener('vct-settings-reset-preview', handleSettingsReset);
      clearComments();
    });

    return {
      comments,
      config: C,
      appClass,
      getShellStyle,
      getTrackStyle
    };
  }
}).mount('#app');
