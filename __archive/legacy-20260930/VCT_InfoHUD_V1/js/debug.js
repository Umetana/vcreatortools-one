(function (global) {
  // Loaded last by vct-loader.js, after config.js and the app runtime are available.
  if (!global.VCT_INFO_HUD_CONFIG?.DEBUG) return;

  global.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "t") return;
    global.VCTInfoHUD?.addComment({
      id: `debug-${Date.now()}`,
      name: "Debug",
      comment: "キーボードから追加したテストコメントです。"
    });
  });
})(window);
