(function () {
  'use strict';

  window.VCT_COMMENT_SETTINGS_SCHEMA = {
    display: { title: '表示方式', fields: {
      DISPLAY_MODE: { type: 'select', options: ['stack', 'popup', 'underbar'], labels: { stack: '縦積み', popup: 'ポップアップ', underbar: 'Underbar（横流し・横積み）' }, label: 'コメントの表示方式' }
    } },
    underbar: { title: 'Underbar設定', display: 'underbar', fields: {
      UNDERBAR_MODE: { type: 'select', options: ['ticker', 'stack'], labels: { ticker: '横流し', stack: '横積み（新着で押し出す）' }, label: 'Underbarの表示' },
      UNDERBAR_SLIDE_MS: { type: 'range', min: 0, max: 2000, step: 50, label: 'スライド時間 (ms・横積みのみ)' },
      UNDERBAR_EXIT_CARDS: { type: 'range', min: 0, max: 4, step: .5, label: '画面外の保持余裕 (最大幅の枚数・横積み)' },
      UNDERBAR_DIRECTION: { type: 'select', options: ['rtl', 'ltr'], labels: { rtl: '右から左', ltr: '左から右' }, label: '流れる方向' },
      UNDERBAR_LANES: { type: 'range', min: 1, max: 5, step: 1, label: 'レーン数（横流しのみ）' },
      UNDERBAR_LANE_MODE: { type: 'select', options: ['available', 'sequence', 'random'], labels: { available: '空き優先（下段から）', sequence: '順番（下から上）', random: 'ランダム' }, label: 'レーンの振り分け（横流しのみ）' },
      UNDERBAR_LANE_GAP: { type: 'range', min: 0, max: 200, step: 1, label: '上下の間隔 (px・横流しのみ)' },
      UNDERBAR_SPEED: { type: 'range', min: 30, max: 600, step: 10, label: '移動速度 (px/秒・横流しのみ)' },
      UNDERBAR_WIDTH: { type: 'range', min: 180, max: 1200, step: 10, label: 'カード最大幅 (px・倍率適用前)' },
      UNDERBAR_SCALE: { type: 'range', min: 25, max: 200, step: 5, label: 'カード全体の倍率 (%)' },
      UNDERBAR_BOTTOM: { type: 'range', min: 0, max: 500, step: 1, label: '下端からの位置 (px)' },
      UNDERBAR_GAP: { type: 'range', min: 0, max: 300, step: 5, label: 'カード間隔 (px)' },
      UNDERBAR_QUEUE: { type: 'range', min: 1, max: 100, step: 1, label: '待機上限（横流しのみ・古い待機を削除）' }
    } },
    popup: { title: 'ポップアップ設定', display: 'popup', fields: {
      POPUP_PLACEMENT: { type: 'select', options: ['random', 'anchor'], labels: { random: '全面ランダム（見切れ許容）', anchor: '基準位置＋ばらつき' }, label: '配置方式' },
      POPUP_X: { type: 'range', min: 0, max: 100, step: 1, label: '基準位置・横 (%・基準位置モードのみ)' },
      POPUP_Y: { type: 'range', min: 0, max: 100, step: 1, label: '基準位置・縦 (%・基準位置モードのみ)' },
      POPUP_SPREAD_X: { type: 'range', min: 0, max: 100, step: 1, label: '左右のばらつき (±%・基準位置モードのみ)' },
      POPUP_SPREAD_Y: { type: 'range', min: 0, max: 100, step: 1, label: '上下のばらつき (±%・基準位置モードのみ)' },
      POPUP_WIDTH: { type: 'range', min: 160, max: 1200, step: 10, label: '倍率適用前のカード幅 (px)' },
      POPUP_SCALE: { type: 'range', min: 25, max: 200, step: 5, label: 'カード全体の基本倍率 (%)' },
      POPUP_DURATION: { type: 'range', min: 1, max: 30, step: .5, label: '表示時間 (秒・退場まで)' },
      POPUP_MAX_ITEMS: { type: 'range', min: 1, max: 50, step: 1, label: '最大同時表示数（超過時は最古から退場）' }
    } },
    effect: {
      title: 'コメント枠の演出',
      fields: {
        COMMENT_EFFECT: { type: 'select', options: ['none', 'heart', 'flash', 'stars'], labels: { none: 'なし', heart: 'ハート', stars: 'Stars（星降り）', flash: 'Flash（枠発光）' }, label: '演出' },
      }
    },
    heart: {
      title: 'ハート設定',
      effect: 'heart',
      fields: {
        HEART_TARGET: { type: 'select', options: ['support', 'support-membership', 'all'], labels: { support: '支援のみ', 'support-membership': '支援＋メンバー', all: 'すべて' }, label: 'ハートの対象' },
        HEART_COUNT: { type: 'range', min: 1, max: 24, step: 1, label: 'ハートの数' },
        HEART_SIZE: { type: 'range', min: 8, max: 64, step: 1, label: '基本サイズ (px・±30％)' },
        HEART_COLOR: { type: 'color', label: 'ハートの色' },
        HEART_DURATION: { type: 'range', min: 1, max: 12, step: 0.5, label: '動きの周期 (秒・大きいほどゆっくり)' }
      }
    },
    flash: {
      title: 'Flash設定',
      effect: 'flash',
      fields: {
        FLASH_TARGET: { type: 'select', options: ['support', 'support-membership', 'all'], labels: { support: '支援のみ', 'support-membership': '支援＋メンバー', all: 'すべて' }, label: 'Flashの対象' },
        FLASH_MODE: { type: 'select', options: ['glow', 'shimmer', 'glint', 'trace', 'aurora', 'aurora-background', 'sweep', 'random'], labels: { glow: '枠の発光', shimmer: '枠の発光＋光の帯', glint: 'Glint（きらめき）', trace: 'Trace（枠を巡る光）', aurora: 'Halo（揺らぐ光彩）', 'aurora-background': 'Aurora（オーロラ）', sweep: 'Sweep（光のスキャン）', random: 'ランダム（全7種類）' }, label: '見せ方' },
        FLASH_COLOR_MODE: { type: 'select', options: ['fixed', 'comment'], labels: { fixed: '指定色', comment: 'コメントの強調色に連動' }, label: '発光色の方式' },
        FLASH_COLOR: { type: 'color', label: '指定色（強調色がない場合も使用）' },
        FLASH_STRENGTH: { type: 'range', min: 0, max: 1, step: 0.05, label: '光の強さ' },
        FLASH_DURATION: { type: 'range', min: 1, max: 12, step: 0.5, label: '動きの周期 (秒・Traceは一周)' }
      }
    },
    stars: {
      title: 'Stars設定', effect: 'stars',
      fields: {
        STAR_TARGET: { type: 'select', options: ['support', 'support-membership', 'all'], labels: { support: '支援のみ', 'support-membership': '支援＋メンバー', all: 'すべて' }, label: '星の対象' },
        STAR_DIRECTION: { type: 'select', options: ['down-right', 'down-left', 'random'], labels: { 'down-right': '右下', 'down-left': '左下', random: 'コメントごとにランダム' }, label: '降る方向' },
        STAR_COUNT: { type: 'range', min: 1, max: 48, step: 1, label: '星の数' },
        STAR_COLORS: { type: 'text', label: '星の色（#rrggbbをカンマ区切り）' },
        STAR_SIZE_MIN: { type: 'range', min: 8, max: 64, step: 1, label: '最小サイズ (px)' },
        STAR_SIZE_MAX: { type: 'range', min: 8, max: 64, step: 1, label: '最大サイズ (px・最小以上で適用)' },
        STAR_DURATION_MIN: { type: 'range', min: 1, max: 12, step: .1, label: '最短周期 (秒)' },
        STAR_DURATION_MAX: { type: 'range', min: 1, max: 12, step: .1, label: '最長周期 (秒・最短以上で適用)' }
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
        COMMENT_BG_COLOR: { type: 'color', label: '背景色' },
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
