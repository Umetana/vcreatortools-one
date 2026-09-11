// View Comment Halloween StageFX V2 v0.1.0-dev

const { createApp, ref, reactive, computed, onMounted, onBeforeUnmount } = window.Vue || Vue;

createApp({
  setup() {
    const comments = ref([]);
    const C = reactive({ ...(window.CONFIG || {}) });
    const appliedConfig = { ...(window.CONFIG || {}) };
    const halloweenIcons = Object.freeze(['🎃', '👻', '🦇', '💀', '🍬', '🕯️', '🕸️', '🧪']);
    let effectHost = null;

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

    const updateStageScale = () => {
      const widthScale = window.innerWidth / 1920;
      const heightScale = window.innerHeight / 1080;
      const scale = String(C.STAGE_FIT || 'contain').toLowerCase() === 'cover'
        ? Math.max(widthScale, heightScale)
        : Math.min(widthScale, heightScale);
      document.documentElement.style.setProperty('--stage-scale', Math.max(scale, 0.01));
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
      root.style.setProperty('--comment-x', `${Number(C.COMMENT_X) || 0}px`);
      root.style.setProperty('--comment-y', `${Number(C.COMMENT_Y) || 0}px`);
      root.style.setProperty('--comment-width', `${Math.max(Number(C.COMMENT_WIDTH) || 760, 240)}px`);
      root.style.setProperty('--comment-height', `${Math.max(Number(C.COMMENT_HEIGHT) || 880, 200)}px`);
      root.style.setProperty('--comment-scale', Math.max(Number(C.COMMENT_SCALE) || 1, 0.1));
      updateStageScale();
      effectHost?.configure({
        policy: C.STAGE_EFFECT_POLICY,
        maxActive: C.STAGE_EFFECT_MAX_ACTIVE,
        queueLimit: C.STAGE_EFFECT_QUEUE_LIMIT
      });
      if (C.ENABLE_STAGE_EFFECTS === false || C.REDUCED_MOTION === true) {
        effectHost?.destroyAll();
      }

      const app = document.getElementById('app');
      if (app) {
        app.classList.remove('stack-up', 'stack-down');
        app.classList.add(stackClass.value);
        app.classList.remove('mode-emoji', 'mode-visual');
        app.classList.add(visualModeClass.value);
        app.classList.remove('gift-colors-original', 'gift-colors-hybrid', 'gift-colors-halloween');
        app.classList.add(giftColorModeClass.value);
        app.classList.toggle('stage-background-off', C.SHOW_STAGE_BACKGROUND === false);
        app.classList.toggle('comment-frame-off', C.SHOW_COMMENT_FRAME === false);
        app.classList.toggle('ambient-off', C.SHOW_AMBIENT_EFFECTS === false);
        app.classList.toggle('reduced-motion', C.REDUCED_MOTION === true);
      }
    };

    const stackClass = computed(() => {
      const dir = (C.STACK_DIRECTION || 'up').toLowerCase();
      return dir === 'down' ? 'stack-down' : 'stack-up';
    });

    const visualModeClass = computed(() => `mode-${String(C.VISUAL_MODE || 'emoji').toLowerCase()}`);
    const giftColorModeClass = computed(() => `gift-colors-${String(C.GIFT_COLOR_MODE || 'hybrid').toLowerCase()}`);

    const activeIconMode = () => {
      const runtime = window.VCT_CONFIG_RUNTIME || {};
      const local = runtime.localOverrides || {};
      const legacyHidden = Object.prototype.hasOwnProperty.call(local, 'SHOW_ICON') &&
        !Object.prototype.hasOwnProperty.call(local, 'ICON_MODE') && local.SHOW_ICON === false;
      if (legacyHidden) return 'hidden';
      const mode = String(C.ICON_MODE || (C.SHOW_ICON === false ? 'hidden' : 'profile')).toLowerCase();
      return ['profile', 'halloween', 'hidden'].includes(mode) ? mode : 'profile';
    };

    const showCommentIcon = (comment) => {
      const mode = activeIconMode();
      if (mode === 'hidden') return false;
      return mode === 'halloween' || !!comment?.profileImage;
    };

    const pickHalloweenIcon = () => halloweenIcons[Math.floor(Math.random() * halloweenIcons.length)];

    const stageEffectPattern = (comment) => {
      const patterns = {
        superchat: 'candyRain',
        supersticker: 'randomPop',
        jewel: 'randomPop',
        member_join: 'ghostNight',
        member_milestone: 'ghostNight',
        membership_event: 'ghostNight',
        membership_gift: 'parade',
        membership_gift_received: 'randomPop',
        unknown: 'parade'
      };
      return patterns[comment.eventKind] || (comment.isSupport ? 'parade' : null);
    };

    const moneyIntensityLevel = (amount, currency) => {
      if (!(amount > 0)) return null;
      const code = String(currency || '').toUpperCase();
      const thresholds = {
        JPY: [1000, 5000, 10000],
        KRW: [10000, 50000, 100000],
        USD: [5, 25, 50], EUR: [5, 25, 50], GBP: [5, 25, 50],
        CAD: [5, 25, 50], AUD: [5, 25, 50], NZD: [5, 25, 50]
      }[code];
      if (!thresholds) return null;
      if (amount < thresholds[0]) return 'small';
      if (amount < thresholds[1]) return 'standard';
      if (amount < thresholds[2]) return 'large';
      return 'extra';
    };

    const stageEffectIntensity = (comment) => {
      if (String(C.STAGE_EFFECT_INTENSITY_MODE || 'value').toLowerCase() !== 'value') return 'standard';

      if (comment.eventKind === 'membership_gift' && comment.giftCount > 0) {
        if (comment.giftCount >= 20) return 'extra';
        if (comment.giftCount >= 10) return 'large';
        if (comment.giftCount <= 2) return 'small';
        return 'standard';
      }

      if (comment.eventKind === 'jewel' && comment.jewelCount > 0) {
        if (comment.jewelCount >= 10000) return 'extra';
        if (comment.jewelCount >= 1000) return 'large';
        if (comment.jewelCount < 100) return 'small';
        return 'standard';
      }

      return moneyIntensityLevel(comment.moneyAmount, comment.moneyCurrency) || 'standard';
    };

    const triggerStageEffect = (comment) => {
      if (!effectHost || C.ENABLE_STAGE_EFFECTS === false || C.REDUCED_MOTION === true) return;
      if (!comment.isSupport && !comment.isMembership) return;
      const pattern = stageEffectPattern(comment);
      if (!pattern) return;

      const duration = Math.max(1200, Math.min(10000, Number(C.STAGE_EFFECT_DURATION_MS) || 4200));
      const baseCount = Math.max(1, Math.min(60, Number(C.STAGE_EFFECT_COUNT) || 18));
      const intensity = stageEffectIntensity(comment);
      const strength = {
        small: { count: 0.6, size: 0.78, duration: 0.72, motion: 0.72, backdrop: 0 },
        standard: { count: 1, size: 1, duration: 1, motion: 0.82, backdrop: 0 },
        large: { count: 1.45, size: 1.12, duration: 1.12, motion: 1, backdrop: 0.05 },
        extra: { count: 2, size: 1.28, duration: 1.3, motion: 1.16, backdrop: 0.12 }
      }[intensity];
      const imageMode = C.STAGE_EFFECT_RENDER_MODE === 'image';
      effectHost.trigger('halloween_parade_effect', {
        renderMode: imageMode ? 'image' : 'emoji',
        pattern,
        count: Math.min(60, Math.max(1, Math.round(baseCount * strength.count))),
        minSize: Math.round((imageMode ? 62 : 48) * strength.size),
        maxSize: Math.round((imageMode ? 128 : 104) * strength.size),
        travelTimeMs: Math.min(10000, Math.round(duration * strength.duration)),
        duration: Math.min(10000, Math.round(duration * strength.duration)),
        motionPower: strength.motion,
        bgOpacity: Math.max(0, Math.min(0.7, (Number(C.STAGE_EFFECT_BG_OPACITY) || 0) + strength.backdrop))
      });
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
      Object.assign(C, nextConfig);
      updateStyle();

      comments.value = comments.value.map((current) => {
        const refreshed = current.raw ? parseComment(current.raw) : null;
        if (!refreshed) return current;

        return {
          ...refreshed,
          halloweenIcon: current.halloweenIcon || refreshed.halloweenIcon,
          giftColor: refreshed.isSpecial ? refreshed.colorStr : null,
          timestamp: current.timestamp
        };
      });

      const maxItems = Math.max(1, Number(C.MAX_ITEMS || 10));
      if (comments.value.length > maxItems) {
        comments.value.splice(0, comments.value.length - maxItems);
      }
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
        eventKind: String(event.kind || 'comment').replace(/[^a-z0-9_-]/gi, ''),
        moneyAmount: Number(parsed.monetization?.money?.amount) || 0,
        moneyCurrency: parsed.monetization?.money?.currency || '',
        jewelCount: Number(parsed.monetization?.jewels) || 0,
        giftCount: Number(parsed.membership?.giftCount) || 0,
        halloweenIcon: pickHalloweenIcon(),
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
        giftColor: comment.isSpecial ? comment.colorStr : null,
        timestamp: Date.now()
      };

      comments.value.push(newCmt);
      triggerStageEffect(newCmt);
      if (comments.value.length > (C.MAX_ITEMS || 10)) {
        comments.value.shift();
      }

      if (C.AUTO_HIDE_MS > 0) {
        setTimeout(() => {
          const idx = comments.value.findIndex(c => c.id === newCmt.id);
          if (idx !== -1) comments.value.splice(idx, 1);
        }, C.AUTO_HIDE_MS);
      }
    };

    onMounted(() => {
      if (window.StageEffectHost && window.EffectContext) {
        effectHost = new window.StageEffectHost({
          container: document.querySelector('.stage__effects'),
          backdrop: document.querySelector('.stage__effect-backdrop')
        });
      }
      updateStyle();
      window.addEventListener('resize', updateStageScale);
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
          comments.value = [];
        }
      });

      OneSDK.ready().then(() => {
        OneSDK.connect();
        console.log(`View Comment Halloween StageFX V2 v0.1.0-dev: Ready (SDK: ${VCT_SDK.VERSION}, Stack: ${C.STACK_DIRECTION || 'up'})`);
      });
    });

    onBeforeUnmount(() => {
      window.removeEventListener('vct-settings-preview', handleSettingsPreview);
      window.removeEventListener('vct-settings-reset-preview', handleSettingsReset);
      window.removeEventListener('resize', updateStageScale);
      effectHost?.destroy();
      effectHost = null;
    });

    return {
      comments,
      config: C,
      stackClass,
      visualModeClass,
      giftColorModeClass,
      activeIconMode,
      showCommentIcon
    };
  }
}).mount('#app');
