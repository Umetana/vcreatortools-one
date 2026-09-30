(function (global) {
  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function px(value, fallback) {
    const num = Number(value);
    return `${Number.isFinite(num) ? num : fallback}px`;
  }

  function hexToRgb(hex) {
    const raw = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return "255, 255, 255";
    const num = parseInt(raw, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  function rgba(hex, alphaPercent, fallback) {
    const alpha = Math.max(0, Math.min(100, Number(alphaPercent))) / 100;
    if (!String(hex || "").startsWith("#")) return fallback;
    return `rgba(${hexToRgb(hex)}, ${Number.isFinite(alpha) ? alpha : 1})`;
  }

  function hudBackground(config) {
    const fallback = config.HUD_BG || "rgba(8, 12, 18, 0.78)";
    const color1 = rgba(config.HUD_BG_COLOR, config.HUD_BG_ALPHA, fallback);
    if (config.HUD_BG_MODE !== "gradient") return color1;

    const angle = Number(config.HUD_BG_GRADIENT_ANGLE);
    const safeAngle = Number.isFinite(angle) ? angle : 90;
    const color2 = rgba(config.HUD_BG_COLOR_2, config.HUD_BG_ALPHA, color1);
    return `linear-gradient(${safeAngle}deg, ${color1}, ${color2})`;
  }

  function formatMetric(value) {
    if (value === undefined || value === null || value === "") return "---";
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return new Intl.NumberFormat("ja-JP").format(num);
  }

  function applyConfig(config, metaValues) {
    const root = document.documentElement;
    const hud = byId("hud");

    root.style.setProperty("--hud-height", px(config.HUD_HEIGHT, 260));
    root.style.setProperty("--viewers-width", px(config.VIEWERS_WIDTH, 180));
    root.style.setProperty("--likes-width", px(config.LIKES_WIDTH, 180));
    root.style.setProperty("--info-width", px(config.INFO_WIDTH, 380));
    root.style.setProperty("--hud-gap", px(config.GAP_PX, 10));
    root.style.setProperty("--font-family", config.FONT_FAMILY || "sans-serif");
    root.style.setProperty("--comment-font-size", px(config.COMMENT_FONT_SIZE ?? config.FONT_SIZE, 24));
    root.style.setProperty("--info-font-size", px(config.INFO_FONT_SIZE, 28));
    root.style.setProperty("--metric-font-size", px(config.METRIC_FONT_SIZE, 52));
    root.style.setProperty("--log-line-height", px(config.LOG_LINE_HEIGHT, 42));
    root.style.setProperty("--log-row-gap", px(config.LOG_ROW_GAP, 5));
    root.style.setProperty("--emoji-size-ratio", Number(config.EMOJI_SIZE_RATIO) || 1.05);
    root.style.setProperty("--sticker-size-ratio", Number(config.STICKER_SIZE_RATIO) || 1.35);
    root.style.setProperty("--hud-bg", hudBackground(config));
    root.style.setProperty("--panel-bg", rgba(config.PANEL_BG_COLOR, config.PANEL_BG_ALPHA, config.PANEL_BG || "rgba(255, 255, 255, 0.08)"));
    root.style.setProperty("--panel-border-color", rgba(config.PANEL_BORDER_COLOR, config.PANEL_BORDER_ALPHA, config.PANEL_BORDER || "rgba(255, 255, 255, 0.22)"));
    root.style.setProperty("--panel-border-width", px(config.PANEL_BORDER_WIDTH, 1));
    root.style.setProperty("--panel-radius", px(config.PANEL_RADIUS, 8));
    root.style.setProperty("--text-main", config.TEXT_MAIN || "#ffffff");
    root.style.setProperty("--text-muted", config.TEXT_MUTED || "rgba(255, 255, 255, 0.68)");
    root.style.setProperty("--accent-color", config.ACCENT_COLOR || "#5eead4");
    root.style.setProperty("--metric-label-color", config.METRIC_LABEL_COLOR || config.TEXT_MUTED || "rgba(255, 255, 255, 0.68)");
    root.style.setProperty("--metric-value-color", config.METRIC_VALUE_COLOR || config.ACCENT_COLOR || "#5eead4");
    root.style.setProperty("--log-text-color", config.LOG_TEXT_COLOR || config.TEXT_MAIN || "#ffffff");
    root.style.setProperty("--info-text-color", config.INFO_TEXT_COLOR || "#f8fafc");
    root.style.setProperty("--normal-row-bg", config.NORMAL_ROW_BG || "rgba(255, 255, 255, 0.06)");
    if (hud) {
      hud.classList.toggle("hud--compact-meta", config.METRIC_LAYOUT === "compactMeta");
      hud.classList.toggle("hud--grid-meta", config.METRIC_LAYOUT === "gridMeta");
    }

    const source = config.METRIC_SOURCE || "auto";
    const hasViewerMeta = metaValues.viewer !== undefined && metaValues.viewer !== null;
    const hasLikeMeta = metaValues.like !== undefined && metaValues.like !== null;

    const viewerValue = source === "manual" || (source === "auto" && !hasViewerMeta)
      ? config.VIEWERS_VALUE
      : metaValues.viewer;
    const likeValue = source === "manual" || (source === "auto" && !hasLikeMeta)
      ? config.LIKES_VALUE
      : metaValues.like;

    setText("viewersDisplay", formatMetric(viewerValue));
    setText("likesDisplay", formatMetric(likeValue));
  }

  function boot() {
    const store = global.VCTInfoHUDStore;
    let config = store.resolveConfig();

    const statusEl = byId("connectionStatus");
    const noticeEl = byId("noticeStatus");
    const infoEl = byId("infoMessage");
    const logEl = byId("logList");
    const metaValues = { viewer: null, like: null };
    let noticeTimer = null;

    function setConnectionStatus(text) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.dataset.state = text.includes("接続中") ? "connected" : "idle";
    }

    function notify(text) {
      if (!noticeEl) return;
      noticeEl.textContent = text;
      noticeEl.hidden = false;
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => {
        noticeEl.hidden = true;
        noticeEl.textContent = "";
      }, 2200);
    }

    function updateMeta(response) {
      const data = response?.data || response || {};
      const viewer = data.viewer ?? data.viewers;
      const like = data.upVote ?? data.likes ?? data.likeCount ?? data.goodCount;

      if (viewer !== undefined && viewer !== null) metaValues.viewer = viewer;
      if (like !== undefined && like !== null) metaValues.like = like;
      applyConfig(config, metaValues);
    }

    const rotator = global.VCTInfoHUDInfoRotator.create(infoEl);

    function update(nextConfig) {
      config = nextConfig;
      applyConfig(config, metaValues);
      rotator.start(config);
    }

    update(config);

    const comments = global.VCTInfoHUDComments.create({
      listEl: logEl,
      getConfig: () => config,
      setStatus: setConnectionStatus,
      onMeta: updateMeta,
      onGiftCard: (card) => rotator.showGiftCard(card, () => config)
    });

    const settings = global.VCTInfoHUDSettingsUI.create({
      config,
      onConfigChange: update,
      notify
    });
    settings.init();

    byId("addSampleComment").addEventListener("click", () => {
      comments.addComment({
        id: `sample-${Date.now()}`,
        name: "Sample User",
        comment: "これはテストコメントです。表示上限を超える長いコメントは末尾が省略されます。"
      });
    });

    comments.connectOneSDK();

    global.VCTInfoHUD = {
      getConfig: () => config,
      applyConfig: update,
      addComment: comments.addComment,
      clearLog: comments.clear
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
