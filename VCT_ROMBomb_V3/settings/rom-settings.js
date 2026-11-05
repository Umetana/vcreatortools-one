// MIT Copyright (c) 2026 Umetana
(function () {
  'use strict';
  const contract = window.VCT_SETTINGS_CONTRACT.create({
    templateId: 'rom_bomb', schemaVersion: 1, templateVersion: '0.3.0',
    defaults: window.CONFIG_DEFAULT, sections: window.VCT_SETTINGS_SCHEMA
  });
  const wordKeys = ['RELEASE_DENY_WORDS', 'RELEASE_ALLOW_WORDS'];
  const migrateWords = (source) => {
    if (!source || Array.isArray(source) || !Object.hasOwn(source, 'RELEASE_WORDS')) return source;
    if (typeof source.RELEASE_WORDS !== 'string') throw new Error('指定ワードの型が不正です。');
    const next = { ...source };
    for (const key of wordKeys) if (next[key] === undefined) next[key] = source.RELEASE_WORDS;
    delete next.RELEASE_WORDS;
    return next;
  };
  const validate = (source) => {
    source = migrateWords(source);
    // ワードは描画・CSSへ渡さない平文。共通のCSS文字列制限とは分離する。
    const safeSource = source && !Array.isArray(source) ? { ...source } : source;
    for (const key of wordKeys) if (typeof source?.[key] === 'string') safeSource[key] = '';
    const next = contract.validate(safeSource);
    for (const key of wordKeys) {
      if (source[key].length > 2048) throw new Error('指定ワードは各欄2048文字以内にしてください。');
      next[key] = source[key];
    }
    const selectedWords = next.RELEASE_MODE === 'deny' ? next.RELEASE_DENY_WORDS : next.RELEASE_ALLOW_WORDS;
    if (next.RELEASE_MODE !== 'any' && !selectedWords.split(/\r?\n/).some(word => word.trim())) {
      throw new Error('選択した解除モードのワードを1件以上入力してください。');
    }
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
    const runtime = window.VCT_CONFIG_RUNTIME;
    const baseline = runtime.baseline;
    // 初期値との合成前に移行し、明示的に保存した空欄を旧ワードで埋め戻さない。
    const migratedBaseline = runtime.fileConfig ? { ...runtime.defaults, ...migrateWords(runtime.fileConfig) } : { ...migrateWords(baseline) };
    Object.keys(baseline).forEach(key => delete baseline[key]);
    Object.assign(baseline, migratedBaseline);
    const candidate = runtime.localOverrides ? { ...baseline, ...migrateWords(runtime.localOverrides) } : migrateWords(window.CONFIG);
    const next = validate(candidate);
    Object.keys(window.CONFIG).forEach(key => delete window.CONFIG[key]);
    Object.assign(window.CONFIG, next);
  } catch (_) {
    let fallback;
    try { fallback = validate(window.VCT_CONFIG_RUNTIME.baseline); }
    catch (_) { fallback = validate(window.CONFIG_DEFAULT); }
    Object.keys(window.CONFIG).forEach(key => delete window.CONFIG[key]);
    Object.assign(window.CONFIG, fallback);
    console.warn('ROM爆弾: 設定が不正なため、有効な初期設定で起動しました。');
  }
})();
