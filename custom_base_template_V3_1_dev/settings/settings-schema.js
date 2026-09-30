(function () {
  'use strict';

  window.VCT_SETTINGS_SCHEMA = {
    general: {
      title: '基本表示設定',
      fields: {
        MAX_ITEMS: { type: 'number', label: '最大表示件数' },

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

window.VCT_SETTINGS_SCHEMA = {
 placement: { title:'コメント配置', fields: Object.fromEntries([['COMMENT_X','横位置 (0～1920px)',0,1920,5,1],['COMMENT_Y','縦位置 (0～1080px)',0,1080,5,1],['COMMENT_WIDTH','領域の幅 (160～1920px)',160,1920,5,1],['COMMENT_HEIGHT','領域の高さ (80～1080px)',80,1080,5,1],['COMMENT_SCALE','全体倍率 (0.1～3)',.1,3,.05,.01]].map(([key,label,min,max,step,numberStep])=>[key,{type:'placement',label,min,max,step,numberStep}])) },
 ...window.VCT_SETTINGS_SCHEMA,
 effect: { title:window.VCT_EFFECT?.title || '演出', fields:{ EFFECT_ENABLED:{type:'checkbox',label:'支援・メンバーの枠演出'}, ...(window.VCT_EFFECT?.fields || {}) } }
};
if (window.VCT_EFFECT?.material) {
  window.VCT_SETTINGS_SCHEMA.material = {
    title: '演出の素材',
    fields: {
      FX_MATERIAL_MODE: { type:'select', options:['emoji','image'], optionLabels:{emoji:'絵文字',image:'画像'}, label:'素材モード' },
      FX_MATERIAL_FILE: { type:'text', label:'画像ファイル名（assets内）' },
      FX_MATERIAL_SIZE: { type:'placement', min:1, max:512, step:1, numberStep:1, label:'表示サイズ（長辺 1～512px）' }
    }
  };
}
