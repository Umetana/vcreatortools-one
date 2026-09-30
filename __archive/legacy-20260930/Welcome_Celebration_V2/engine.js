/**
 * Welcome Celebration V2 - engine.js
 * メンバー加入/継続イベントを全画面祝祭 event に変換する。
 */

window.ENGINE = (function () {
  let lastFirstTimeAt = 0;

  const EVENT_META = {
    member_join: {
      label: "NEW MEMBER",
      headline: "WELCOME!",
      message: "ようこそ",
      tone: "join"
    },
    member_milestone: {
      label: "MEMBER ANNIVERSARY",
      headline: "THANK YOU!",
      message: "いつもありがとう",
      tone: "milestone"
    },
    first_time: {
      label: "FIRST VISIT",
      headline: "WELCOME!",
      message: "はじめまして！",
      tone: "first-time"
    }
  };

  function getEnabledKinds() {
    const configured = window.CONFIG?.ENABLED_EVENT_KINDS;
    if (Array.isArray(configured) && configured.length > 0) return new Set(configured);
    return new Set(Object.keys(EVENT_META));
  }

  function resolveDisplayName(comment) {
    return comment?.userDetail?.displayName
      || comment?.user
      || comment?.structured?.user?.displayName
      || "Anonymous";
  }

  function resolveEventLabel(comment, meta) {
    return comment?.event?.displayLabel
      || comment?.membershipDetail?.primary
      || comment?.membershipDetail?.sub
      || meta.label;
  }

  function resolveMembershipMessage(comment, meta) {
    if (comment?.event?.kind === "member_join") {
      return comment?.membershipDetail?.sub
        || comment?.message?.text
        || comment?.text
        || meta.message;
    }

    return comment?.membershipDetail?.primary
      || comment?.event?.displayLabel
      || meta.message;
  }

  function getFirstTimePreset() {
    const mode = window.CONFIG?.FIRST_TIME_MODE || "light";
    const presets = window.CONFIG?.FIRST_TIME_PRESETS || {};
    return presets[mode] || presets.light || { enabled: false };
  }

  function isFirstTimeComment(comment) {
    if (!comment?.isFirstTime && !comment?.userDetail?.isFirstTime) return false;

    const event = comment?.event || {};
    const kind = event.kind || "";
    const category = event.category || "";

    return !event.isMembership
      && !event.isSupport
      && (kind === "" || kind === "normal" || category === "comment");
  }

  function shouldPlayFirstTime(comment) {
    const preset = getFirstTimePreset();
    if (!preset.enabled || !isFirstTimeComment(comment)) return false;

    const cooldown = Number(window.CONFIG?.FIRST_TIME_COOLDOWN_MS) || 0;
    const now = Date.now();
    if (cooldown > 0 && now - lastFirstTimeAt < cooldown) return false;

    lastFirstTimeAt = now;
    return true;
  }

  function buildCelebrationEvent(comment, kind, meta, options = {}) {
    return {
      type: "welcome-celebration",
      kind,
      tone: meta.tone,
      label: meta.label,
      headline: meta.headline,
      message: options.message || resolveMembershipMessage(comment, meta),
      eventLabel: options.eventLabel || resolveEventLabel(comment, meta),
      user: resolveDisplayName(comment),
      iconUrl: comment?.profileImage || "",
      color: comment?.color || { r: 11, g: 128, b: 67 },
      colorStr: comment?.colorStr || "rgb(11,128,67)",
      life: options.life || window.CONFIG?.DISPLAY_DURATION || 5.0,
      cardScale: options.cardScale,
      intensity: options.intensity,
      confettiAmount: options.confettiAmount,
      sparkleAmount: options.sparkleAmount,
      maxQueue: options.maxQueue,
      event: comment?.event || null,
      structured: comment?.structured || null,
      raw: comment?.raw || null
    };
  }

  function onComment(comment) {
    const kind = comment?.event?.kind || "";
    const meta = EVENT_META[kind];

    if (meta && getEnabledKinds().has(kind)) {
      return [buildCelebrationEvent(comment, kind, meta)];
    }

    if (shouldPlayFirstTime(comment)) {
      const preset = getFirstTimePreset();
      return [buildCelebrationEvent(comment, "first_time", EVENT_META.first_time, {
        message: EVENT_META.first_time.message,
        eventLabel: "初見さん",
        life: preset.duration,
        cardScale: preset.cardScale,
        intensity: preset.intensity,
        confettiAmount: preset.confettiAmount,
        sparkleAmount: preset.sparkleAmount,
        maxQueue: preset.maxQueue
      })];
    }

    return [];
  }

  return { onComment };
})();
