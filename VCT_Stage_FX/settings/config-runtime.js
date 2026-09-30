(function () {
  'use strict';

  const pathParts = String(window.location?.pathname || '').split('/').filter(Boolean);
  let templateId = pathParts[pathParts.length - 2] || 'VCT_Stage_FX';
  try { templateId = decodeURIComponent(templateId); } catch (_) {}
  // 日本語や記号を置換で潰さず、区切りも含めて衝突しない組として保存する。
  // file運用では常に標準。HTTP(S)のみ明示プロファイルを受け付ける。
  const requestedProfile = /^https?:$/.test(window.location.protocol)
    ? new URLSearchParams(window.location.search).get('profile') : null;
  const profileId = requestedProfile && /^[a-zA-Z0-9_-]{1,64}$/.test(requestedProfile)
    ? requestedProfile : 'default';
  const profileWarning = requestedProfile && requestedProfile !== profileId
    ? 'プロファイルIDが不正なため標準設定を使用しています。' : '';
  const identity = JSON.stringify([templateId, profileId]);
  const STORAGE_KEY = `vct.stage-fx.settings.${identity}`;
  const CHANNEL_NAME = `vct.stage-fx.channel.${identity}`;
  const instanceId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const defaults = { ...(window.CONFIG_DEFAULT || {}) };
  const fileConfig = { ...(window.CONFIG || {}) };
  const vctLinkEnabled = fileConfig.VCT_LINK_ENABLED === true;
  delete defaults.VCT_LINK_ENABLED; delete fileConfig.VCT_LINK_ENABLED;
  const baseline = { ...defaults, ...fileConfig };
  let channel = null;

  const readLocal = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.warn('[VCT Settings] localStorage read failed.', error);
      return {};
    }
  };

  const localOverrides = readLocal();
  delete localOverrides.VCT_LINK_ENABLED;
  const effective = { ...baseline, ...localOverrides };

  const makeDiff = (nextConfig) => {
    const diff = {};
    for (const [key, value] of Object.entries(nextConfig || {})) {
      if (key === 'VCT_LINK_ENABLED') continue;
      if (!Object.prototype.hasOwnProperty.call(baseline, key) || baseline[key] !== value) {
        diff[key] = value;
      }
    }
    return diff;
  };

  const writeLocal = (nextConfig) => {
    const diff = makeDiff(nextConfig);
    try {
      if (Object.keys(diff).length) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diff));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return diff;
    } catch (error) {
      console.error('[VCT Settings] localStorage write failed.', error);
      throw error;
    }
  };

  const clearLocal = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[VCT Settings] localStorage clear failed.', error);
      throw error;
    }
  };

  const openChannel = () => {
    if (channel || typeof window.BroadcastChannel !== 'function') return channel;
    try {
      channel = new window.BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        const data = event.data || {};
        if (data.senderId === instanceId || data.storageKey !== STORAGE_KEY) return;
        if (data.type === 'settings-saved' || data.type === 'settings-cleared') {
          window.location.reload();
        }
      };
    } catch (error) {
      console.warn('[VCT Settings] BroadcastChannel unavailable.', error);
      channel = null;
    }
    return channel;
  };

  const broadcastReload = (type = 'settings-saved') => {
    const activeChannel = openChannel();
    if (!activeChannel) return false;
    try {
      activeChannel.postMessage({
        type,
        templateId,
        storageKey: STORAGE_KEY,
        senderId: instanceId,
        sentAt: Date.now()
      });
      return true;
    } catch (error) {
      console.warn('[VCT Settings] BroadcastChannel post failed.', error);
      return false;
    }
  };

  function validateShared(payload) {
    if (!window.VCTStage.registry.get(payload.STAGE_EFFECT_ID)) throw new Error('選択された演出がこのテンプレートでは無効です。演出を有効にしてから読み込んでください。');
  }
  function commitLocal(payload) {
    const next={...effective,...payload};
    const diff=writeLocal(next);
    for(const key of Object.keys(localOverrides)) delete localOverrides[key];
    Object.assign(localOverrides,diff); Object.assign(effective,next);
    window.dispatchEvent(new CustomEvent('vct-settings-committed',{detail:{...effective}}));
    return next;
  }
  openChannel();

  window.CONFIG = effective;
  window.VCT_CONFIG_RUNTIME = Object.freeze({
    templateId,
    vctLinkEnabled, commitLocal, validateShared,
    profileId,
    profileWarning,
    effectsStorageKey: `vct.stage-fx.effects.${JSON.stringify(templateId)}`,
    storageKey: STORAGE_KEY,
    channelName: CHANNEL_NAME,
    instanceId,
    defaults,
    fileConfig,
    baseline,
    localOverrides,
    effective,
    source: Object.keys(localOverrides).length ? 'localStorage' : (Object.keys(fileConfig).length ? 'config.js' : 'config_default.js'),
    makeDiff,
    writeLocal,
    clearLocal,
    broadcastReload
  });
})();
