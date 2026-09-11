// custom base template v2.8 default config.js

window.CONFIG_DEFAULT = {
  // ハロウィンステージ
  VISUAL_MODE: "emoji",       // "emoji" または "visual"
  STAGE_FIT: "contain",       // "contain" または "cover"
  COMMENT_X: 70,               // 1920基準の左位置 (px)
  COMMENT_Y: 120,              // 1080基準の上位置 (px)
  COMMENT_WIDTH: 760,          // コメント領域の横幅 (px)
  COMMENT_HEIGHT: 880,         // コメント領域の高さ (px)
  COMMENT_SCALE: 1,            // コメント領域内の表示倍率
  GIFT_COLOR_MODE: "hybrid",  // "original" / "hybrid" / "halloween"
  SHOW_STAGE_BACKGROUND: true, // ステージ背景を表示するか
  SHOW_COMMENT_FRAME: true,    // コメント領域の外枠を表示するか
  SHOW_AMBIENT_EFFECTS: true,  // 霧・浮遊装飾
  REDUCED_MOTION: false,       // 軽量・動き抑制

  // StageFX画面演出
  ENABLE_STAGE_EFFECTS: true,          // コメントイベント連動画面演出
  STAGE_EFFECT_INTENSITY_MODE: "value", // "fixed" または "value"（金額・件数連動）
  STAGE_EFFECT_RENDER_MODE: "emoji",  // "emoji" または "image"
  STAGE_EFFECT_POLICY: "queue",       // "queue" / "overlap" / "ignore"
  STAGE_EFFECT_MAX_ACTIVE: 1,          // 同時実行数 (1～4)
  STAGE_EFFECT_QUEUE_LIMIT: 6,         // 待機上限 (0～20)
  STAGE_EFFECT_COUNT: 18,              // 1演出あたりの表示数
  STAGE_EFFECT_DURATION_MS: 4200,      // 演出の基準時間
  STAGE_EFFECT_BG_OPACITY: 0,          // 演出中の暗幕 (0.0～0.7)
  // 表示設定
  MAX_ITEMS: 8,               // 最大表示件数
  MAX_WIDTH: "100%",          // コメント領域内の横幅
  STACK_DIRECTION: "up",      // 積み上げ方向 ("up" or "down")
  ITEM_GAP_PX: 4,            // コメント間の隙間

  // 要素の表示切り替え
  ICON_MODE: "profile",       // "profile" / "halloween" / "hidden"
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
  SHOW_EVENT_MESSAGE_MEMBER_JOIN: true,      // メンバーシップ加入案内文を表示
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
  BG_COLOR: "#000000",             // コメント枠の背景色
  BG_OPACITY: 0.45,                 // コメント枠の背景透明度 (0.0～1.0)
  BG_GLASS: "rgba(0, 0, 0, 0.45)", // 旧設定との互換用
  BG_BLUR: "12px",                // 背景のぼかし強度
  BASE_BORDER_COLOR: "#ffffff",   // 通常コメント枠線の色
  BASE_BORDER_OPACITY: 0.15,       // 通常コメント枠線の濃さ (0.0～1.0)
  BASE_BORDER_WIDTH: 1,            // 通常コメント枠線の太さ (px)
  SYSTEM_BORDER_OPACITY: 0.35,     // 固定コメント枠線の濃さ (0.0～1.0)
  TEXT_MAIN: "#ffffff",           // メイン文字色
  TEXT_NAME: "#eeeeee",           // 名前の文字色
  ACCENT_COLOR: "#ffd700",        // アクセントカラー（ギフト等のデフォルト色）
  SHADOW_SOFT: "0 4px 12px rgba(0, 0, 0, 0.3)", // 影の設定

  // デバッグ
  DEBUG: false
};
