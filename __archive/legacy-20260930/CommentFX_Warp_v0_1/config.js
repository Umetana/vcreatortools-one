window.CONFIG = {
  HIDE_DEFAULT_COMMENTS: true, // わんコメ標準コメント欄を隠す
  MAX_ACTIVE: 24, // 同時に残すワープコメント数
  FONT_SIZE: 34, // 基準フォントサイズ
  EFFECT_DURATION: 1.8, // 1コメントの寿命秒数
  FX_INTENSITY: 1.0, // 全体速度倍率
  USE_USER_COLOR: true, // 互換用。個別設定が未定義のときだけ参照する。
  USE_NORMAL_USER_COLOR: false, // 通常コメントにユーザーカラーを使う
  USE_GIFT_COLOR: true, // ギフトコメントにギフト/ユーザーカラーを使う
  USE_STICKY_COLOR: true, // 固定コメントにカラーを使う
  USE_MEMBER_COLOR: false, // メンバー通常コメントにカラーを使う
  CLEAR_ON_ONESDK_CLEAR: true, // わんコメclearで演出も消す

  WARP_MODE: "inward", // "outward" | "inward"
  CENTER_X_RATIO: 0.5, // 中心点X。0.5で画面中央
  CENTER_Y_RATIO: 0.5, // 中心点Y。0.5で画面中央
  WARP_START_DISTANCE_MIN: 72, // outward時の出現距離最小
  WARP_START_DISTANCE_MAX: 140, // outward時の出現距離最大
  CORE_CLEAR_RADIUS: 48, // 光跡が中心点へ食い込まない半径
  WARP_SPEED_MIN: 620, // 最低速度
  WARP_SPEED_MAX: 1280, // 最高速度
  TRAIL_LENGTH_MIN: 150, // 光跡の最短長
  TRAIL_LENGTH_MAX: 520, // 光跡の最長長
  ANGLE_SPREAD: 360, // コメントが飛ぶ角度範囲
  TEXT_FLOW_MODE: "motion", // "motion" | "readable"
  ENABLE_PARTS_RENDERING: true, // 絵文字/スタンプをコメント列に含める
  MAX_PARTS_PER_COMMENT: 16, // text/emoji/sticker部品の最大数
  MAX_IMAGES_PER_COMMENT: 4, // 画像絵文字/スタンプの最大数
  MAX_TEXT_CHARS_PER_COMMENT: 28, // 表示する文字数上限。超過分はTRUNCATE_SUFFIX
  TRUNCATE_SUFFIX: "...", // 長文を省略したときの末尾
  EMOJI_SIZE_RATIO: 1.15, // 通常絵文字のサイズ倍率
  STICKER_SIZE_RATIO: 1.45, // スタンプのサイズ倍率
  PART_GAP: 6, // 部品同士の間隔px
  TEXT_STRETCH: 1.12, // 進行方向への文字伸び
  PERSPECTIVE_SCALE: true, // 距離に応じて拡大縮小する
  GLOW: true, // 文字/画像の発光
  RANDOM_COLOR: false, // コメントごとにランダム色を使う
  CORE_GLOW: true, // 中心点の発光コアを描画する

  DEBUG: false
};

// CSS変数制御
document.documentElement.style.setProperty(
  "--show-comments",
  CONFIG.HIDE_DEFAULT_COMMENTS ? "none" : "block"
);
