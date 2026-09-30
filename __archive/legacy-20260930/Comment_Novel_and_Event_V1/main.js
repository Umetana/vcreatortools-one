(function () {
  "use strict";

  const C = window.CNE_CONFIG || {};
  const E = C.event || {};
  const stage = document.getElementById("event-stage");
  const queue = [];
  const recentUsers = [];
  const seenCommentIds = new Set();
  const visibleCards = new Map();
  const routeDictionaryIds = new Map();
  const scriptLoads = new Map();
  let lastAcceptedAt = 0;
  let queueTimer = 0;
  let cardSequence = 0;

  const log = (...args) => {
    if (C.debug) console.log("[CNE]", ...args);
  };
  const randomItem = items => items[Math.floor(Math.random() * items.length)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const truncate = (value, limit) => {
    const chars = Array.from(String(value || ""));
    return limit > 0 && chars.length > limit ? `${chars.slice(0, limit).join("")}...` : chars.join("");
  };

  const appearanceStyleKeys = [
    "fontFamily", "fontSizePx", "cardMaxWidthPx", "cardBackground", "textColor",
    "accentColor", "border", "boxShadow", "borderRadiusPx", "popDurationMs"
  ];

  function pickAppearanceValues(source) {
    const result = {};
    for (const key of appearanceStyleKeys) {
      if (Object.prototype.hasOwnProperty.call(source || {}, key)) result[key] = source[key];
    }
    return result;
  }

  function resolveAppearance(dictionaryAppearance = null) {
    const appearance = C.appearance || {};
    const presets = appearance.presets || {};
    const useDictionaryAppearance = appearance.dictionaryPresetMode !== "global";
    const requested = String(appearance.preset || "popup");
    const presetName = presets[requested] ? requested : (presets.popup ? "popup" : Object.keys(presets)[0]);
    const preset = presets[presetName] || {};
    const globalValues = {
      ...preset,
      ...pickAppearanceValues(appearance),
      ...pickAppearanceValues(appearance.overrides)
    };
    const dictionaryPresetName = useDictionaryAppearance
      ? String(dictionaryAppearance?.preset || "").trim()
      : "";
    const dictionaryPreset = dictionaryPresetName && presets[dictionaryPresetName]
      ? presets[dictionaryPresetName]
      : null;

    if (dictionaryPresetName && !dictionaryPreset) {
      console.warn(`[CNE] Unknown dictionary appearance preset: ${dictionaryPresetName}`);
    }

    return {
      presetName: dictionaryPreset ? dictionaryPresetName : (presetName || "custom"),
      values: {
        ...globalValues,
        ...(dictionaryPreset || {}),
        ...pickAppearanceValues(useDictionaryAppearance ? dictionaryAppearance?.overrides : null)
      }
    };
  }

  function applyAppearanceVariables(target, style) {
    target.style.setProperty("--font-family", style.fontFamily || "sans-serif");
    target.style.setProperty("--font-size", `${toNumber(style.fontSizePx, 38)}px`);
    target.style.setProperty("--card-max-width", `${toNumber(style.cardMaxWidthPx, 400)}px`);
    target.style.setProperty("--card-bg", style.cardBackground || "rgba(255, 255, 255, 0.94)");
    target.style.setProperty("--card-text", style.textColor || "#1b1b24");
    target.style.setProperty("--card-accent", style.accentColor || "#ff5fa2");
    target.style.setProperty("--card-border", style.border || "3px solid rgba(255, 95, 162, 0.9)");
    target.style.setProperty("--card-shadow", style.boxShadow || "0 10px 30px rgba(0, 0, 0, 0.28)");
    target.style.setProperty("--card-radius", `${toNumber(style.borderRadiusPx, 28)}px`);
    target.style.setProperty("--pop-duration", `${Math.max(1, toNumber(style.popDurationMs, 220))}ms`);
  }

  function applyAppearance() {
    const canvas = C.canvas || {};
    const appearance = C.appearance || {};
    const resolved = resolveAppearance();
    const style = resolved.values;
    const root = document.documentElement;
    root.dataset.cnePreset = resolved.presetName;
    root.style.setProperty("--canvas-width", `${toNumber(canvas.width, 1920)}px`);
    root.style.setProperty("--canvas-height", `${toNumber(canvas.height, 1080)}px`);
    applyAppearanceVariables(root, style);
    root.style.setProperty("--comment-emoji-size", `${Math.max(0.1, toNumber(E.commentDisplay?.emojiSizeEm, 1.2))}em`);
    root.style.setProperty("--comment-sticker-size", `${Math.max(0.1, toNumber(E.commentDisplay?.stickerSizeEm, 2.2))}em`);
    log("Appearance preset", resolved.presetName);
    resizeStage();
  }

  function resizeStage() {
    if (!stage) return;
    const width = Math.max(1, toNumber(C.canvas?.width, 1920));
    const height = Math.max(1, toNumber(C.canvas?.height, 1080));
    stage.style.transform = `scale(${window.innerWidth / width}, ${window.innerHeight / height})`;
  }

  function rememberComment(id) {
    if (!id || seenCommentIds.has(id)) return false;
    seenCommentIds.add(id);
    if (seenCommentIds.size > 500) {
      seenCommentIds.delete(seenCommentIds.values().next().value);
    }
    return true;
  }

  function normalizeNameKey(name) {
    return String(name || "anonymous").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function hasSourceEventColor(parsed) {
    const raw = parsed?.raw || {};
    const data = raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw;
    return !!(data?.colors || raw?.colors || raw?.payload?.data?.colors);
  }

  function normalizeComment(raw) {
    if (!window.VCT) return null;
    if (typeof VCT.parseStructured === "function") {
      const parsed = VCT.parseStructured(raw);
      const serviceId = String(parsed.service?.id || "unknown");
      const name = parsed.user?.displayName || parsed.user?.name || "Anonymous";
      const userId = String(parsed.user?.id || "").trim();
      return {
        id: parsed.id || raw?.id || `${Date.now()}:${Math.random()}`,
        userKey: userId ? `${serviceId}:${userId}` : `${serviceId}:name:${normalizeNameKey(name)}`,
        name,
        comment: parsed.message?.text || "",
        commentParts: Array.isArray(parsed.message?.parts) ? parsed.message.parts : [],
        kind: parsed.event?.kind || "normal",
        amount: parsed.monetization?.amount || 0,
        currency: parsed.monetization?.currency || "",
        giftLabel: parsed.monetization?.gift?.label || parsed.event?.displayLabel || "",
        giftCount: parsed.event?.giftCount || 0,
        eventColor: hasSourceEventColor(parsed) ? String(parsed.style?.colorStr || "") : ""
      };
    }

    const parsed = VCT.parse(raw);
    const name = parsed.user || "Anonymous";
    return {
      id: parsed.id || raw?.id || `${Date.now()}:${Math.random()}`,
      userKey: `unknown:name:${normalizeNameKey(name)}`,
      name,
      comment: parsed.text || "",
      commentParts: Array.isArray(parsed.parts) ? parsed.parts : [],
      kind: "normal",
      amount: 0,
      currency: "",
      giftLabel: "",
      giftCount: 0,
      eventColor: ""
    };
  }

  function getRoute(kind) {
    const routes = E.routes || {};
    return routes[kind] || routes.default || null;
  }

  function isRecentUser(userKey) {
    if (E.userDedupe?.enabled === false) return false;
    return recentUsers.includes(userKey);
  }

  function isQueuedUser(userKey) {
    if (E.userDedupe?.enabled === false) return false;
    return queue.some(entry => entry.comment.userKey === userKey);
  }

  function rememberTriggeredUser(userKey) {
    if (E.userDedupe?.enabled === false) return;
    const limit = Math.max(0, Math.floor(toNumber(E.recentUserWindow, 0)));
    if (!limit) return;
    const existing = recentUsers.indexOf(userKey);
    if (existing !== -1) recentUsers.splice(existing, 1);
    recentUsers.push(userKey);
    while (recentUsers.length > limit) recentUsers.shift();
  }

  function enqueue(entry) {
    const settings = E.queue || {};
    if (settings.enabled === false) {
      if (visibleCards.size < Math.max(1, toNumber(E.maxVisible, 5))) displayEntry(entry);
      return;
    }

    const maxSize = Math.max(1, Math.floor(toNumber(settings.maxSize, 10)));
    if (queue.length >= maxSize) {
      if (settings.overflow === "dropNewest") {
        log("Queue full: dropped newest", entry.comment.name);
        return;
      }
      const dropped = queue.shift();
      log("Queue full: dropped oldest", dropped?.comment?.name);
    }
    queue.push(entry);
    log("Queued", entry.comment.name, `(${queue.length})`);
  }

  function processQueue() {
    if (!queue.length) return;
    if (visibleCards.size >= Math.max(1, toNumber(E.maxVisible, 5))) return;
    const entry = queue.shift();
    if (isRecentUser(entry.comment.userKey)) {
      log("Skipped at display: recent user", entry.comment.name);
      return;
    }
    displayEntry(entry);
  }

  function getPosition() {
    if (E.spawnMode === "fixed") {
      return {
        x: toNumber(E.fixedPosition?.x, 960),
        y: toNumber(E.fixedPosition?.y, 540)
      };
    }
    const area = E.randomArea || {};
    const xMin = toNumber(area.xMin, 0);
    const xMax = toNumber(area.xMax, toNumber(C.canvas?.width, 1920));
    const yMin = toNumber(area.yMin, 0);
    const yMax = toNumber(area.yMax, toNumber(C.canvas?.height, 1080));
    return {
      x: xMin + Math.random() * Math.max(0, xMax - xMin),
      y: yMin + Math.random() * Math.max(0, yMax - yMin)
    };
  }

  function buildTemplate(dictionary, comment) {
    const template = randomItem(dictionary.templates);
    const values = {
      name: truncate(comment.name, toNumber(E.maxNameLength, 24)),
      amount: String(comment.amount || ""),
      currency: String(comment.currency || ""),
      giftLabel: String(comment.giftLabel || "ステッカー"),
      giftCount: String(comment.giftCount || "")
    };

    for (const [key, words] of Object.entries(dictionary.words || {})) {
      values[key] = String(randomItem(words) || "");
    }

    return String(template).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, key) => {
      if (key === "comment") return token;
      return values[key] ?? token;
    });
  }

  function getLimitedCommentParts(comment) {
    const settings = E.commentDisplay || {};
    const maxUnits = Math.max(0, Math.floor(toNumber(settings.maxUnits, 36)));
    const maxMediaItems = Math.max(0, Math.floor(toNumber(settings.maxMediaItems, 4)));
    const emojiCost = Math.max(1, toNumber(settings.emojiUnitCost, 2));
    const stickerCost = Math.max(1, toNumber(settings.stickerUnitCost, 6));
    const source = comment.commentParts?.length
      ? comment.commentParts
      : [{ type: "text", content: comment.comment || "" }];
    const result = [];
    let usedUnits = 0;
    let mediaItems = 0;
    let truncated = false;

    outer: for (const part of source) {
      if (part?.type === "text") {
        let content = "";
        for (const char of Array.from(String(part.content || ""))) {
          if (maxUnits > 0 && usedUnits + 1 > maxUnits) {
            truncated = true;
            break outer;
          }
          content += char;
          usedUnits += 1;
        }
        if (content) result.push({ type: "text", content });
        continue;
      }

      if (part?.type === "emoji" && part.url) {
        const cost = part.isSticker ? stickerCost : emojiCost;
        if ((maxMediaItems > 0 && mediaItems >= maxMediaItems) || (maxUnits > 0 && usedUnits + cost > maxUnits)) {
          truncated = true;
          break;
        }
        result.push({
          type: "emoji",
          url: String(part.url),
          alt: String(part.alt || ""),
          isSticker: !!part.isSticker
        });
        mediaItems += 1;
        usedUnits += cost;
      }
    }

    return { parts: result, truncated };
  }

  function appendCommentParts(parent, comment) {
    const settings = E.commentDisplay || {};
    const limited = getLimitedCommentParts(comment);
    for (const part of limited.parts) {
      if (part.type === "text") {
        parent.appendChild(document.createTextNode(part.content));
        continue;
      }
      const image = document.createElement("img");
      image.src = part.url;
      image.alt = part.alt;
      image.className = part.isSticker ? "cne-comment-sticker" : "cne-comment-emoji";
      image.loading = "eager";
      parent.appendChild(image);
    }
    if (limited.truncated) {
      parent.appendChild(document.createTextNode(String(settings.overflowText ?? "…")));
    }
  }

  function renderTemplate(parent, dictionary, comment) {
    const template = buildTemplate(dictionary, comment);
    const chunks = template.split("{comment}");
    const maxTextLength = Math.max(0, toNumber(E.maxTextLength, 100));

    chunks.forEach((chunk, index) => {
      const text = maxTextLength > 0 ? truncate(chunk, maxTextLength) : chunk;
      if (text) parent.appendChild(document.createTextNode(text));
      if (index < chunks.length - 1) appendCommentParts(parent, comment);
    });
  }

  function removeCard(id, immediate = false) {
    const record = visibleCards.get(id);
    if (!record) return;
    clearTimeout(record.hideTimer);
    clearTimeout(record.removeTimer);
    visibleCards.delete(id);
    if (immediate) {
      record.element.remove();
      return;
    }
    record.element.classList.remove("is-visible");
    record.element.classList.add("is-leaving");
    record.removeTimer = setTimeout(() => record.element.remove(), 500);
  }

  function displayEntry(entry) {
    if (!stage) return;
    const { dictionary, comment } = entry;
    const id = `cne-${++cardSequence}`;
    const card = document.createElement("article");
    const label = document.createElement("span");
    const text = document.createElement("span");
    const position = getPosition();

    card.className = "cne-card";
    const dictionaryAppearance = resolveAppearance(dictionary.appearance);
    applyAppearanceVariables(card, dictionaryAppearance.values);
    card.dataset.cnePreset = dictionaryAppearance.presetName;
    const eventColor = C.appearance?.eventColor || {};
    const eventColorKinds = Array.isArray(eventColor.kinds) ? eventColor.kinds : [];
    const fallbackColor = eventColor.useFallbackColors !== false
      ? String(eventColor.fallbackColors?.[comment.kind] || "")
      : "";
    const cardEventColor = comment.eventColor || fallbackColor;
    if (eventColor.enabled !== false && cardEventColor && eventColorKinds.includes(comment.kind)) {
      card.style.setProperty("--card-bg", cardEventColor);
      card.style.setProperty("--card-text", eventColor.textColor || "#ffffff");
      card.style.setProperty("--card-accent", eventColor.accentColor || "#ffffff");
      card.style.setProperty("--card-border", eventColor.border || "4px solid rgba(255, 255, 255, 0.95)");
      card.style.setProperty("--card-shadow", eventColor.boxShadow || "0 12px 34px rgba(0, 0, 0, 0.38)");
      card.dataset.cneEventColor = "true";
      card.dataset.cneEventColorSource = comment.eventColor ? "source" : "fallback";
    }
    label.className = "cne-card__kind";
    label.textContent = dictionary.label || dictionary.title || comment.kind;
    text.className = "cne-card__text";
    renderTemplate(text, dictionary, comment);
    card.append(label, text);
    card.style.left = `${position.x}px`;
    card.style.top = `${position.y}px`;
    stage.appendChild(card);

    if (E.allowOverflow === false) {
      const width = toNumber(C.canvas?.width, 1920);
      const height = toNumber(C.canvas?.height, 1080);
      const halfWidth = card.offsetWidth / 2;
      const halfHeight = card.offsetHeight / 2;
      card.style.left = `${clamp(position.x, halfWidth, width - halfWidth)}px`;
      card.style.top = `${clamp(position.y, halfHeight, height - halfHeight)}px`;
    }

    const record = { element: card, hideTimer: 0, removeTimer: 0 };
    visibleCards.set(id, record);
    rememberTriggeredUser(comment.userKey);
    requestAnimationFrame(() => card.classList.add("is-visible"));
    record.hideTimer = setTimeout(() => removeCard(id), Math.max(0, toNumber(E.durationMs, 4500)));
    log("Displayed", comment.name, dictionary.id);
  }

  function selectDictionary(kind) {
    const ids = routeDictionaryIds.get(kind) || routeDictionaryIds.get("default") || [];
    const dictionaries = ids.map(id => window.CNE_EVENT_DICTIONARIES?.get(id)).filter(Boolean);
    if (!dictionaries.length) return null;
    return E.dictionarySelectMode === "single" ? dictionaries[0] : randomItem(dictionaries);
  }

  function handleComment(raw) {
    const comment = normalizeComment(raw);
    if (!comment || !rememberComment(comment.id)) return;
    const route = getRoute(comment.kind);
    if (!route?.enabled) {
      log("Skipped: route disabled", comment.kind);
      return;
    }

    const rate = clamp(toNumber(route.triggerRate, toNumber(E.triggerRate, 1)), 0, 1);
    if (Math.random() >= rate) {
      log("Skipped: rate", comment.name);
      return;
    }

    const now = Date.now();
    const cooldown = Math.max(0, toNumber(route.cooldownMs, toNumber(E.cooldownMs, 0)));
    if (now - lastAcceptedAt < cooldown) {
      log("Skipped: cooldown", comment.name);
      return;
    }
    if (isRecentUser(comment.userKey) || isQueuedUser(comment.userKey)) {
      log("Skipped: duplicate user", comment.name);
      return;
    }

    const dictionary = selectDictionary(comment.kind);
    if (!dictionary) {
      console.warn(`[CNE] No dictionary available for event kind: ${comment.kind}`);
      return;
    }

    lastAcceptedAt = now;
    enqueue({ comment, dictionary });
  }

  function clearAll() {
    queue.length = 0;
    recentUsers.length = 0;
    seenCommentIds.clear();
    lastAcceptedAt = 0;
    for (const id of [...visibleCards.keys()]) removeCard(id, true);
    log("Cleared");
  }

  function loadScript(path) {
    if (scriptLoads.has(path)) return scriptLoads.get(path);
    const promise = new Promise((resolve, reject) => {
      const before = new Set(window.CNE_EVENT_DICTIONARIES?.keys() || []);
      const script = document.createElement("script");
      script.src = path;
      script.onload = () => {
        const ids = [...(window.CNE_EVENT_DICTIONARIES?.keys() || [])].filter(id => !before.has(id));
        resolve(ids);
      };
      script.onerror = () => reject(new Error(`Failed to load dictionary: ${path}`));
      document.head.appendChild(script);
    });
    scriptLoads.set(path, promise);
    return promise;
  }

  async function loadRouteDictionaries() {
    for (const [kind, route] of Object.entries(E.routes || {})) {
      const ids = [];
      for (const path of Array.isArray(route.dictionaryFiles) ? route.dictionaryFiles : []) {
        try {
          ids.push(...await loadScript(path));
        } catch (error) {
          console.warn("[CNE]", error.message);
        }
      }
      routeDictionaryIds.set(kind, [...new Set(ids)]);
      log("Route dictionaries", kind, routeDictionaryIds.get(kind));
    }
  }

  async function start() {
    if (C.mode !== "event") {
      console.warn(`[CNE] Unsupported mode in v0.1: ${C.mode}`);
      return;
    }
    applyAppearance();
    await loadRouteDictionaries();

    const interval = Math.max(50, toNumber(E.queue?.intervalMs, 700));
    queueTimer = window.setInterval(processQueue, interval);

    if (C.debug) {
      window.CNE_DEBUG = Object.freeze({
        emit(data = {}) {
          const id = `debug-${Date.now()}-${Math.random()}`;
          handleComment({
            id,
            service: { id: "debug", name: "debug" },
            data: {
              id,
              userId: data.userId || `user-${Math.random()}`,
              name: data.name || "テストリスナー",
              displayName: data.name || "テストリスナー",
              comment: data.comment || "テストコメント"
            }
          });
        },
        clear: clearAll,
        getState: () => ({ queue: [...queue], recentUsers: [...recentUsers], visible: visibleCards.size })
      });
    }

    if (!window.OneSDK) {
      console.error("[CNE] OneSDK not found.");
      return;
    }
    OneSDK.setup({ mode: "diff", permissions: ["comments", "clear"] });
    OneSDK.subscribe({
      action: "comments",
      callback: response => (Array.isArray(response) ? response : [response]).forEach(handleComment)
    });
    OneSDK.subscribe({ action: "clear", callback: clearAll });
    await OneSDK.ready();
    OneSDK.connect();
    console.log(`Comment Novel and Event V1: Ready (VCT SDK ${window.VCT?.VERSION || "unknown"})`);
  }

  window.addEventListener("resize", resizeStage);
  window.addEventListener("beforeunload", () => {
    clearInterval(queueTimer);
    clearAll();
  });
  start().catch(error => console.error("[CNE] Startup failed.", error));
})();
