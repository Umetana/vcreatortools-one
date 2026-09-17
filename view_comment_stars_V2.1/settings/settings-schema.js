(function () {
  'use strict';

  window.VCT_SETTINGS_SCHEMA = {
    general: {
      title: '基本表示設定',
      fields: {
        MAX_ITEMS: { type: 'number', label: '最大表示件数' },
        MAX_WIDTH: { type: 'text', label: '最大横幅' },
        STACK_DIRECTION: { type: 'select', options: ['up', 'down'], label: '積み上げ方向' },
        ITEM_GAP_PX: { type: 'number', label: 'コメント間隔 (px)' }
      }
    },
    visibility: {
      title: '表示要素',
      fields: {
        SHOW_ICON: { type: 'checkbox', label: 'アイコン' },
        SHOW_NAME: { type: 'checkbox', label: '名前' },
        SHOW_BADGES: { type: 'checkbox', label: 'バッジ' },
        SHOW_USER_FLAGS: { type: 'checkbox', label: 'OWNER / MOD' },
        COMMENT_TRANSLATION_MODE: { type: 'select', options: ['original', 'translated', 'both'], label: '翻訳表示' },
        MAX_COMMENT_UNITS: { type: 'number', label: '本文上限 (0で無制限)' }
      }
    },
    eventMessages: {
      title: 'イベント本文',
      fields: {
        SHOW_EVENT_MESSAGES: { type: 'checkbox', label: 'イベント本文を表示' },
        SHOW_EVENT_MESSAGE_SUPERCHAT: { type: 'checkbox', label: 'スーパーチャット' },
        SHOW_EVENT_MESSAGE_SUPERSTICKER: { type: 'checkbox', label: 'スーパーステッカー' },
        SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT: { type: 'checkbox', label: 'メンバー継続' },
        SHOW_EVENT_MESSAGE_MEMBER_JOIN: { type: 'checkbox', label: 'メンバー加入' },
        SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT: { type: 'checkbox', label: 'メンギフ送信' },
        SHOW_EVENT_MESSAGE_GIFT_RECEIVED: { type: 'checkbox', label: 'メンギフ受取' }
      }
    },
    typography: {
      title: '文字とタイマー',
      fields: {
        FONT_FAMILY: { type: 'text', label: 'フォント' },
        FONT_SIZE: { type: 'number', label: '文字サイズ (px)' },
        META_SCALE: { type: 'range', min: 0.5, max: 1.5, step: 0.05, label: '名前・バッジ倍率' },
        AUTO_HIDE_MS: { type: 'number', label: '自動非表示 (ms)' },
        FADE_IN_MS: { type: 'number', label: '入場時間 (ms)' },
        FADE_OUT_MS: { type: 'number', label: '退場時間 (ms)' }
      }
    },
    emphasis: {
      title: '強調表示',
      fields: {
        GIFT_BG_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: 'ギフト背景' },
        GIFT_BORDER_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: 'ギフト枠線' },
        MEMBER_BG_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: 'メンバー背景' },
        MEMBER_BORDER_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: 'メンバー枠線' }
      }
    },
    stars: {
      title: '星降り演出',
      fields: {
        STAR_MODE: { type: 'select', options: ['off', 'gift', 'special', 'always'], label: '星の表示' },
        STAR_DIRECTION: { type: 'select', options: ['down-right', 'down-left', 'random'], label: '星の向き' },
        STAR_GLYPH: { type: 'text', label: '星文字' },
        STAR_COUNT: { type: 'number', label: '星数' },
        STAR_COLORS: { type: 'text', label: '星色パレット' },
        STAR_SIZE_MIN: { type: 'number', label: '最小サイズ (px)' },
        STAR_SIZE_MAX: { type: 'number', label: '最大サイズ (px)' },
        STAR_DURATION_MIN: { type: 'number', label: '最短落下時間 (秒)' },
        STAR_DURATION_MAX: { type: 'number', label: '最長落下時間 (秒)' },
        STAR_DELAY_MAX: { type: 'number', label: '最大遅延 (秒)' }
      }
    },
    appearance: {
      title: 'カラー・スタイル',
      fields: {
        BG_GLASS: { type: 'text', label: '背景色' },
        BG_BLUR: { type: 'text', label: 'ぼかし' },
        BASE_BORDER_COLOR: { type: 'color', label: '通常枠線色' },
        BASE_BORDER_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: '通常枠線の濃さ' },
        BASE_BORDER_WIDTH: { type: 'number', label: '通常枠線の太さ (px)' },
        SYSTEM_BORDER_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: '固定コメント枠線' },
        TEXT_MAIN: { type: 'color', label: '本文色' },
        TEXT_NAME: { type: 'color', label: '名前色' },
        ACCENT_COLOR: { type: 'color', label: 'アクセント色' },
        SHADOW_SOFT: { type: 'text', label: '影' },
        DEBUG: { type: 'checkbox', label: 'デバッグモード' }
      }
    }
  };
})();
