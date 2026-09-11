(function () {
  'use strict';

  window.VCT_SETTINGS_SCHEMA = {
    stageEffects: {
      title: 'StageFX画面演出',
      fields: {
        ENABLE_STAGE_EFFECTS: { type: 'checkbox', label: 'イベント連動画面演出' },
        STAGE_EFFECT_INTENSITY_MODE: { type: 'select', options: ['fixed', 'value'], label: '演出強度' },
        STAGE_EFFECT_RENDER_MODE: { type: 'select', options: ['emoji', 'image'], label: '演出素材' },
        STAGE_EFFECT_POLICY: { type: 'select', options: ['queue', 'overlap', 'ignore'], label: '連続時の処理' },
        STAGE_EFFECT_MAX_ACTIVE: { type: 'range-number', min: 1, max: 4, step: 1, label: '同時実行数' },
        STAGE_EFFECT_QUEUE_LIMIT: { type: 'range-number', min: 0, max: 20, step: 1, label: '待機上限' },
        STAGE_EFFECT_COUNT: { type: 'range-number', min: 1, max: 60, step: 1, label: '表示数' },
        STAGE_EFFECT_DURATION_MS: { type: 'range-number', min: 1200, max: 10000, step: 100, label: '演出時間 (ms)' },
        STAGE_EFFECT_BG_OPACITY: { type: 'range', min: 0, max: 0.7, step: 0.05, label: '演出中の暗幕' }
      }
    },
    halloweenStage: {
      title: 'ハロウィンステージ',
      fields: {
        VISUAL_MODE: { type: 'select', options: ['emoji', 'visual'], label: '表示モード' },
        STAGE_FIT: { type: 'select', options: ['contain', 'cover'], label: 'ステージ拡縮' },
        COMMENT_X: { type: 'range-number', min: 0, max: 1920, step: 10, label: 'コメントX位置' },
        COMMENT_Y: { type: 'range-number', min: 0, max: 1080, step: 10, label: 'コメントY位置' },
        COMMENT_WIDTH: { type: 'range-number', min: 240, max: 1800, step: 10, label: 'コメント領域の幅' },
        COMMENT_HEIGHT: { type: 'range-number', min: 200, max: 1040, step: 10, label: 'コメント領域の高さ' },
        COMMENT_SCALE: { type: 'range', min: 0.5, max: 1.5, step: 0.05, label: 'コメント倍率' },
        GIFT_COLOR_MODE: { type: 'select', options: ['original', 'hybrid', 'halloween'], label: 'ギフト配色' },
        SHOW_STAGE_BACKGROUND: { type: 'checkbox', label: 'ステージ背景' },
        SHOW_COMMENT_FRAME: { type: 'checkbox', label: 'コメント領域の外枠' },
        SHOW_AMBIENT_EFFECTS: { type: 'checkbox', label: '霧・浮遊装飾' },
        REDUCED_MOTION: { type: 'checkbox', label: '動きを抑える' }
      }
    },
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
        ICON_MODE: { type: 'select', options: ['profile', 'halloween', 'hidden'], label: 'アイコン表示' },
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
        BG_COLOR: { type: 'color', label: '背景色' },
        BG_OPACITY: { type: 'range', min: 0, max: 1, step: 0.05, label: '背景透明度' },
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
