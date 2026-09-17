(function () {
  'use strict';

  window.VCT_SETTINGS_SCHEMA = {
    general: {
      title: '基本表示設定',
      fields: {
        MAX_ITEMS: { type: 'number', label: '最大表示件数' },
        MAX_WIDTH: { type: 'text', label: '最大横幅（互換用）' }
      }
    },
    underbar: {
      title: 'Underbar表示',
      fields: {
        UNDERBAR_LAYOUT_MODE: { type: 'select', options: ['ticker', 'stack'], label: 'レイアウトモード' },
        UNDERBAR_DIRECTION: { type: 'select', options: ['rtl', 'ltr'], label: '流れる向き' },
        UNDERBAR_LANES: { type: 'number', label: 'レーン数' },
        UNDERBAR_SCROLL_MS: { type: 'number', label: '横断時間 (ms)' },
        UNDERBAR_CARD_MIN_WIDTH: { type: 'text', label: 'コメント枠の最小横幅' },
        UNDERBAR_CARD_WIDTH: { type: 'text', label: 'コメント枠の最大横幅' },
        UNDERBAR_CARD_HEIGHT_PX: { type: 'number', label: 'コメント枠の高さ (px)' },
        UNDERBAR_STACK_MAX_ITEMS: { type: 'number', label: 'stack最大表示件数' },
        UNDERBAR_STACK_EXIT_CARDS: { type: 'number', label: 'stack退場距離' },
        UNDERBAR_STACK_CARD_HEIGHT_PX: { type: 'number', label: 'stackコメント枠高さ (px)' },
        UNDERBAR_STACK_MESSAGE_LINES: { type: 'number', label: 'stack本文行数' },
        UNDERBAR_STACK_SLIDE_MS: { type: 'number', label: 'stackスライド時間 (ms)' },
        UNDERBAR_LANE_HEIGHT_PX: { type: 'number', label: 'レーン間隔 (px)' },
        UNDERBAR_BOTTOM_PX: { type: 'number', label: '画面下からの位置 (px)' },
        UNDERBAR_SIDE_PADDING_PX: { type: 'number', label: '画面外余白 (px)' },
        UNDERBAR_MIN_GAP_PX: { type: 'number', label: '同一レーンの最低間隔 (px)' },
        COMMENT_OVERFLOW_MODE: { type: 'select', options: ['clip', 'marquee'], label: '長文処理' },
        MESSAGE_MARQUEE_MS: { type: 'number', label: '枠内スクロール時間 (ms)' }
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
