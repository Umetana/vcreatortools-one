(function (global) {
  function createInfoRotator(element) {
    let timer = null;
    let temporaryTimer = null;
    let index = 0;
    const giftQueue = [];
    const maxGiftQueueSize = 3;

    function stopMainTimer() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function stopTemporaryTimer() {
      if (temporaryTimer) clearTimeout(temporaryTimer);
      temporaryTimer = null;
    }

    function stop() {
      stopMainTimer();
      stopTemporaryTimer();
      giftQueue.length = 0;
    }

    function setNormalMode() {
      element.classList.remove("info-message--gift-card");
      element.style.removeProperty("--event-color");
    }

    function render(messages) {
      setNormalMode();
      const list = Array.isArray(messages) && messages.length > 0
        ? messages.filter((item) => String(item || "").trim())
        : ["---"];

      if (list.length === 0) list.push("---");
      index %= list.length;
      element.textContent = list[index];
    }

    function appendCardLine(parent, className, text) {
      if (!text) return;
      const line = document.createElement("div");
      line.className = className;
      line.textContent = text;
      parent.appendChild(line);
    }

    function appendCardImage(parent, card) {
      if (!card?.imageUrl) return;
      const frame = document.createElement("div");
      frame.className = "gift-card__image-frame";

      const img = document.createElement("img");
      img.className = "gift-card__image";
      img.src = card.imageUrl;
      img.alt = card.imageAlt || "";
      img.title = card.imageAlt || "";

      frame.appendChild(img);
      parent.appendChild(frame);
    }

    function appendCardMessage(parent, card) {
      const line = document.createElement("div");
      line.className = "gift-card__message";
      const parts = Array.isArray(card?.messageParts) ? card.messageParts : [];

      parts.forEach((part) => {
        if (part?.type === "text" && part.content) {
          const text = document.createElement("span");
          text.textContent = String(part.content).replace(/\s+/g, " ");
          line.appendChild(text);
          return;
        }

        if (part?.type !== "emoji" || part.isSticker || !part.url) return;
        const img = document.createElement("img");
        img.className = "gift-card__emoji";
        img.src = part.url;
        img.alt = part.alt || "";
        img.title = part.alt || "";
        line.appendChild(img);
      });

      if (!line.childNodes.length && card?.message) {
        line.textContent = card.message;
      }
      if (line.childNodes.length) parent.appendChild(line);
    }

    function start(config) {
      stop();
      const activeConfig = config || {};
      const messages = Array.isArray(activeConfig.INFO_MESSAGES)
        ? activeConfig.INFO_MESSAGES.filter((item) => String(item || "").trim())
        : [];
      const interval = Math.max(3000, Number(activeConfig.INFO_INTERVAL_MS) || 8000);

      index = 0;
      render(messages);

      timer = setInterval(() => {
        const active = messages.length > 0 ? messages : ["---"];
        const count = active.length;
        index = (index + 1) % count;
        render(active);
      }, interval);
    }

    function renderGiftCard(card, getConfig) {
      stopMainTimer();
      stopTemporaryTimer();
      const config = (typeof getConfig === "function" ? getConfig() : getConfig) || {};
      const showLabel = config.GIFT_CARD_SHOW_LABEL !== false;
      const showUser = config.GIFT_CARD_SHOW_USER !== false;
      const showMessage = config.GIFT_CARD_SHOW_MESSAGE !== false;
      const showImage = config.GIFT_CARD_SHOW_IMAGE !== false;
      const showMessageWithImage = config.GIFT_CARD_SHOW_MESSAGE_WITH_IMAGE === true;
      const hasImage = showImage && !!card.imageUrl;
      element.replaceChildren();
      element.classList.add("info-message--gift-card");
      element.style.setProperty("--event-color", card.colorStr || "rgba(94, 234, 212, 0.92)");

      const wrap = document.createElement("div");
      wrap.className = "gift-card";

      if (showLabel) appendCardLine(wrap, "gift-card__type", card.label || "ギフト");
      if (showUser) appendCardLine(wrap, "gift-card__name", card.userName || "unknown");
      if (hasImage) appendCardImage(wrap, card);
      if (showMessage && (!hasImage || showMessageWithImage)) {
        appendCardMessage(wrap, card);
      }

      element.appendChild(wrap);

      const duration = Math.max(3000, Number(config.GIFT_CARD_DURATION_MS) || 7000);
      temporaryTimer = setTimeout(() => {
        temporaryTimer = null;
        const nextConfig = (typeof getConfig === "function" ? getConfig() : config) || {};
        if (nextConfig.GIFT_CARD_QUEUE_ENABLED === true && giftQueue.length > 0) {
          renderGiftCard(giftQueue.shift(), getConfig);
          return;
        }
        giftQueue.length = 0;
        start(nextConfig);
      }, duration);
    }

    function showGiftCard(card, getConfig) {
      const config = (typeof getConfig === "function" ? getConfig() : getConfig) || {};
      if (config.GIFT_CARD_QUEUE_ENABLED === true && temporaryTimer) {
        giftQueue.push(card);
        if (giftQueue.length > maxGiftQueueSize) giftQueue.shift();
        return;
      }

      if (config.GIFT_CARD_QUEUE_ENABLED !== true) giftQueue.length = 0;
      renderGiftCard(card, getConfig);
    }

    return { start, stop, showGiftCard };
  }

  global.VCTInfoHUDInfoRotator = { create: createInfoRotator };
})(window);
