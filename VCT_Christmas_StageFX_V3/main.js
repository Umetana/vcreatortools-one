// テンプレートの接続部。演出RuntimeはOneSDKや個別の設定キーを参照しない。
(function () {
  'use strict';
  const api = window.VCTStage;
  const stage = document.getElementById('stage');
  const layout = new api.StageLayout(stage);
  const host = new api.EffectHost({ container: stage.querySelector('[data-layer="effects"]'), backdrop: stage.querySelector('[data-layer="backdrop"]'), size: layout.size });
  const ambient = new api.EffectHost({ container: stage.querySelector('[data-layer="ambient"]'), size: layout.size, persistent: true });
  const commentRegion = layout.region('comments');
  const widget = new api.CommentWidget(commentRegion);
  const commentFrame = new api.ChristmasCommentFrame(stage.querySelector('[data-layer="foreground"]'), commentRegion);
  const initial = { ...window.CONFIG };
  let config = { ...initial }, disposed = false, lastRunId = null;
  let ambientPaused = false;
  const controlsAllowed = new URLSearchParams(location.search).get('ui') !== '0';
  let connectionStatus = 'コメント購読を準備中';
  let treePreviewCount = null, treePreviewGifts = null, treeFrame = null, treeStorageError = '';
  let treeStorage;
  try { treeStorage = window.localStorage; } catch (_) { treeStorage = { getItem: () => null, setItem: () => { throw new Error('保存不可'); } }; }
  const treeProgress = new window.VCTChristmasProgress.Progress({ storage: treeStorage, key: `${window.VCT_CONFIG_RUNTIME.storageKey}.christmas-tree.v1`,
    onChange: () => {
      if (treeFrame === null && !disposed) treeFrame = requestAnimationFrame(() => { treeFrame = null; syncTree(); });
    }, onError: message => { treeStorageError = message; }
  });
  function treeSnapshot() {
    return { ...window.VCTChristmasProgress.snapshot(treePreviewCount ?? treeProgress.count, config.CHRISTMAS_TREE_GOAL, config.CHRISTMAS_TREE_STAGES), seed: treeProgress.seed,
      gifts: (treePreviewGifts ?? treeProgress.gifts).slice(-window.VCTChristmasProgress.normalizeGiftLimit(config.CHRISTMAS_TREE_GIFT_LIMIT)) };
  }
  function syncTree() {
    if (disposed) return;
    const record = [...ambient.active.values()].find(item => item.effectId === 'christmas_tree');
    if (record) ambient.update(record.id, { ...effectParams('christmas_tree'), paused: ambientPaused || config.REDUCED_MOTION === true || document.hidden });
    window.dispatchEvent(new CustomEvent('vct-tree-status'));
  }
  function apply(next) {
    config = { ...window.VCT_CONFIG_RUNTIME.effective, ...initial, ...next };
    if (!api.registry.get(config.STAGE_EFFECT_ID) || api.registry.get(config.STAGE_EFFECT_ID).manifest.lifecycle === 'persistent') config.STAGE_EFFECT_ID = 'sample_effect';
    layout.configure(config.STAGE_FIT);
    // 全面表示でも指定領域の設定値は上書きしない。方式を戻せば同じ配置へ戻る。
    const fullscreen = config.DISPLAY_MODE === 'underbar' || (config.DISPLAY_MODE === 'popup' && config.POPUP_PLACEMENT !== 'anchor');
    layout.region('comments', fullscreen
      ? { x: 0, y: 0, width: layout.size.width, height: layout.size.height, scale: 1 }
      : { x: config.COMMENT_X, y: config.COMMENT_Y, width: config.COMMENT_WIDTH, height: config.COMMENT_HEIGHT, scale: config.COMMENT_SCALE });
    widget.configure(config);
    commentFrame.configure(config);
    const background = stage.querySelector('[data-layer="background"]');
    const presets = { forest: 'assets/background-forest-v1.png', fireplace: 'assets/background-fireplace-v1.png', night: 'assets/background-night-v1.png' };
    const preset = Object.hasOwn(presets, config.CHRISTMAS_BACKGROUND) ? presets[config.CHRISTMAS_BACKGROUND] : '';
    const plain = config.CHRISTMAS_ASSET_MODE === 'plain';
    background.hidden = config.CHRISTMAS_BACKGROUND === 'transparent' || (preset ? plain : config.SHOW_STAGE_BACKGROUND === false);
    background.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(config.BG_COLOR) ? config.BG_COLOR : '#101923';
    const path = preset || String(config.BACKGROUND_IMAGE || '');
    // 入力はローカルの相対パスのみ。外部素材サービスを追加しない。
    background.style.backgroundImage = !background.hidden && !plain && path && !/^[/\\]|[:%?#]/.test(path) && !path.split(/[\\/]/).includes('..') ? `url(${JSON.stringify(path)})` : 'none';
    const reduced = config.REDUCED_MOTION === true;
    stage.classList.toggle('reduced-motion', reduced);
    host.queue = host.queue.filter(record => config[api.effectKey(record.effectId, 'ENABLED')] !== false);
    for (const record of [...host.active.values()]) {
      if (config[api.effectKey(record.effectId, 'ENABLED')] === false) host.stop(record.id);
    }
    host.configure({ policy: config.STAGE_EFFECT_POLICY, maxActive: config.STAGE_EFFECT_MAX_ACTIVE, queueLimit: config.STAGE_EFFECT_QUEUE_LIMIT,
      enabled: config.ENABLE_STAGE_EFFECTS !== false && !reduced && !document.hidden });
    ambient.configure({ policy: 'overlap', maxActive: 4, queueLimit: 0 });
    const paused = ambientPaused || reduced || document.hidden;
    for (const record of [...ambient.active.values()]) {
      if (!api.registry.get(record.effectId) || config[api.effectKey(record.effectId, 'ENABLED')] !== true) ambient.stop(record.id);
    }
    for (const [id, Effect] of api.registry.effects) {
      if (Effect.manifest.lifecycle !== 'persistent' || config[api.effectKey(id, 'ENABLED')] !== true) continue;
      const params = { ...effectParams(id), paused };
      const record = [...ambient.active.values()].find(item => item.effectId === id);
      if (record) ambient.update(record.id, params); else ambient.trigger(id, params);
    }
  }
  function effectParams(id, parsed = {}) {
    const value = name => config[api.effectKey(id, name)];
    const intensity = value('INTENSITY');
    const resolvedIntensity = ['small', 'standard', 'large', 'extra'].includes(intensity) ? intensity : api.intensity(parsed, config.STAGE_EFFECT_INTENSITY_MODE);
    const baseDuration = api.number(config.STAGE_EFFECT_DURATION_MS, 1200, 10000, 3000);
    return {
      count: api.number(config.STAGE_EFFECT_COUNT, 1, 60, 18),
      duration: id === 'christmas_present' && api.registry.get(id)?.durationFor ? api.registry.get(id).durationFor(baseDuration, resolvedIntensity) : baseDuration,
      intensity: resolvedIntensity,
      bgOpacity: api.number(config.STAGE_EFFECT_BG_OPACITY, 0, .7, 0),
      placement: { x: value('X'), y: value('Y'), width: value('WIDTH'), height: value('HEIGHT'), scale: value('SCALE') },
      settings: config.CHRISTMAS_ASSET_MODE === 'plain' ? { ...config, HALLOWEEN_RENDER_MODE: 'emoji' } : config,
      ...(id === 'christmas_tree' ? { progress: treeSnapshot(), progressPreview: treePreviewCount !== null || treePreviewGifts !== null } : {})
    };
  }
  function disabledReason() {
    if (disposed) return 'disabled';
    if (config.ENABLE_STAGE_EFFECTS === false) return 'effects-off';
    if (config.REDUCED_MOTION === true) return 'reduced-motion';
    if (document.hidden) return 'page-hidden';
    return '';
  }
  function trigger(parsed = {}, effectId = config.STAGE_EFFECT_ID) {
    const reason = disabledReason();
    if (reason) return { status: 'rejected', reason };
    if (config[api.effectKey(effectId, 'ENABLED')] === false) return { status: 'rejected', reason: 'plugin-off' };
    const result = host.trigger(effectId, effectParams(effectId, parsed));
    if (result.id) lastRunId = result.id;
    return result;
  }
  const adapter = new api.OneCommeAdapter({
    onComment: (parsed, meta) => {
      widget.add(parsed);
      if (meta.canTrigger) {
        // 下書きの支援倍率やON/OFFを実際の成長へ混ぜない。
        const saved = window.VCT_CONFIG_RUNTIME.effective;
        if (saved[api.effectKey('christmas_tree', 'ENABLED')] === true) {
          const points = window.VCTChristmasProgress.pointsFor(parsed, saved.CHRISTMAS_TREE_SUPPORT_BASE, value => api.intensity(value, 'value'));
          treeProgress.accept(meta.commentKey, points, { gift: window.VCTChristmasProgress.isGiftSupport(parsed),
            limit: saved.CHRISTMAS_TREE_GIFT_LIMIT, rank: api.intensity(parsed, 'value') });
        }
        const support = window.VCTChristmasProgress.isGiftSupport(parsed);
        if (support && config.CHRISTMAS_PRESENT_AUTO === true && config.STAGE_EFFECT_ID !== 'christmas_present') trigger(parsed, 'christmas_present');
        if (api.isEffectEvent(parsed) && (config.STAGE_EFFECT_ID !== 'christmas_present' || support)) trigger(parsed);
      }
    },
    onClear: () => { widget.clear(); host.stopAll(); },
    onStatus: text => { connectionStatus = text; }
  });
  const preview = event => { if (!disposed && event.detail && typeof event.detail === 'object') {
    if (event.type === 'vct-settings-committed') { treePreviewCount = null; treePreviewGifts = null; treeProgress.trimGifts(event.detail.CHRISTMAS_TREE_GIFT_LIMIT); }
    apply(event.detail);
  } };
  const reset = () => { if (!disposed) { treePreviewCount = null; treePreviewGifts = null; apply(window.VCT_CONFIG_RUNTIME.effective); } };
  const visibility = () => { if (!disposed) apply(config); };
  function destroy() {
    if (disposed) return;
    disposed = true;
    if (treeFrame !== null) cancelAnimationFrame(treeFrame);
    treeProgress.destroy(); adapter.destroy(); host.destroy(); ambient.destroy(); widget.destroy(); commentFrame.destroy(); layout.destroy();
    window.removeEventListener('vct-settings-committed', preview); window.removeEventListener('vct-settings-preview', preview); window.removeEventListener('vct-settings-reset-preview', reset);
    document.removeEventListener('visibilitychange', visibility);
  }
  window.addEventListener('vct-settings-preview', preview);
  window.addEventListener('vct-settings-committed', preview);
  window.addEventListener('vct-settings-reset-preview', reset);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', destroy, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  apply(config); adapter.start();
  api.effectsReady.then(() => { if (!disposed) { Object.assign(initial, window.CONFIG); treeProgress.trimGifts(window.CONFIG.CHRISTMAS_TREE_GIFT_LIMIT); apply(initial); } });
  window.addEventListener('vct-effects-changed', () => {
    if (disposed) return;
    for (const record of [...host.queue, ...host.active.values()]) {
      if (!api.registry.get(record.effectId)) host.stop(record.id);
    }
    apply(config);
  });
  // 操作は設定パネルだけに提供。配信画面へ診断情報を出さない。
  if (controlsAllowed) window.VCT_STAGE_PREVIEW = {
    comment() {
      widget.add({ user: { displayName: 'プレビュー' }, message: { text: 'コメント領域の位置と読みやすさを確認できます。', parts: [{ type: 'text', content: 'コメント領域の位置と読みやすさを確認できます。' }] } });
    },
    effect: id => trigger({}, id), stopLast: () => host.stop(lastRunId),
    stopAll: () => { host.stopAll(); ambientPaused = true; apply(config); },
    resumeAmbient: () => { ambientPaused = false; apply(config); },
    treeTest: () => {
      const p = treeSnapshot();
      treePreviewCount = Math.min(Number.MAX_SAFE_INTEGER, p.completed ? p.count + Math.ceil(p.goal / 10) : Math.ceil((p.stage + 1) * p.goal / p.stages));
      syncTree();
    },
    treeGiftTest: () => {
      const gifts = treePreviewGifts ?? treeProgress.gifts;
      const id = Math.max(treeProgress.giftSerial, ...gifts.map(gift => gift.id)) + 1;
      treePreviewGifts = window.VCTChristmasProgress.addGift(gifts, id, treeProgress.seed, config.CHRISTMAS_TREE_GIFT_LIMIT);
      syncTree();
    },
    treeEndTest: () => { treePreviewCount = null; treePreviewGifts = null; syncTree(); },
    treeReset: () => { treePreviewCount = null; treePreviewGifts = null; treeProgress.reset(); syncTree(); },
    treeStatus: () => { const p = treeSnapshot(); return `${treePreviewCount === null && treePreviewGifts === null ? '実際の成長' : '成長プレビュー（保存しません）'}：${p.count} / ${p.goal}P・${p.stage} / ${p.stages}段階・ギフト飾り${p.gifts.length}個${treeStorageError ? ' ／ ' + treeStorageError : ''}`; },
    status: () => `${connectionStatus} / 演出 ${host.active.size}・待機 ${host.queue.length}・常設 ${ambient.active.size}${ambientPaused ? ' / 常設の動きを停止中' : ''}${config.REDUCED_MOTION === true ? ' / テンプレートの動き抑制が有効' : ''}${config.ENABLE_STAGE_EFFECTS === false ? ' / イベント演出OFF' : ''}${document.hidden ? ' / ページ非表示' : ''}`
  };
})();
