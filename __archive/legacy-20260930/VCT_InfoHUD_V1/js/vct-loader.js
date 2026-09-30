(function (global) {
  const VCT_PATHS = [
    "./_lib/vct_one_core.js",
    "../_vct_core/js/vct_one_core.js"
  ];

  const APP_SCRIPTS = [
    "./js/defaults.js",
    "./js/config-store.js",
    "./js/info-rotator.js",
    "./js/comments.js",
    "./js/settings-ui.js",
    "./js/hud.js",
    "./js/debug.js"
  ];

  function hasVctParser() {
    return !!(global.VCT && typeof global.VCT.parse === "function");
  }

  function debugWarn(...args) {
    if (global.VCT_INFO_HUD_CONFIG?.DEBUG) console.warn("[VCT_InfoHUD]", ...args);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`script load failed: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadVctCore() {
    if (hasVctParser()) return "preloaded";

    for (const src of VCT_PATHS) {
      try {
        await loadScript(src);
        if (hasVctParser()) return src;
      } catch (err) {
        debugWarn(err.message || err);
      }
    }

    return null;
  }

  async function boot() {
    const loaded = await loadVctCore();
    if (!loaded) debugWarn("vct_one_core.js was not loaded. Fallback parser will be used.");

    for (const src of APP_SCRIPTS) {
      await loadScript(src);
    }
  }

  boot().catch((err) => {
    debugWarn("boot failed", err);
  });
})(window);
