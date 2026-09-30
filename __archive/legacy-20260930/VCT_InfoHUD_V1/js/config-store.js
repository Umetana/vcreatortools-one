(function (global) {
  const CONFIG_KEY = "vct_info_hud_config";
  const LOAD_SOURCE_KEY = "vct_info_hud_load_source";
  const VALID_SOURCES = new Set(["auto", "localStorage", "configJs", "builtin"]);

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function mergeConfig(...sources) {
    const result = {};

    sources.forEach((source) => {
      if (!isPlainObject(source)) return;

      Object.keys(source).forEach((key) => {
        const value = source[key];
        if (Array.isArray(value)) {
          result[key] = value.slice();
        } else if (isPlainObject(value) && isPlainObject(result[key])) {
          result[key] = mergeConfig(result[key], value);
        } else if (isPlainObject(value)) {
          result[key] = mergeConfig(value);
        } else if (value !== undefined) {
          result[key] = value;
        }
      });
    });

    return result;
  }

  function loadLocalStorageConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch (err) {
      console.warn("[VCT_InfoHUD] localStorage config parse failed.", err);
      return null;
    }
  }

  function loadConfigJs() {
    return isPlainObject(global.VCT_INFO_HUD_CONFIG) ? global.VCT_INFO_HUD_CONFIG : null;
  }

  function getLoadPreference() {
    const value = localStorage.getItem(LOAD_SOURCE_KEY) || "auto";
    return VALID_SOURCES.has(value) ? value : "auto";
  }

  function setLoadPreference(value) {
    const next = VALID_SOURCES.has(value) ? value : "auto";
    localStorage.setItem(LOAD_SOURCE_KEY, next);
    return next;
  }

  function resolveConfig() {
    const pref = getLoadPreference();
    const builtin = clone(global.VCT_INFO_HUD_BUILTIN_CONFIG || {});
    const file = loadConfigJs();
    const local = loadLocalStorageConfig();

    if (pref === "localStorage") return mergeConfig(builtin, file, local);
    if (pref === "configJs") return mergeConfig(builtin, local, file);
    if (pref === "builtin") return builtin;

    // auto is intentionally the same priority as localStorage:
    // saved settings > config.js > builtin defaults.
    return mergeConfig(builtin, file, local);
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config, null, 2));
  }

  function clearSavedConfig() {
    localStorage.removeItem(CONFIG_KEY);
  }

  global.VCTInfoHUDStore = {
    CONFIG_KEY,
    LOAD_SOURCE_KEY,
    getLoadPreference,
    setLoadPreference,
    resolveConfig,
    saveConfig,
    clearSavedConfig,
    mergeConfig,
    clone
  };
})(window);
