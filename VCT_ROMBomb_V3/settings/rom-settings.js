// MIT Copyright (c) 2026 Umetana
(function () {
  'use strict';
  const contract = window.VCT_SETTINGS_CONTRACT.create({
    templateId: 'rom_bomb', schemaVersion: 1, templateVersion: '0.2.0',
    defaults: window.CONFIG_DEFAULT, sections: window.VCT_SETTINGS_SCHEMA
  });
  const validate = (source) => {
    const next = contract.validate(source);
    if (!(next.WARN_MIN < next.DANGER_MIN && next.DANGER_MIN < next.EXPLODE_MIN)) {
      throw new Error('登場後の時間は「警戒 < 危険 < 爆発」の順で指定してください。');
    }
    if (!Number.isInteger(next.MAX_ITEMS)) throw new Error('最大表示人数は整数で指定してください。');
    if (!Number.isInteger(next.WRAP_COUNT)) throw new Error('折り返し人数は0～30の整数で指定してください。');
    if (next.RANDOM_X + next.RANDOM_WIDTH > 1920 || next.RANDOM_Y + next.RANDOM_HEIGHT > 1080) {
      throw new Error('ランダム配置の範囲は1920×1080の画面内に収めてください。');
    }
    return next;
  };
  window.VCT_TEMPLATE_SETTINGS = Object.freeze({ ...contract, validate });
  // 保存データが不正でも透過画面の起動を妨げない。
  try {
    validate(window.CONFIG);
  } catch (_) {
    let fallback;
    try { fallback = validate(window.VCT_CONFIG_RUNTIME.baseline); }
    catch (_) { fallback = validate(window.CONFIG_DEFAULT); }
    Object.keys(window.CONFIG).forEach(key => delete window.CONFIG[key]);
    Object.assign(window.CONFIG, fallback);
    console.warn('ROM爆弾: 設定が不正なため、有効な初期設定で起動しました。');
  }
})();
