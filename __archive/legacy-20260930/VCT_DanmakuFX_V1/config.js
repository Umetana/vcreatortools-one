window.CONFIG = {
  HIDE_DEFAULT_COMMENTS: true,
  CLEAR_ON_ONESDK_CLEAR: true,
  DEBUG: false,

  SOURCE_MODE: "all",       // all | emoji | custom
  PICKUP_RATE: 1.0,         // コメント単位の抽選率
  MIN_PICK_PER_COMMENT: 3,
  MAX_PICK_PER_COMMENT: 8,

  MAX_ACTIVE: 24,
  MAX_PARTICLES: 260,
  EFFECT_DURATION: 3.2,     // 互換用。MIN/MAX未設定時の表示時間
  EFFECT_DURATION_MIN: 2.4,
  EFFECT_DURATION_MAX: 4.2,
  BURST_DURATION: 1.4,
  FX_INTENSITY: 1.0,

  BASE_SIZE_PX: 48,
  RANDOM_SIZE_MIN: 0.8,
  RANDOM_SIZE_MAX: 1.4,

  EFFECT_MODE: "random",
  EFFECTS: [
    { name: "fall", weight: 35 },
    { name: "float", weight: 30 },
    { name: "wave", weight: 20 },
    { name: "spin", weight: 10 },
    { name: "burst", weight: 5 }
  ],

  CUSTOM_EMOJI_USE_IMAGE: true,
  FALLBACK_TO_ALT_TEXT: true
};

document.documentElement.style.setProperty(
  "--show-comments",
  CONFIG.HIDE_DEFAULT_COMMENTS ? "none" : "block"
);
