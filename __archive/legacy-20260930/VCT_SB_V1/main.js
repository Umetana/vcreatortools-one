(() => {
  const STORAGE_KEY_FALLBACK = "vct_sb_v1.settings.v1";
  const DEFAULT_CONFIG = {
    configVersion: 2,
    storageKey: STORAGE_KEY_FALLBACK,
    title: "本日の支援者",
    startX: 0,
    startY: 0,
    endX: 1920,
    streamId: null,          // nullなら当日YYYYMMDD
    limit: 20,
    displayOrder: "oldest_first", // oldest_first or newest_first
    maxMessageLength: 50,
    showIcon: true,
    titleVisible: true,
    titleHeight: 40,
    amountVisible: true,
    messageVisible: true,
    viewportHeight: 140,
    cardWidth: 280,
    cardGap: 12,
    scrollSpeed: 110,
    cardColorMode: "soft",
    cardBackgroundOpacity: 0.18,
    emptyStateText: "まだ支援はありません",
    resetStreamOnLoad: false,
    resetAllOnLoad: false,
  };

  function getBaseConfig() {
    return Object.assign({}, DEFAULT_CONFIG, window.CONFIG || {});
  }

  function getStorageKey(config) {
    const candidate = String(config?.storageKey || "").trim();
    return candidate || STORAGE_KEY_FALLBACK;
  }

  function loadStoredConfig(storageKey) {
    if (!window.localStorage) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      console.warn("[SupportBanner] failed to read localStorage config:", err);
      return null;
    }
  }

  function persistConfig(storageKey, config) {
    if (!window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (err) {
      console.warn("[SupportBanner] failed to persist localStorage config:", err);
    }
  }

  function resolveConfig() {
    const baseConfig = getBaseConfig();
    const storageKey = getStorageKey(baseConfig);
    const storedConfig = loadStoredConfig(storageKey);
    const resolvedConfig = Object.assign({}, baseConfig, storedConfig || {});

    if (!storedConfig) {
      persistConfig(storageKey, resolvedConfig);
    }

    return resolvedConfig;
  }

  const CONFIG = resolveConfig();

  const els = {
    app: null,
    title: null,
    track: null,
  };

  const state = {
    supports: [],
  };

  const scrollState = {
    frameId: 0,
    lastTime: 0,
    offset: 0,
    setWidth: 0,
    initialized: false,
  };

  function initElements() {
    els.app = document.getElementById("app");
    els.title = document.getElementById("banner-title");
    els.track = document.getElementById("support-track");
  }

  function parseFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getResolvedLayoutConfig(config = CONFIG) {
    const viewportWidth = Math.max(window.innerWidth || 0, 320);
    const startX = Math.max(0, parseFiniteNumber(config.startX, 0));
    const startY = Math.max(0, parseFiniteNumber(config.startY, 0));
    const requestedEndX = parseFiniteNumber(config.endX, viewportWidth);
    const minimumWidth = Math.max(parseFiniteNumber(config.cardWidth, DEFAULT_CONFIG.cardWidth) + 32, 240);
    const endX = Math.max(startX + minimumWidth, requestedEndX);

    return {
      startX,
      startY,
      endX,
      width: endX - startX,
    };
  }

  function applyConfig() {
    const layout = getResolvedLayoutConfig();
    const cardBackgroundOpacity = Math.min(1, Math.max(0, parseFiniteNumber(CONFIG.cardBackgroundOpacity, DEFAULT_CONFIG.cardBackgroundOpacity)));
    els.title.textContent = CONFIG.title;
    els.title.style.display = CONFIG.titleVisible ? "" : "none";
    document.documentElement.style.setProperty(
      "--support-viewport-height",
      `${CONFIG.viewportHeight}px`
    );
    document.documentElement.style.setProperty(
      "--support-title-height",
      `${CONFIG.titleHeight}px`
    );
    document.documentElement.style.setProperty(
      "--support-card-width",
      `${CONFIG.cardWidth}px`
    );
    document.documentElement.style.setProperty(
      "--support-card-gap",
      `${CONFIG.cardGap}px`
    );
    document.documentElement.style.setProperty(
      "--support-card-color-opacity",
      String(cardBackgroundOpacity)
    );
    document.documentElement.style.setProperty(
      "--support-start-x",
      `${layout.startX}px`
    );
    document.documentElement.style.setProperty(
      "--support-start-y",
      `${layout.startY}px`
    );
    document.documentElement.style.setProperty(
      "--support-banner-width",
      `${layout.width}px`
    );
  }

  function getActiveStreamId() {
    return CONFIG.streamId || VCT_IDB.getDefaultStreamId();
  }

  function getSortOrder() {
    return CONFIG.displayOrder === "newest_first" ? "desc" : "asc";
  }

  function sortSupports(records) {
    const multiplier = getSortOrder() === "desc" ? -1 : 1;

    return [...records].sort((a, b) => {
      const aTime = a.eventAt ?? a.createdAt ?? 0;
      const bTime = b.eventAt ?? b.createdAt ?? 0;
      const timeDiff = (aTime - bTime) * multiplier;
      if (timeDiff !== 0) {
        return timeDiff;
      }

      const aId = String(a.eventKey || a.originalEventId || "");
      const bId = String(b.eventKey || b.originalEventId || "");
      return aId.localeCompare(bId) * multiplier;
    });
  }

  function normalizeStateSupports(records) {
    const sorted = sortSupports(records);
    if (!CONFIG.limit || sorted.length <= CONFIG.limit) {
      return sorted;
    }

    return sorted.slice(0, CONFIG.limit);
  }

  function extractFirstImageInfo(html) {
    if (!html) return { url: "", alt: "" };

    try {
      const doc = new DOMParser().parseFromString(String(html), "text/html");
      const img = doc.querySelector("img");
      if (!img) return { url: "", alt: "" };

      return {
        url: img.dataset.src || img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
      };
    } catch (err) {
      return { url: "", alt: "" };
    }
  }

  function getSupportImageInfo(record) {
    const gift = resolveSupportGift(record);
    return { url: gift.imageUrl, alt: gift.label };
  }

  function resolveSupportGift(record) {
    if (window.VCT && typeof VCT.resolveSupportGift === "function") {
      return VCT.resolveSupportGift(record);
    }
    const raw = record?.raw || {};
    const data = raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw;
    const imageInfo = extractFirstImageInfo(data?.comment || data?.message || "");

    return {
      type: String(record?.giftType || record?.rawType || data?.giftType || "").trim(),
      label: String(record?.giftLabel || data?.speechText || imageInfo.alt || "").trim(),
      imageUrl: String(record?.giftImageUrl || imageInfo.url || "").trim(),
      hasImage: !!(record?.giftImageUrl || imageInfo.url),
    };
  }

  function getCardMessage(record) {
    const message = String(record?.message || "").trim();
    const gift = resolveSupportGift(record);
    if (message && gift.hasImage && gift.label && message === gift.label) {
      return "";
    }
    return message;
  }

  function setSupports(records) {
    state.supports = normalizeStateSupports(records);
  }

  function appendSupport(record) {
    setSupports([...state.supports, record]);
  }

  function buildIncomingSupportRecord(coreComment) {
    if (!window.VCT || typeof VCT.buildSupportRecord !== "function") {
      return null;
    }

    return VCT.buildSupportRecord(coreComment, {
      streamId: getActiveStreamId(),
      buildUserKey: window.VCT_IDB && typeof VCT_IDB.buildUserKey === "function"
        ? VCT_IDB.buildUserKey
        : null,
      now: () => Date.now(),
    });
  }

  function isDisplayableSupportEvent(coreComment) {
    const event = coreComment?.event || {};
    return !!(event.isSupport || event.isGiftSender);
  }

  function truncateText(text, maxLength) {
    if (!text) return "";
    const normalized = String(text).replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return normalized.slice(0, maxLength) + "…";
  }

  function formatAmount(record) {
    const amount = Number(record.amount || 0);
    const currency = record.currency || "";
    if (String(record.rawType || "").toLowerCase() === "sponsorgift") {
      return `${amount.toLocaleString()} 件`;
    }
    return currency ? `${amount.toLocaleString()} ${currency}` : amount.toLocaleString();
  }

  function sanitizeColor(color) {
    if (!color || typeof color !== "string") return "";

    const normalized = color.trim();
    if (!normalized) return "";

    const isHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized);
    if (isHex) {
      return normalized;
    }

    const isRgbFamily = /^rgba?\(\s*\d{1,3}\s*(?:,\s*|\s+)\d{1,3}\s*(?:,\s*|\s+)\d{1,3}(?:\s*(?:,\s*|\s+\/\s*)\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(normalized);
    if (isRgbFamily) {
      return normalized;
    }

    return "";
  }

  function convertColorToRgba(color, alpha) {
    const sanitized = sanitizeColor(color);
    if (!sanitized) {
      return "";
    }

    if (sanitized.startsWith("#")) {
      let hex = sanitized.slice(1);
      if (hex.length === 3) {
        hex = hex.split("").map((char) => char + char).join("");
      }

      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const match = sanitized.match(/rgba?\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)/i);
    if (!match) {
      return "";
    }

    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }

  function getCardBackground(record) {
    const alpha = Math.min(1, Math.max(0, parseFiniteNumber(CONFIG.cardBackgroundOpacity, DEFAULT_CONFIG.cardBackgroundOpacity)));
    const baseColor = convertColorToRgba(record.supportColor, alpha);
    if (!baseColor) return "";
    const mode = CONFIG.cardColorMode === "contrast" ? "contrast" : "soft";

    if (mode === "contrast") {
      const accentColor = convertColorToRgba(record.supportColor, Math.min(1, alpha * 0.9 + 0.08));
      const shadowColor = `rgba(8, 12, 20, ${Math.min(0.82, alpha * 0.68 + 0.12)})`;
      return `linear-gradient(135deg, ${accentColor}, ${shadowColor})`;
    }

    const accentColor = convertColorToRgba(record.supportColor, Math.min(1, alpha * 0.72 + 0.08));
    return `linear-gradient(135deg, ${accentColor}, ${baseColor})`;
  }

  function createIcon(url, alt) {
    const img = document.createElement("img");
    img.className = "support-card__icon";
    img.alt = alt || "";
    img.referrerPolicy = "no-referrer";

    if (url) {
      img.src = url;
      img.onerror = () => {
        img.removeAttribute("src");
      };
    }

    return img;
  }

  function createCard(record) {
    const card = document.createElement("div");
    card.className = "support-card support-card--fallback";

    const bg = getCardBackground(record);
    if (bg) {
      card.style.background = bg;
      card.classList.remove("support-card--fallback");
    }

    const head = document.createElement("div");
    head.className = "support-card__head";

    if (CONFIG.showIcon) {
      head.appendChild(createIcon(record.userIcon, record.userName || ""));
    }

    const name = document.createElement("div");
    name.className = "support-card__name";
    name.textContent = record.userName || "Unknown";
    head.appendChild(name);

    const gift = resolveSupportGift(record);
    const cardMessage = getCardMessage(record);
    const amountRow = document.createElement("div");
    amountRow.className = "support-card__amount-row";

    if (CONFIG.amountVisible) {
      const amount = document.createElement("div");
      amount.className = "support-card__amount";
      amount.textContent = formatAmount(record);
      amountRow.appendChild(amount);
    }

    if (gift.imageUrl) {
      const sticker = document.createElement("img");
      sticker.className = "support-card__sticker";
      sticker.src = gift.imageUrl;
      sticker.alt = gift.label || "sticker";
      sticker.referrerPolicy = "no-referrer";
      sticker.onerror = () => sticker.remove();
      amountRow.appendChild(sticker);
    }

    const message = document.createElement("div");
    message.className = "support-card__message";
    message.textContent = truncateText(cardMessage, CONFIG.maxMessageLength);

    card.appendChild(head);

    if (amountRow.childElementCount > 0) {
      card.appendChild(amountRow);
    }

    if (CONFIG.messageVisible) {
      card.appendChild(message);
    }

    return card;
  }

  function stopAutoScroll(options = {}) {
    const preserveOffset = options.preserveOffset === true;

    if (scrollState.frameId) {
      cancelAnimationFrame(scrollState.frameId);
    }

    scrollState.frameId = 0;
    scrollState.lastTime = 0;
    scrollState.setWidth = 0;
    scrollState.initialized = preserveOffset;

    if (!preserveOffset) {
      scrollState.offset = 0;
    }

    if (els.track) {
      els.track.style.transform = preserveOffset
        ? `translateX(${scrollState.offset}px)`
        : "translateX(0px)";
    }
  }

  function createCardSet(records) {
    const set = document.createElement("div");
    set.className = "support-banner__set";

    for (const record of records) {
      set.appendChild(createCard(record));
    }

    return set;
  }

  function tickScroll(now) {
    if (!els.track || !scrollState.setWidth) {
      stopAutoScroll();
      return;
    }

    if (!scrollState.initialized) {
      const viewportWidth = els.track.parentElement?.clientWidth || 0;
      scrollState.offset = viewportWidth;
      scrollState.initialized = true;
    }

    if (!scrollState.lastTime) {
      scrollState.lastTime = now;
    }

    const delta = Math.min(0.05, (now - scrollState.lastTime) / 1000);
    scrollState.lastTime = now;
    scrollState.offset -= CONFIG.scrollSpeed * delta;

    if (scrollState.offset <= -scrollState.setWidth) {
      scrollState.offset += scrollState.setWidth;
    }

    els.track.style.transform = `translateX(${scrollState.offset}px)`;
    scrollState.frameId = requestAnimationFrame(tickScroll);
  }

  function startAutoScroll() {
    if (!els.track) {
      return;
    }

    const firstSet = els.track.querySelector(".support-banner__set");
    const setWidth = firstSet ? firstSet.offsetWidth : 0;
    if (!setWidth) {
      return;
    }

    const viewportWidth = els.track.parentElement?.clientWidth || 0;
    const wasInitialized = scrollState.initialized;
    const previousOffset = scrollState.offset;

    stopAutoScroll({ preserveOffset: true });
    scrollState.setWidth = setWidth;
    scrollState.initialized = true;

    if (!wasInitialized) {
      scrollState.offset = viewportWidth;
    } else if (scrollState.offset <= -scrollState.setWidth) {
      scrollState.offset = previousOffset % scrollState.setWidth;
    }

    els.track.style.transform = `translateX(${scrollState.offset}px)`;
    scrollState.frameId = requestAnimationFrame(tickScroll);
  }

  function renderSupports(records = state.supports) {
    const hasExistingTrack = !!els.track?.childElementCount;
    els.track.innerHTML = "";

    if (!records || records.length === 0) {
      stopAutoScroll();
      const empty = document.createElement("div");
      empty.className = "support-banner__empty";
      empty.textContent = CONFIG.emptyStateText || "まだ支援はありません";
      els.track.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    const viewportWidth = els.track.parentElement?.clientWidth || 0;
    const estimatedSetWidth = records.length * CONFIG.cardWidth + Math.max(0, records.length - 1) * CONFIG.cardGap;
    const minimumLoopWidth = Math.max(viewportWidth * 2, CONFIG.cardWidth * 3);
    const repeatCount = Math.max(2, estimatedSetWidth > 0 ? Math.ceil(minimumLoopWidth / estimatedSetWidth) + 1 : 2);

    for (let i = 0; i < repeatCount; i += 1) {
      fragment.appendChild(createCardSet(records));
    }

    els.track.appendChild(fragment);

    if (!hasExistingTrack) {
      scrollState.initialized = false;
    }

    startAutoScroll();
  }

  async function loadSupports() {
    const streamId = getActiveStreamId();

    const records = await VCT_IDB.getSupports({
      streamId,
      limit: CONFIG.limit,
      order: getSortOrder(),
    });

    setSupports(records);
    renderSupports();
  }

  async function handleIncomingComment(rawComment) {
    const coreComment = window.VCT && typeof VCT.parseCore === "function"
      ? VCT.parseCore(rawComment)
      : null;
    if (!coreComment) {
      return;
    }

    if (!isDisplayableSupportEvent(coreComment)) {
      return;
    }

    const record = buildIncomingSupportRecord(coreComment);
    if (!record) {
      return;
    }

    appendSupport(record);
    renderSupports();
  }

  function setupOneSDK() {
    if (!window.OneSDK) {
      console.error("[SupportBanner] OneSDK not found.");
      return;
    }

    OneSDK.setup({
      mode: "diff",
      permissions: ["comments", "clear"],
    });

    OneSDK.subscribe({
      action: "comments",
      callback: (res) => {
        const list = Array.isArray(res) ? res : [res];
        list.forEach((rawComment) => {
          handleIncomingComment(rawComment).catch((err) => {
            console.error("[SupportBanner] comment handling error:", err);
          });
        });
      },
    });

    OneSDK.subscribe({
      action: "clear",
      callback: () => {
        setSupports([]);
        renderSupports();
      },
    });

    OneSDK.ready().then(() => {
      OneSDK.connect();
      console.log("[SupportBanner] Ready");
    }).catch((err) => {
      console.error("[SupportBanner] OneSDK ready error:", err);
    });
  }

  function handleResize() {
    applyConfig();
    if (!els.track || !els.track.childElementCount) {
      return;
    }

    startAutoScroll();
  }

  async function boot() {
    initElements();
    applyConfig();
    await VCT_IDB.initDB();
    await loadSupports();
    setupOneSDK();
    window.addEventListener("resize", handleResize);
  }

  window.addEventListener("DOMContentLoaded", () => {
    boot().catch((err) => {
      console.error("[SupportBanner] boot error:", err);
    });
  });
})();
