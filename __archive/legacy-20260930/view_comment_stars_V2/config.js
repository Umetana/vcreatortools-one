// view comment stars v2.7.2 config.js

window.CONFIG = {
  // 表示設定
  MAX_ITEMS: 8,               // 最大表示件数
  MAX_WIDTH: "900px",         // 横幅 ("100%", "600px" など)
  STACK_DIRECTION: "up",      // 積み上げ方向 ("up" or "down")
  ITEM_GAP_PX: 4,            // コメント間の隙間

  // 要素の表示切り替え
  SHOW_ICON: true,            // アイコンを表示するか
  SHOW_NAME: true,            // 名前を表示するか
  SHOW_BADGES: true,          // バッジを表示するか
  SHOW_USER_FLAGS: true,      // OWNER/MODバッジを表示するか
  COMMENT_TRANSLATION_MODE: "original", // "original" 元文 / "translated" 翻訳 / "both" 両方
  MAX_COMMENT_UNITS: 0,       // コメント本文の任意上限 (0で無制限)

  // イベント本文表示
  SHOW_EVENT_MESSAGES: true,                 // イベント本文を表示するか
  SHOW_EVENT_MESSAGE_SUPERCHAT: true,        // スーパーチャット本文を表示
  SHOW_EVENT_MESSAGE_SUPERSTICKER: true,     // スーパーステッカー本文を表示
  SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT: true, // メンバーシップ継続・コメント本文を表示
  SHOW_EVENT_MESSAGE_MEMBER_JOIN: true,      // メンバーシップ加入本文を表示
  SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT: true,  // メンバーシップギフト送信本文を表示
  SHOW_EVENT_MESSAGE_GIFT_RECEIVED: true,   // メンバーシップギフト受け取り本文を表示

  // フォント・サイズ
  FONT_FAMILY: `"M PLUS 1p", "Noto Sans JP", sans-serif`,
  FONT_SIZE: 24,              // 基本文字サイズ (px)
  META_SCALE: 0.8,            // 名前・バッジのサイズ倍率

  // 演出・タイマー
  AUTO_HIDE_MS: 0,        // 自動非表示までの時間 (0で永続表示)
  FADE_IN_MS: 300,            // 入場アニメーション時間
  FADE_OUT_MS: 500,           // 退場アニメーション時間

  // ギフト・スパチャ設定
  GIFT_BG_OPACITY: 0.9,       // ギフトの背景透明度 (0.0～1.0)
  GIFT_BORDER_OPACITY: 1.0,   // ギフトの枠線透明度 (0.0～1.0)
  MEMBER_BG_OPACITY: 0.9,     // メンバー系の背景透明度 (0.0～1.0)
  MEMBER_BORDER_OPACITY: 1.0, // メンバー系の枠線透明度 (0.0～1.0)

  // カラー・スタイル詳細設定
  BG_GLASS: "rgba(0, 0, 0, 0.45)", // コメント枠の背景色
  BG_BLUR: "12px",                // 背景のぼかし強度
  BASE_BORDER_COLOR: "#ffffff",   // 通常コメント枠線の色
  BASE_BORDER_OPACITY: 0.15,       // 通常コメント枠線の濃さ (0.0～1.0)
  BASE_BORDER_WIDTH: 1,            // 通常コメント枠線の太さ (px)
  SYSTEM_BORDER_OPACITY: 0.35,     // 固定コメント枠線の濃さ (0.0～1.0)
  TEXT_MAIN: "#ffffff",           // メイン文字色
  TEXT_NAME: "#eeeeee",           // 名前の文字色
  ACCENT_COLOR: "#ffd700",        // アクセントカラー（ギフト等のデフォルト色）
  SHADOW_SOFT: "0 4px 12px rgba(0, 0, 0, 0.3)", // 影の設定

  // --- 星降り演出設定 ---
  // "off" | "gift" | "special" | "always"
  STAR_MODE: "special",
  STAR_DIRECTION: "random", // "down-right" | "down-left" | "random"
  STAR_GLYPH: "★",
  STAR_COUNT: 12,             // 1コメントあたりの星数
  STAR_COLORS: "#fff7ad,#ffd166,#7dd3fc", // カンマ区切りの星色
  STAR_SIZE_MIN: 14,          // 星の最小サイズ (px)
  STAR_SIZE_MAX: 28,          // 星の最大サイズ (px)
  STAR_DURATION_MIN: 1.8,     // 星が降る最短時間 (秒)
  STAR_DURATION_MAX: 3.2,     // 星が降る最長時間 (秒)
  STAR_DELAY_MAX: 0.7,        // 星ごとの最大遅延 (秒)

  // デバッグ
  DEBUG: false
};
