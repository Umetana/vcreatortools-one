// テンプレートの接続部。演出RuntimeはOneSDKや個別の設定キーを参照しない。
(function () {
  'use strict';
  const api = window.VCTStage;
  const stage = document.getElementById('stage');
  const layout = new api.StageLayout(stage);
  const host = new api.EffectHost({ container: stage.querySelector('[data-layer="effects"]'), backdrop: stage.querySelector('[data-layer="backdrop"]'), size: layout.size });
  const widget = new api.CommentWidget(layout.region('comments'));
  const initial = { ...window.CONFIG };
  let config = { ...initial }, disposed = false, lastRunId = null;
  const controlsAllowed = new URLSearchParams(location.search).get('ui') !== '0';
  let connectionStatus = 'コメント購読を準備中';
  function apply(next) {
    config = { ...window.VCT_CONFIG_RUNTIME.effective, ...initial, ...next };
    if (!api.registry.get(config.STAGE_EFFECT_ID)) config.STAGE_EFFECT_ID = 'sample_effect';
    layout.configure(config.STAGE_FIT);
    // 全面表示でも指定領域の設定値は上書きしない。方式を戻せば同じ配置へ戻る。
    const fullscreen = config.DISPLAY_MODE === 'underbar' || (config.DISPLAY_MODE === 'popup' && config.POPUP_PLACEMENT !== 'anchor');
    layout.region('comments', fullscreen
      ? { x: 0, y: 0, width: layout.size.width, height: layout.size.height, scale: 1 }
      : { x: config.COMMENT_X, y: config.COMMENT_Y, width: config.COMMENT_WIDTH, height: config.COMMENT_HEIGHT, scale: config.COMMENT_SCALE });
    widget.configure(config);
    const background = stage.querySelector('[data-layer="background"]');
    background.hidden = config.SHOW_STAGE_BACKGROUND === false;
    background.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(config.BG_COLOR) ? config.BG_COLOR : '#101923';
    const path = String(config.BACKGROUND_IMAGE || '');
    // 入力はローカルの相対パスのみ。外部素材サービスを追加しない。
    background.style.backgroundImage = path && !/^[/\\]|[:%?#]/.test(path) && !path.split(/[\\/]/).includes('..') ? `url(${JSON.stringify(path)})` : 'none';
    const reduced = config.REDUCED_MOTION === true;
    stage.classList.toggle('reduced-motion', reduced);
    host.configure({ policy: config.STAGE_EFFECT_POLICY, maxActive: config.STAGE_EFFECT_MAX_ACTIVE, queueLimit: config.STAGE_EFFECT_QUEUE_LIMIT,
      enabled: config.ENABLE_STAGE_EFFECTS !== false && !reduced && !document.hidden });
  }
  function disabledReason() {
    if (disposed) return 'disabled';
    if (config.ENABLE_STAGE_EFFECTS === false) return 'effects-off';
    if (config.REDUCED_MOTION === true) return 'reduced-motion';
    if (document.hidden) return 'page-hidden';
    return '';
  }
  function trigger(parsed = {}) {
    const reason = disabledReason();
    if (reason) return { status: 'rejected', reason };
    const intensity = api.intensity(parsed, config.STAGE_EFFECT_INTENSITY_MODE);
    const duration = api.number(config.STAGE_EFFECT_DURATION_MS, 1200, 10000, 3000);
    const result = host.trigger(config.STAGE_EFFECT_ID, {
      count: api.number(config.STAGE_EFFECT_COUNT, 1, 60, 18), duration, intensity,
      bgOpacity: api.number(config.STAGE_EFFECT_BG_OPACITY, 0, .7, 0),
      // 各Pluginの設定取り出しはPlugin側で行う。
      settings: config
    });
    if (result.id) lastRunId = result.id;
    return result;
  }
  const adapter = new api.OneCommeAdapter({
    onComment: (parsed, meta) => { widget.add(parsed); if (meta.canTrigger && api.isEffectEvent(parsed)) trigger(parsed); },
    onClear: () => { widget.clear(); host.stopAll(); },
    onStatus: text => { connectionStatus = text; }
  });
  const preview = event => { if (!disposed && event.detail && typeof event.detail === 'object') apply(event.detail); };
  const reset = () => { if (!disposed) apply(initial); };
  const visibility = () => { if (!disposed) apply(config); };
  function destroy() {
    if (disposed) return;
    disposed = true; adapter.destroy(); host.destroy(); widget.destroy(); layout.destroy();
    window.removeEventListener('vct-settings-preview', preview); window.removeEventListener('vct-settings-reset-preview', reset);
    document.removeEventListener('visibilitychange', visibility);
  }
  window.addEventListener('vct-settings-preview', preview);
  window.addEventListener('vct-settings-reset-preview', reset);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', destroy, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  apply(config); adapter.start();
  api.effectsReady.then(() => { if (!disposed) { Object.assign(initial, window.CONFIG); apply(initial); } });
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
    effect: () => trigger(), stopLast: () => host.stop(lastRunId), stopAll: () => host.stopAll(),
    status: () => `${connectionStatus} / 演出 ${host.active.size}・待機 ${host.queue.length}${config.REDUCED_MOTION === true ? ' / テンプレートの動き抑制が有効' : ''}${config.ENABLE_STAGE_EFFECTS === false ? ' / 演出OFF' : ''}${document.hidden ? ' / ページ非表示' : ''}`
  };
})();
