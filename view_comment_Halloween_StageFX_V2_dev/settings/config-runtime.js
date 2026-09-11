(function () {
  'use strict';

  const pathParts = String(window.location?.pathname || '').split('/').filter(Boolean);
  const templateId = decodeURIComponent(pathParts[pathParts.length - 2] || 'view-comment-halloween-v2')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .toLowerCase();
  const STORAGE_KEY = `vct.template-settings.${templateId}.v1`;
  const CHANNEL_NAME = `vct.template-settings.${templateId}.channel`;
  const instanceId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const defaults = { ...(window.CONFIG_DEFAULT || {}) };
  const fileConfig = { ...(window.CONFIG || {}) };
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
  const effective = { ...baseline, ...localOverrides };

  const makeDiff = (nextConfig) => {
    const diff = {};
    for (const [key, value] of Object.entries(nextConfig || {})) {
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
        if (data.senderId === instanceId) return;
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

  openChannel();

  window.CONFIG = effective;
  window.VCT_CONFIG_RUNTIME = Object.freeze({
    templateId,
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
