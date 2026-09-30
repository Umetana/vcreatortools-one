/**
 * VCT Support Thanks: Configuration
 */
window.CONFIG = {
  // ---------------------------------------------------------
  // 基本設定
  // ---------------------------------------------------------

  // 演出を表示する対象
  // "gift_only": 支援イベント（スパチャ等）のみ
  // "all": 全てのコメント
  triggerMode: "gift_only",

  // ---------------------------------------------------------
  // 演出（アイコン落下）設定
  // ---------------------------------------------------------

  // ランクごとの設定（基本数, ランダム幅, 基本アイコンサイズ）
  // blue, cyan, green, yellow, orange, pink, red はわんコメの priceColor に対応
  rankSettings: {
    'blue': { base: 10, range: 5, size: 40 },
    'cyan': { base: 15, range: 5, size: 40 },
    'green': { base: 30, range: 10, size: 50 },
    'yellow': { base: 60, range: 20, size: 55 },
    'orange': { base: 120, range: 40, size: 60 },
    'pink': { base: 180, range: 60, size: 70 },
    'red': { base: 350, range: 100, size: 90 },
    'default': { base: 10, range: 5, size: 40 }
  },

  // 落下アニメーションの持続時間（秒） [最小, 最大]
  durationRange: [2, 5],

  // 落下開始までのランダム遅延（秒） [最大]
  delayMax: 2,

  // アイコンの出現位置
  // "offscreen": 画面外の上から降らせる
  // "top_edge": 画面最上部からそのまま降らせる

  spawnOriginMode: "offscreen",
  // spawnOriginMode: "top_edge",

  // オーラの色設定（フォールバック用）
  colorMap: {
    'blue': 'rgba(0, 150, 255, 0.8)',
    'cyan': 'rgba(0, 255, 255, 0.8)',
    'green': 'rgba(0, 255, 0, 0.8)',
    'yellow': 'rgba(255, 255, 0, 0.8)',
    'orange': 'rgba(255, 165, 0, 0.8)',
    'pink': 'rgba(255, 20, 147, 0.8)',
    'red': 'rgba(255, 0, 0, 0.8)',
    'default': 'rgba(255, 255, 255, 0.8)'
  }
};
