window.CONFIG = {
  TEMPLATE_VERSION: "2.1.0",

  // v0.1: 加入/継続のみ。ギフト系は後で membership_gift / membership_gift_received を追加。
  ENABLED_EVENT_KINDS: [
    "member_join",
    "member_milestone"
  ],

  DISPLAY_DURATION: 5.2,
  CARD_SCALE: 1.0,
  FX_INTENSITY: 1.0,
  CONFETTI_ENABLED: true,
  CONFETTI_AMOUNT: 150,
  SPARKLES_ENABLED: true,
  SPARKLE_AMOUNT: 80,
  MAX_QUEUE: 8,

  // 初見コメント歓迎: "off" | "light" | "party"
  FIRST_TIME_MODE: "party",
  FIRST_TIME_COOLDOWN_MS: 15000,
  FIRST_TIME_PRESETS: {
    off: {
      enabled: false
    },
    light: {
      enabled: true,
      duration: 2.8,
      cardScale: 0.72,
      intensity: 0.35,
      confettiAmount: 35,
      sparkleAmount: 24,
      maxQueue: 3
    },
    party: {
      enabled: true,
      duration: 4.6,
      cardScale: 0.95,
      intensity: 0.9,
      confettiAmount: 120,
      sparkleAmount: 70,
      maxQueue: 5
    }
  },

  HIDE_DEFAULT_COMMENTS: true,
  CLEAR_ON_ONESDK_CLEAR: true,
  DEBUG: false
};

document.documentElement.style.setProperty(
  "--show-comments",
  CONFIG.HIDE_DEFAULT_COMMENTS ? "none" : "block"
);
