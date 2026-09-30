window.CONFIG = {
  TEMPLATE_VERSION: "2.6.0",
  HIDE_DEFAULT_COMMENTS: true, // trueで表示を消す
  MAX_ACTIVE: 30,
  FONT_SIZE: 36,
  EFFECT_DURATION: 3.0,
  FX_INTENSITY: 1.0,         // 演出強度倍率
  USE_USER_COLOR: true,      // ユーザーカラーを反映するか (falseで通常コメは白)
  CLEAR_ON_ONESDK_CLEAR: true,
  DEBUG: false
};

// CSS変数制御
document.documentElement.style.setProperty(
  "--show-comments",
  CONFIG.HIDE_DEFAULT_COMMENTS ? "none" : "block"
);
