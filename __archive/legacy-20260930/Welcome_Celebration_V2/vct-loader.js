/**
 * CommentFX Base V2.6 - vct-loader.js
 * 配布同梱版を優先し、必要に応じて外部 _vct_core の VCT SDK を読み込む。
 */
(function (global) {
  const DEFAULT_PATHS = [
    "./_lib/vct_one_core.js",
    "../_vct_core/js/vct_one_core.js"
  ];

  const APP_SCRIPTS = [
    "./parser.js",
    "./engine.js",
    "./fx.js",
    "./script.js"
  ];

  function debugWarn(...args) {
    if (global.CONFIG?.DEBUG) console.warn("[CommentFX]", ...args);
  }

  function hasVctParser() {
    return !!(global.VCT && typeof global.VCT.parse === "function");
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

  async function loadFirstAvailable(paths) {
    if (hasVctParser()) return "preloaded";

    for (const src of paths) {
      try {
        await loadScript(src);
        if (hasVctParser()) return src;
        debugWarn(`VCT parser not found after loading ${src}`);
      } catch (err) {
        debugWarn(err.message || err);
      }
    }

    return null;
  }

  async function loadAppScripts() {
    for (const src of APP_SCRIPTS) {
      await loadScript(src);
    }
  }

  async function boot() {
    const paths = Array.isArray(global.VCT_CORE_PATHS) && global.VCT_CORE_PATHS.length > 0
      ? global.VCT_CORE_PATHS
      : DEFAULT_PATHS;

    const loadedPath = await loadFirstAvailable(paths);
    if (!loadedPath) {
      debugWarn("VCT SDK was not loaded. Legacy parser fallback will be used.");
    }

    await loadAppScripts();
  }

  boot().catch((err) => {
    debugWarn("CommentFX boot failed.", err);
    document.body.removeAttribute("hidden");
  });
})(window);
