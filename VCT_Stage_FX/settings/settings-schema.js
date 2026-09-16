window.VCT_SETTINGS_SCHEMA = {
  stage: { title: 'ステージ', fields: {
    STAGE_FIT: { type: 'select', options: ['contain', 'cover'], labels: { contain: '全体を収める', cover: '画面を埋める' }, label: '画面への収め方' },
    SHOW_STAGE_BACKGROUND: { type: 'checkbox', label: '背景を表示' },
    BG_COLOR: { type: 'color', label: '背景色' },
    BACKGROUND_IMAGE: { type: 'text', label: '背景画像の相対パス（空欄で画像なし）' }
  } },
  comments: { title: 'コメント領域', fields: {
    COMMENT_X: { type: 'range-number', min: 0, max: 1920, step: 5, numberStep: 1, label: 'X位置' },
    COMMENT_Y: { type: 'range-number', min: 0, max: 1080, step: 5, numberStep: 1, label: 'Y位置' },
    COMMENT_WIDTH: { type: 'range-number', min: 240, max: 1920, step: 5, numberStep: 1, label: '幅' },
    COMMENT_HEIGHT: { type: 'range-number', min: 200, max: 1080, step: 5, numberStep: 1, label: '高さ' },
    COMMENT_SCALE: { type: 'range', min: .5, max: 1.5, step: .05, label: '領域全体の倍率' },
    SHOW_COMMENT_FRAME: { type: 'checkbox', label: '領域の外枠を表示（確認用）' }
  } },
  ...window.VCT_COMMENT_SETTINGS_SCHEMA,
  effects: { title: 'イベント演出', fields: {
    ENABLE_STAGE_EFFECTS: { type: 'checkbox', label: '支援・メンバーで演出を再生' },
    REDUCED_MOTION: { type: 'checkbox', label: '動き抑制（画面演出・カード装飾を停止）' },
    STAGE_EFFECT_ID: { type: 'select', options: [], labels: {}, label: '使用する演出' },
    STAGE_EFFECT_POLICY: { type: 'select', options: ['queue', 'overlap', 'ignore'], labels: { queue: '順番に待つ', overlap: '上限まで重ねる', ignore: '再生中は受け付けない' }, label: '連続時の処理' },
    STAGE_EFFECT_MAX_ACTIVE: { type: 'range-number', min: 1, max: 4, step: 1, label: '同時実行数' },
    STAGE_EFFECT_QUEUE_LIMIT: { type: 'range-number', min: 0, max: 20, step: 1, label: '待機上限' },
    STAGE_EFFECT_INTENSITY_MODE: { type: 'select', options: ['fixed', 'value'], labels: { fixed: '標準固定', value: '金額・件数に連動' }, label: '演出の強さ' },
    STAGE_EFFECT_COUNT: { type: 'range-number', min: 1, max: 60, step: 1, label: '基準表示数' },
    STAGE_EFFECT_DURATION_MS: { type: 'range-number', min: 1200, max: 10000, step: 100, label: '基準時間（ms）' },
    STAGE_EFFECT_BG_OPACITY: { type: 'range', min: 0, max: .7, step: .05, label: '暗幕の濃さ' }
  } }
};
window.VCT_REFRESH_EFFECT_SCHEMA = () => {
  const schema = window.VCT_SETTINGS_SCHEMA;
  for (const key of Object.keys(schema)) if (key.startsWith('plugin:')) delete schema[key];
  const choices = schema.effects.fields.STAGE_EFFECT_ID;
  choices.options = []; choices.labels = {};
  for (const [id, Effect] of window.VCTStage.registry.effects) {
    choices.options.push(id); choices.labels[id] = Effect.manifest.name;
    if (Effect.manifest.settings) schema[`plugin:${id}`] = {
      title: `${Effect.manifest.name}の設定${Effect.manifest.assetDisclosure === 'ai-generated' ? '（AI生成画像を同梱）' : ''}`,
      tab: 'effects', plugin: id, fields: Effect.manifest.settings
    };
  }
};
window.VCT_REFRESH_EFFECT_SCHEMA();

for (const [id, section] of Object.entries(window.VCT_SETTINGS_SCHEMA)) {
  section.tab = id === 'stage' ? 'stage' : id === 'comments' ? 'placement' : id === 'effects' || id.startsWith('plugin:') ? 'effects' : ['effect','heart','flash','stars'].includes(id) ? 'decoration' : 'display';
}
window.VCT_SETTINGS_SCHEMA.general.display = 'stack';
