(function (global) {
  const FIELD_MAP = {
    hudHeight: "HUD_HEIGHT",
    viewersWidth: "VIEWERS_WIDTH",
    likesWidth: "LIKES_WIDTH",
    infoWidth: "INFO_WIDTH",
    viewersValue: "VIEWERS_VALUE",
    likesValue: "LIKES_VALUE",
    maxCommentChars: "MAX_COMMENT_CHARS",
    showImageEmoji: "SHOW_IMAGE_EMOJI",
    showStickers: "SHOW_STICKERS",
    giftCardEnabled: "GIFT_CARD_ENABLED",
    giftCardShowLabel: "GIFT_CARD_SHOW_LABEL",
    giftCardShowUser: "GIFT_CARD_SHOW_USER",
    giftCardShowMessage: "GIFT_CARD_SHOW_MESSAGE",
    giftCardShowImage: "GIFT_CARD_SHOW_IMAGE",
    giftCardShowMessageWithImage: "GIFT_CARD_SHOW_MESSAGE_WITH_IMAGE",
    showEventMessages: "SHOW_EVENT_MESSAGES",
    showEventMessageSuperchat: "SHOW_EVENT_MESSAGE_SUPERCHAT",
    showEventMessageSupersticker: "SHOW_EVENT_MESSAGE_SUPERSTICKER",
    showEventMessageMembershipComment: "SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT",
    showEventMessageMemberJoin: "SHOW_EVENT_MESSAGE_MEMBER_JOIN",
    showEventMessageMembershipGift: "SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT",
    showEventMessageGiftReceived: "SHOW_EVENT_MESSAGE_GIFT_RECEIVED",
    logLineHeight: "LOG_LINE_HEIGHT",
    logRowGap: "LOG_ROW_GAP",
    emojiSizeRatio: "EMOJI_SIZE_RATIO",
    stickerSizeRatio: "STICKER_SIZE_RATIO",
    panelBorderWidth: "PANEL_BORDER_WIDTH",
    panelRadius: "PANEL_RADIUS",
    hudBgGradientAngle: "HUD_BG_GRADIENT_ANGLE",
    commentFontSize: "COMMENT_FONT_SIZE",
    infoFontSize: "INFO_FONT_SIZE",
    metricFontSize: "METRIC_FONT_SIZE"
  };

  const FONT_FAMILIES = {
    gothic: '"M PLUS 1p", "Noto Sans JP", "Yu Gothic", sans-serif',
    rounded: '"M PLUS Rounded 1c", "Yu Gothic", sans-serif',
    mincho: '"Yu Mincho", "Hiragino Mincho ProN", serif',
    mono: '"BIZ UDGothic", "Consolas", monospace',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizeHex(value, fallback) {
    const raw = String(value || "").trim();
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : fallback;
  }

  function readNumber(id, fallback) {
    const el = byId(id);
    const value = Number(el?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function getSelectedLoadSource() {
    const checked = document.querySelector('input[name="loadSource"]:checked');
    return checked ? checked.value : "auto";
  }

  function setSelectedLoadSource(value) {
    const radio = document.querySelector(`input[name="loadSource"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  function getSelectedRadio(name, fallback) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : fallback;
  }

  function setSelectedRadio(name, value, fallback) {
    const radio = document.querySelector(`input[name="${name}"][value="${value || fallback}"]`);
    if (radio) radio.checked = true;
  }

  function messagesToText(messages) {
    return Array.isArray(messages) ? messages.join("\n") : "";
  }

  function textToMessages(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function fillForm(config) {
    byId("hudHeight").value = config.HUD_HEIGHT;
    byId("viewersWidth").value = config.VIEWERS_WIDTH;
    byId("likesWidth").value = config.LIKES_WIDTH;
    byId("infoWidth").value = config.INFO_WIDTH;
    byId("viewersValue").value = config.VIEWERS_VALUE;
    byId("likesValue").value = config.LIKES_VALUE;
    byId("maxCommentChars").value = config.MAX_COMMENT_CHARS;
    byId("showImageEmoji").checked = config.SHOW_IMAGE_EMOJI !== false;
    byId("showStickers").checked = config.SHOW_STICKERS !== false;
    byId("giftCardEnabled").checked = config.GIFT_CARD_ENABLED === true;
    byId("giftCardShowLabel").checked = config.GIFT_CARD_SHOW_LABEL !== false;
    byId("giftCardShowUser").checked = config.GIFT_CARD_SHOW_USER !== false;
    byId("giftCardShowMessage").checked = config.GIFT_CARD_SHOW_MESSAGE !== false;
    byId("giftCardShowImage").checked = config.GIFT_CARD_SHOW_IMAGE !== false;
    byId("giftCardShowMessageWithImage").checked = config.GIFT_CARD_SHOW_MESSAGE_WITH_IMAGE === true;
    byId("showEventMessages").checked = config.SHOW_EVENT_MESSAGES !== false;
    byId("showEventMessageSuperchat").checked = config.SHOW_EVENT_MESSAGE_SUPERCHAT !== false;
    byId("showEventMessageSupersticker").checked = config.SHOW_EVENT_MESSAGE_SUPERSTICKER !== false;
    byId("showEventMessageMembershipComment").checked = config.SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT !== false;
    byId("showEventMessageMemberJoin").checked = config.SHOW_EVENT_MESSAGE_MEMBER_JOIN !== false;
    byId("showEventMessageMembershipGift").checked = config.SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT !== false;
    byId("showEventMessageGiftReceived").checked = config.SHOW_EVENT_MESSAGE_GIFT_RECEIVED === true;
    byId("logLineHeight").value = config.LOG_LINE_HEIGHT;
    byId("logRowGap").value = config.LOG_ROW_GAP;
    byId("emojiSizeRatio").value = config.EMOJI_SIZE_RATIO;
    byId("stickerSizeRatio").value = config.STICKER_SIZE_RATIO;
    byId("infoIntervalSec").value = Math.round((Number(config.INFO_INTERVAL_MS) || 8000) / 1000);
    byId("giftCardDurationSec").value = Math.round((Number(config.GIFT_CARD_DURATION_MS) || 7000) / 1000);
    byId("hudBgMode").value = config.HUD_BG_MODE || "solid";
    byId("hudBgColor").value = config.HUD_BG_COLOR;
    byId("hudBgHex").value = config.HUD_BG_COLOR;
    byId("hudBgColor2").value = config.HUD_BG_COLOR_2 || config.HUD_BG_COLOR;
    byId("hudBgHex2").value = config.HUD_BG_COLOR_2 || config.HUD_BG_COLOR;
    byId("hudBgGradientAngle").value = config.HUD_BG_GRADIENT_ANGLE ?? 90;
    byId("hudBgAlpha").value = config.HUD_BG_ALPHA;
    byId("hudBgAlphaNum").value = config.HUD_BG_ALPHA;
    byId("panelBgColor").value = config.PANEL_BG_COLOR;
    byId("panelBgHex").value = config.PANEL_BG_COLOR;
    byId("panelBgAlpha").value = config.PANEL_BG_ALPHA;
    byId("panelBgAlphaNum").value = config.PANEL_BG_ALPHA;
    byId("panelBorderColor").value = config.PANEL_BORDER_COLOR;
    byId("panelBorderHex").value = config.PANEL_BORDER_COLOR;
    byId("panelBorderAlpha").value = config.PANEL_BORDER_ALPHA;
    byId("panelBorderAlphaNum").value = config.PANEL_BORDER_ALPHA;
    byId("metricLabelColor").value = config.METRIC_LABEL_COLOR;
    byId("metricLabelHex").value = config.METRIC_LABEL_COLOR;
    byId("metricValueColor").value = config.METRIC_VALUE_COLOR;
    byId("metricValueHex").value = config.METRIC_VALUE_COLOR;
    byId("logTextColor").value = config.LOG_TEXT_COLOR;
    byId("logTextHex").value = config.LOG_TEXT_COLOR;
    byId("infoTextColor").value = config.INFO_TEXT_COLOR;
    byId("infoTextHex").value = config.INFO_TEXT_COLOR;
    byId("panelBorderWidth").value = config.PANEL_BORDER_WIDTH;
    byId("panelRadius").value = config.PANEL_RADIUS;
    byId("commentFontSize").value = config.COMMENT_FONT_SIZE;
    byId("infoFontSize").value = config.INFO_FONT_SIZE;
    byId("metricFontSize").value = config.METRIC_FONT_SIZE;
    byId("infoMessages").value = messagesToText(config.INFO_MESSAGES);
    setSelectedRadio("metricSource", config.METRIC_SOURCE, "auto");
    setSelectedRadio("metricLayout", config.METRIC_LAYOUT, "default");
    setSelectedRadio("supportAmountDisplay", config.SUPPORT_AMOUNT_DISPLAY, "badge");
    setSelectedRadio("commentTranslationMode", config.COMMENT_TRANSLATION_MODE, "original");
    setSelectedRadio("fontPreset", config.FONT_PRESET, "gothic");
  }

  function readForm(baseConfig) {
    const next = global.VCTInfoHUDStore.clone(baseConfig);

    Object.entries(FIELD_MAP).forEach(([id, key]) => {
      const el = byId(id);
      if (!el) return;

      if (key.endsWith("_COLOR")) {
        next[key] = normalizeHex(el.value, next[key]);
      } else if (el.type === "checkbox") {
        next[key] = el.checked;
      } else if (el.type === "number" || el.type === "range") {
        next[key] = Number(el.value);
      } else {
        next[key] = el.value;
      }
    });

    next.HUD_BG_COLOR = normalizeHex(byId("hudBgHex").value, next.HUD_BG_COLOR);
    next.HUD_BG_COLOR_2 = normalizeHex(byId("hudBgHex2").value, next.HUD_BG_COLOR_2 || next.HUD_BG_COLOR);
    next.HUD_BG_ALPHA = readNumber("hudBgAlphaNum", next.HUD_BG_ALPHA);
    next.HUD_BG_MODE = byId("hudBgMode").value === "gradient" ? "gradient" : "solid";
    next.HUD_BG_GRADIENT_ANGLE = readNumber("hudBgGradientAngle", next.HUD_BG_GRADIENT_ANGLE ?? 90);
    next.PANEL_BG_COLOR = normalizeHex(byId("panelBgHex").value, next.PANEL_BG_COLOR);
    next.PANEL_BG_ALPHA = readNumber("panelBgAlphaNum", next.PANEL_BG_ALPHA);
    next.PANEL_BORDER_COLOR = normalizeHex(byId("panelBorderHex").value, next.PANEL_BORDER_COLOR);
    next.PANEL_BORDER_ALPHA = readNumber("panelBorderAlphaNum", next.PANEL_BORDER_ALPHA);
    next.METRIC_LABEL_COLOR = normalizeHex(byId("metricLabelHex").value, next.METRIC_LABEL_COLOR);
    next.METRIC_VALUE_COLOR = normalizeHex(byId("metricValueHex").value, next.METRIC_VALUE_COLOR);
    next.LOG_TEXT_COLOR = normalizeHex(byId("logTextHex").value, next.LOG_TEXT_COLOR);
    next.INFO_TEXT_COLOR = normalizeHex(byId("infoTextHex").value, next.INFO_TEXT_COLOR);

    next.INFO_MESSAGES = textToMessages(byId("infoMessages").value);
    next.INFO_INTERVAL_MS = Math.max(3, readNumber("infoIntervalSec", 8)) * 1000;
    next.GIFT_CARD_DURATION_MS = Math.max(3, readNumber("giftCardDurationSec", 7)) * 1000;
    next.METRIC_SOURCE = getSelectedRadio("metricSource", "auto");
    next.METRIC_LAYOUT = getSelectedRadio("metricLayout", "default");
    next.SUPPORT_AMOUNT_DISPLAY = getSelectedRadio("supportAmountDisplay", "badge");
    next.COMMENT_TRANSLATION_MODE = getSelectedRadio("commentTranslationMode", "original") === "translated"
      ? "translated"
      : "original";
    next.FONT_PRESET = getSelectedRadio("fontPreset", "gothic");
    next.FONT_FAMILY = FONT_FAMILIES[next.FONT_PRESET] || FONT_FAMILIES.gothic;
    return next;
  }

  function createSettingsUI(options) {
    const store = global.VCTInfoHUDStore;
    let config = options.config;

    function setConfig(next) {
      config = next;
      fillForm(config);
      options.onConfigChange(config);
    }

    function syncVisualPairs(changedId) {
      const pairs = [
        ["hudBgColor", "hudBgHex"],
        ["hudBgColor2", "hudBgHex2"],
        ["panelBgColor", "panelBgHex"],
        ["panelBorderColor", "panelBorderHex"],
        ["metricLabelColor", "metricLabelHex"],
        ["metricValueColor", "metricValueHex"],
        ["logTextColor", "logTextHex"],
        ["infoTextColor", "infoTextHex"],
        ["hudBgAlpha", "hudBgAlphaNum"],
        ["panelBgAlpha", "panelBgAlphaNum"],
        ["panelBorderAlpha", "panelBorderAlphaNum"]
      ];

      pairs.forEach(([a, b]) => {
        if (changedId !== a && changedId !== b) return;
        const source = byId(changedId);
        const target = byId(changedId === a ? b : a);
        if (!source || !target) return;

        if (source.type === "text" && target.type === "color") {
          target.value = normalizeHex(source.value, target.value);
          return;
        }

        if (source.type === "color" && target.type === "text") {
          target.value = source.value;
          return;
        }

        target.value = source.value;
      });
    }

    function setupTabs() {
      document.querySelectorAll(".settings-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          const name = tab.dataset.tab;
          document.querySelectorAll(".settings-tab").forEach((item) => {
            item.classList.toggle("is-active", item === tab);
          });
          document.querySelectorAll(".settings-page").forEach((page) => {
            page.classList.toggle("is-active", page.dataset.page === name);
          });
        });
      });
    }

    function init() {
      setupTabs();
      setSelectedLoadSource(store.getLoadPreference());
      fillForm(config);

      document.querySelectorAll(".settings-panel input, .settings-panel textarea, .settings-panel select").forEach((el) => {
        if (el.name === "loadSource") return;
        el.addEventListener("input", () => {
          syncVisualPairs(el.id);
          config = readForm(config);
          options.onConfigChange(config);
        });
      });

      byId("saveConfig").addEventListener("click", () => {
        config = readForm(config);
        store.saveConfig(config);
        options.onConfigChange(config);
        options.notify("設定を保存しました");
      });

      byId("saveLoadSource").addEventListener("click", () => {
        const value = store.setLoadPreference(getSelectedLoadSource());
        setSelectedLoadSource(value);
        options.notify("読込元設定を保存しました");
      });

      byId("resetConfig").addEventListener("click", () => {
        setConfig(store.clone(global.VCT_INFO_HUD_BUILTIN_CONFIG));
      });

      byId("clearSavedConfig").addEventListener("click", () => {
        store.clearSavedConfig();
        options.notify("保存済み設定を削除しました");
      });
    }

    return { init, setConfig };
  }

  global.VCTInfoHUDSettingsUI = { create: createSettingsUI };
})(window);
