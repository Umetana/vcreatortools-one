// view comment heart v2 config.js

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
  TEXT_MAIN: "#ffffff",           // メイン文字色
  TEXT_NAME: "#eeeeee",           // 名前の文字色
  ACCENT_COLOR: "#ffd700",        // アクセントカラー（ギフト等のデフォルト色）
  SHADOW_SOFT: "0 4px 12px rgba(0, 0, 0, 0.3)", // 影の設定

  // --- ハート演出設定 (Heart Embrace) ---
  // "off" | "gift" | "always"
  HEART_MODE: "gift",
  HEART_GLYPH: "♥",
  HEART_COUNT: 5,            // 1コメあたりのハート数
  HEART_USE_USER_COLOR: false, // 送り主の色を反映するか
  HEART_COLOR: "#ff0000",     // 反映しない場合の色
  HEART_SIZE_MIN: 24,         // ハートの最小サイズ (px)
  HEART_SIZE_MAX: 48,         // ハートの最大サイズ (px)

  // デバッグ
  DEBUG: false
};
