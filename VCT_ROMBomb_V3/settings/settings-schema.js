// MIT Copyright (c) 2026 Umetana
(function () {
  'use strict';
  window.VCT_SETTINGS_SCHEMA = {
    monitoring: { title: '無言時間と対象者', fields: {
      ENABLED: { type: 'checkbox', label: 'カウントを進める（OFFで一時停止）' },
      START_MIN: { type: 'number', label: '表示までの無言時間（分）', min: .01, max: 1440 },
      WARN_MIN: { type: 'number', label: '登場後の警戒開始（分）', min: .01, max: 1440 },
      DANGER_MIN: { type: 'number', label: '登場後の危険開始（分）', min: .01, max: 1440 },
      EXPLODE_MIN: { type: 'number', label: '登場後の爆発まで（分）', min: .01, max: 1440 },
      MAX_ITEMS: { type: 'number', label: '最大表示人数', min: 1, max: 30 },
      INCLUDE_MODERATORS: { type: 'checkbox', label: 'モデレーターを対象に含める' }
    } },
    layout: { title: '配置と表示', fields: {
      ARRANGEMENT: { type: 'select', label: '並べ方', options: ['vertical', 'horizontal', 'random'], optionLabels: { vertical: '縦並び', horizontal: '横並び', random: 'ランダム配置' } },
      WRAP_COUNT: { type: 'number', label: '折り返し人数（縦は1列・横は1行、0でなし）', min: 0, max: 30 },
      ITEM_GAP_PX: { type: 'number', label: 'カード間隔（px・名前領域を含む）', min: 0, max: 200 },
      POSITION: { type: 'select', label: '表示位置（四隅プリセット）', options: ['right-top','left-top','right-bottom','left-bottom'], optionLabels: { 'right-top': '右上', 'left-top': '左上', 'right-bottom': '右下', 'left-bottom': '左下' } },
      OFFSET_X: { type: 'placement', label: '左右の端からの距離（px）', min: 0, max: 1920, step: 5, numberStep: 1 },
      OFFSET_Y: { type: 'placement', label: '上下の端からの距離（px）', min: 0, max: 1080, step: 5, numberStep: 1 },
      SCALE: { type: 'placement', label: '全体表示倍率', min: .1, max: 3, step: .05, numberStep: .01 },
      SHOW_NAME: { type: 'checkbox', label: '名前を表示' },
      SHOW_TIME: { type: 'checkbox', label: 'タイマーを表示' },
      TIME_MODE: { type: 'select', label: '時間の表示方式', options: ['elapsed', 'remaining'], optionLabels: { elapsed: '爆弾登場からの経過時間', remaining: '爆発までの残り時間' } },
      VISUAL_MODE: { type: 'select', label: 'ビジュアルモード', options: ['emoji', 'visual'], optionLabels: { emoji: 'Emoji mode（絵文字）', visual: 'Visual mode（生成画像）' } },
      EXPLOSION_EFFECT: { type: 'checkbox', label: '爆発演出' },
      SHATTER_CARDS: { type: 'checkbox', label: '爆発時にカードを爆散させる' },
      EXPLOSION_SECONDS: { type: 'number', label: '爆発から退場まで（秒）', min: .3, max: 30 },
      RELEASE_EFFECT: { type: 'checkbox', label: '解除演出' }
    } },
    audio: { title: '効果音（保存時に適用）', fields: {
      EXPLOSION_SOUND: { type: 'checkbox', label: '爆発時に効果音を鳴らす' },
      SOUND_MODE: { type: 'select', label: '効果音の種類', options: ['synth', 'mp3'], optionLabels: { synth: 'JS合成', mp3: 'MP3（SUNO生成音）' } },
      SOUND_VOLUME: { type: 'range', label: '効果音の音量（%）', min: 0, max: 100, step: 1 }
    } },
    randomArea: { title: 'ランダム配置の範囲', arrangement: 'random', fields: {
      RANDOM_X: { type: 'placement', label: '範囲の左位置（px）', min: 0, max: 1919, step: 5, numberStep: 1 },
      RANDOM_Y: { type: 'placement', label: '範囲の上位置（px）', min: 0, max: 1079, step: 5, numberStep: 1 },
      RANDOM_WIDTH: { type: 'placement', label: '範囲の幅（px）', min: 1, max: 1920, step: 5, numberStep: 1 },
      RANDOM_HEIGHT: { type: 'placement', label: '範囲の高さ（px）', min: 1, max: 1080, step: 5, numberStep: 1 }
    } }
  };
})();
