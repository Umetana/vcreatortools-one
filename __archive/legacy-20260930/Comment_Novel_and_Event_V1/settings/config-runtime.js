(function () {
  "use strict";

  const isObject = value => value && typeof value === "object" && !Array.isArray(value);
  const merge = (base, override) => {
    const result = { ...(isObject(base) ? base : {}) };
    for (const [key, value] of Object.entries(isObject(override) ? override : {})) {
      result[key] = isObject(value) ? merge(result[key], value) : value;
    }
    return result;
  };

  const pathParts = String(window.location?.pathname || "").split("/").filter(Boolean);
  const templateId = decodeURIComponent(pathParts[pathParts.length - 2] || "comment-novel-and-event-v1")
    .replace(/[^a-z0-9._-]+/gi, "_")
    .toLowerCase();
  const storageKey = `vct.template-settings.${templateId}.v1`;
  const defaults = window.CNE_CONFIG_DEFAULT || {};
  const fileConfig = window.CNE_CONFIG || {};
  const baseline = merge(defaults, fileConfig);
  let localOverrides = {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    if (isObject(parsed)) localOverrides = parsed;
  } catch (error) {
    console.warn("[CNE] localStorage read failed.", error);
  }

  window.CNE_CONFIG = merge(baseline, localOverrides);
  window.CNE_CONFIG_RUNTIME = Object.freeze({
    storageKey,
    defaults,
    fileConfig,
    baseline,
    localOverrides,
    effective: window.CNE_CONFIG,
    merge,
    writeLocal(value) {
      window.localStorage.setItem(storageKey, JSON.stringify(isObject(value) ? value : {}));
    },
    clearLocal() {
      window.localStorage.removeItem(storageKey);
    }
  });
})();
