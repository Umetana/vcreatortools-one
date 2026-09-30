// view comment Underbar V2 default config.js

window.CONFIG_DEFAULT = {
  // 表示設定
  MAX_ITEMS: 30,              // tickerモードの最大保持件数。連投時に途中削除されにくいよう多めに保持する
  MAX_WIDTH: "900px",         // 互換用。Underbarでは基本的に使用しない
  ITEM_GAP_PX: 4,             // stackモードのカード間隔。tickerでは基本的に使用しない

  // Underbar表示
  UNDERBAR_LAYOUT_MODE: "ticker", // "ticker" 横流し / "stack" 横積み
  UNDERBAR_DIRECTION: "rtl",  // 表示方向。"rtl" 右から左 / "ltr" 左から右
  UNDERBAR_LANES: 2,          // tickerモードのレーン数。stackモードは1段固定
  UNDERBAR_SCROLL_MS: 14000,  // tickerモードの基準横断時間 (ms)。可変幅カードごとに微調整される
  UNDERBAR_CARD_MIN_WIDTH: "180px", // コメント枠の最小横幅。短文カードが小さくなりすぎるのを防ぐ
  UNDERBAR_CARD_WIDTH: "760px", // コメント枠の最大横幅。長文はこの幅で止まり、後半は省略/枠内処理
  UNDERBAR_CARD_HEIGHT_PX: 92,   // tickerモードのコメント枠高さ
  UNDERBAR_STACK_MAX_ITEMS: 5,    // stackモードで画面内に並べる基本カード数
  UNDERBAR_STACK_EXIT_CARDS: 2,   // stackモードで画面外へ押し出してから削除する距離。最大カード幅の1〜2枚分程度推奨
  UNDERBAR_STACK_CARD_HEIGHT_PX: 128, // stackモードのコメント枠高さ。本文2〜3行向け
  UNDERBAR_STACK_MESSAGE_LINES: 3, // stackモードの本文表示行数。長文はこの行数で省略
  UNDERBAR_STACK_SLIDE_MS: 450, // stackモードの横スライド時間 (ms)
  UNDERBAR_LANE_HEIGHT_PX: 104,  // tickerモードのレーン縦ピッチ。実際の隙間はこの値 - UNDERBAR_CARD_HEIGHT_PX
  UNDERBAR_BOTTOM_PX: 28,        // 画面下からの位置。下に詰めたい場合は16〜24程度へ
  UNDERBAR_SIDE_PADDING_PX: 32,  // 画面外に逃がす余白。tickerの開始/終了、stackの左右余白に使用
  UNDERBAR_MIN_GAP_PX: 80,       // tickerで同じレーンの前後コメントに空ける最低距離
  COMMENT_OVERFLOW_MODE: "clip", // "clip" 省略 / "marquee" 枠内横スクロール
  MESSAGE_MARQUEE_MS: 9000,      // 枠内横スクロール速度

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
  AUTO_HIDE_MS: 0,        // 自動非表示までの時間。0ならtickerは流れ切りで削除、stackは最大件数で押し出し
  FADE_IN_MS: 300,            // 入場アニメーション時間
  FADE_OUT_MS: 500,           // 退場アニメーション時間

  // ギフト・スパチャ設定
  GIFT_BG_OPACITY: 0.45,      // ギフトの背景透明度 (0.0～1.0)
  GIFT_BORDER_OPACITY: 1.0,   // ギフトの枠線透明度 (0.0～1.0)
  MEMBER_BG_OPACITY: 0.55,    // メンバー系の背景透明度 (0.0～1.0)
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

  // デバッグ
  DEBUG: false
};
