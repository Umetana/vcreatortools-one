(function (global) {
  function normalizeTextFromParts(parts) {
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => {
      if (!part) return "";
      if (part.type === "text") return part.content || "";
      return part.alt || part.name || "";
    }).join("");
  }

  function toInfoHudComment(normalized, raw) {
    const monetization = normalized?.monetization || {};
    const money = monetization.money || {};
    const jewels = monetization.jewels || {};
    const gift = monetization.gift || {};
    const membership = normalized?.membership || {};
    const system = normalized?.system || {};
    const style = normalized?.style || {};
    const user = normalized?.user || {};
    const roles = user.roles || {};
    const message = normalized?.message || {};
    const translation = message.translation || {};
    const event = normalized?.event || {};
    const isSupport = !!event.isSupport;
    const isMembership = !!event.isMembership;
    const messageParts = Array.isArray(message.parts) ? message.parts : [];

    return {
      id: normalized?.id || `${Date.now()}-${Math.random()}`,
      userName: user.displayName || user.name || "unknown",
      badges: Array.isArray(user.badges) ? user.badges : [],
      messageText: message.text || "",
      messageParts,
      translationText: translation.available ? translation.text || "" : "",
      translationParts: translation.available && Array.isArray(translation.parts) ? translation.parts : [],
      colorStr: style.colorString || "",
      isSpecial: !!(isSupport || isMembership || system.isSticky),
      userFlags: {
        isOwner: !!roles.owner,
        isModerator: !!roles.moderator,
        isMember: !!roles.member
      },
      support: {
        hasGift: !!monetization.present || isSupport,
        kind: monetization.kind || gift.type || "",
        displayText: money.displayText || "",
        amount: money.available ? Number(money.amount) || 0 : 0,
        currency: money.available ? money.currency || "" : "",
        jewelCount: jewels.available ? Number(jewels.count) || 0 : 0,
        label: gift.label || "",
        imageUrl: gift.imageUrl || "",
        hasImage: !!gift.hasImage
      },
      membership: {
        active: !!membership.active,
        primary: membership.primary || "",
        sub: membership.sub || ""
      },
      event: {
        kind: event.kind || "",
        category: event.category || "",
        isSupport,
        isMembership,
        isGiftSender: !!membership.isGiftSender,
        isGiftReceiver: !!membership.isGiftReceiver,
        giftCount: Number(membership.giftCount) || 0,
        displayLabel: event.displayLabel || "",
        announcementText: event.announcementText || "",
        shouldShowMessage: event.shouldShowMessage !== false
      },
      command: message.command || { exists: false, name: "", body: "", fullText: "" },
      raw
    };
  }

  function parseComment(raw) {
    if (!global.VCT_SDK || typeof global.VCT_SDK.normalize !== "function") return null;
    const normalized = global.VCT_SDK.normalize(raw);
    return normalized ? toInfoHudComment(normalized, raw) : null;
  }

  function truncate(value, maxChars) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    const limit = Math.max(1, Number(maxChars) || 42);
    if (Array.from(text).length <= limit) return text;
    return `${Array.from(text).slice(0, Math.max(1, limit - 3)).join("")}...`;
  }

  function appendTextPart(parent, text) {
    if (!text) return;
    const span = document.createElement("span");
    span.className = "log-row__text";
    span.textContent = String(text).replace(/\s+/g, " ");
    parent.appendChild(span);
  }

  function appendImagePart(parent, part) {
    if (!part?.url) return;
    const img = document.createElement("img");
    img.className = part.isSticker ? "log-row__sticker" : "log-row__emoji";
    img.src = part.url;
    img.alt = part.alt || "";
    img.title = part.alt || "";
    parent.appendChild(img);
  }

  function appendFallbackText(parent, part) {
    appendTextPart(parent, part?.alt || part?.name || "");
  }

  function formatMembershipLabel(membership) {
    const primary = String(membership?.primary || "").replace(/\s+か月/g, "か月").trim();
    return primary || "メンバー";
  }

  function getSupportDisplayText(comment) {
    const support = comment.support || {};
    const event = comment.event || {};
    const eventKind = String(event.kind || "").toLowerCase();

    if (eventKind === "membership_gift") {
      return event.giftCount > 0 ? `メンギフ x${event.giftCount}` : "メンギフ";
    }

    if (eventKind === "membership_gift_received") return "ギフト受取";
    if (eventKind === "member_join") return "メンバー加入";
    if (eventKind === "member_milestone" || eventKind === "membership_event") {
      return formatMembershipLabel(comment.membership);
    }

    if (!support.hasGift) return "";
    const kind = String(support.kind || "").toLowerCase();

    if (kind === "sponsorgift") {
      const amount = Number(support.amount) || 0;
      return amount > 0 ? `メンギフ x${amount}` : "メンギフ";
    }

    if (kind === "giftreceived") return "ギフト受取";
    if (kind === "milestonechat") return formatMembershipLabel(comment.membership);

    if (eventKind === "jewel") {
      const count = Number(support.jewelCount) || 0;
      return count > 0 ? `💎 ${count}` : "💎";
    }

    if (support.displayText) return support.displayText;

    const amount = Number(support.amount) || 0;
    if (amount > 0 && support.currency) return `${support.currency} ${amount.toLocaleString("ja-JP")}`;
    if (amount > 0) return amount.toLocaleString("ja-JP");
    if (support.label) return support.label;
    return "";
  }

  function shouldShowGiftCard(comment, config) {
    if (config.GIFT_CARD_ENABLED !== true) return false;
    const support = comment.support || {};
    const event = comment.event || {};
    if (event.kind) {
      return !!event.isSupport || event.kind === "membership_gift";
    }

    if (!support.hasGift) return false;
    const kind = String(support.kind || "").toLowerCase();
    return kind !== "giftreceived";
  }

  function getEventMessageSetting(kind, config) {
    const map = {
      superchat: config.SHOW_EVENT_MESSAGE_SUPERCHAT,
      supersticker: config.SHOW_EVENT_MESSAGE_SUPERSTICKER,
      jewel: config.SHOW_EVENT_MESSAGE_JEWEL,
      member_milestone: config.SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT,
      membership_event: config.SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT,
      member_join: config.SHOW_EVENT_MESSAGE_MEMBER_JOIN,
      membership_gift: config.SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT,
      membership_gift_received: config.SHOW_EVENT_MESSAGE_GIFT_RECEIVED
    };

    return map[String(kind || "").toLowerCase()];
  }

  function shouldShowEventLog(comment, config) {
    const event = comment?.event || {};
    if (!event.kind) return true;
    if (config.SHOW_EVENT_MESSAGES === false) return false;

    const setting = getEventMessageSetting(event.kind, config);
    if (typeof setting === "boolean") return setting;

    return event.shouldShowMessage !== false;
  }

  function getActiveMessageParts(comment, config) {
    const mode = String(config.COMMENT_TRANSLATION_MODE || "original").toLowerCase();
    const translatedParts = Array.isArray(comment.translationParts) && comment.translationParts.length > 0
      ? comment.translationParts
      : [];

    if (mode === "translated" && translatedParts.length > 0) {
      return translatedParts;
    }

    if (Array.isArray(comment.messageParts) && comment.messageParts.length > 0) {
      return comment.messageParts;
    }

    const fallbackText = comment.messageText || comment.event?.announcementText || "";
    return fallbackText ? [{ type: "text", content: fallbackText }] : [];
  }

  function getActiveMessageText(comment, config) {
    const mode = String(config.COMMENT_TRANSLATION_MODE || "original").toLowerCase();
    if (mode === "translated" && comment.translationText) {
      return comment.translationText;
    }

    return comment.messageText || comment.event?.announcementText || "";
  }

  function createGiftCardData(comment, config) {
    const maxChars = Math.max(12, Number(config.MAX_COMMENT_CHARS) || 42);
    const activeParts = getActiveMessageParts(comment, config);
    const stickerPart = activeParts.find((part) => part?.type === "emoji" && part.isSticker && part.url);
    const imageUrl = comment.support?.imageUrl || stickerPart?.url || "";
    const message = normalizeTextFromParts(activeParts) || getActiveMessageText(comment, config) || "";
    return {
      label: getSupportDisplayText(comment) || "ギフト",
      userName: comment.userName || "unknown",
      message: truncate(message, Math.min(72, maxChars + 24)),
      messageParts: activeParts,
      imageUrl,
      imageAlt: comment.support?.label || stickerPart?.alt || "",
      colorStr: comment.colorStr || ""
    };
  }

  function createSupportBadge(text) {
    const badge = document.createElement("span");
    badge.className = "log-row__support";
    badge.textContent = text;
    return badge;
  }

  function createUserFlagBadges(flags) {
    const fragment = document.createDocumentFragment();
    if (!flags) return fragment;

    if (flags.isOwner) {
      const badge = document.createElement("span");
      badge.className = "log-row__user-flag log-row__user-flag--owner";
      badge.textContent = "OWNER";
      fragment.appendChild(badge);
    }

    if (flags.isModerator && !flags.isOwner) {
      const badge = document.createElement("span");
      badge.className = "log-row__user-flag log-row__user-flag--moderator";
      badge.textContent = "MOD";
      fragment.appendChild(badge);
    }

    return fragment;
  }

  function appendMessageParts(parent, comment, config) {
    const maxChars = Math.max(1, Number(config.MAX_COMMENT_CHARS) || 42);
    const supportText = getSupportDisplayText(comment);
    const supportMode = config.SUPPORT_AMOUNT_DISPLAY || "badge";
    let usedChars = 0;
    let truncated = false;

    const parts = getActiveMessageParts(comment, config);

    if (supportText && supportMode === "before") {
      appendTextPart(parent, `${supportText} `);
    }

    for (const part of parts) {
      if (truncated) break;

      if (part?.type === "text") {
        const chars = Array.from(String(part.content || "").replace(/\s+/g, " "));
        const remaining = maxChars - usedChars;
        if (remaining <= 0) {
          truncated = true;
          break;
        }

        if (chars.length > remaining) {
          appendTextPart(parent, `${chars.slice(0, Math.max(1, remaining - 3)).join("")}...`);
          truncated = true;
        } else {
          appendTextPart(parent, chars.join(""));
          usedChars += chars.length;
        }
        continue;
      }

      if (part?.type === "emoji") {
        if (part.isSticker) {
          if (config.SHOW_STICKERS !== false) appendImagePart(parent, part);
          else appendFallbackText(parent, part);
        } else {
          if (config.SHOW_IMAGE_EMOJI !== false) appendImagePart(parent, part);
          else appendFallbackText(parent, part);
        }
      }
    }

    if (!parent.childNodes.length) {
      appendTextPart(parent, truncate(normalizeTextFromParts(parts) || getActiveMessageText(comment, config) || "", maxChars));
    }

    if (supportText && supportMode === "after") {
      appendTextPart(parent, ` ${supportText}`);
    }
  }

  function createBadgeList(badges) {
    const fragment = document.createDocumentFragment();
    if (!Array.isArray(badges)) return fragment;

    badges.slice(0, 4).forEach((badge) => {
      if (!badge?.url) return;
      const img = document.createElement("img");
      img.className = "log-row__badge";
      img.src = badge.url;
      img.alt = badge.label || "";
      img.title = badge.label || "";
      fragment.appendChild(img);
    });

    return fragment;
  }

  function createLogRow(comment, config) {
    const row = document.createElement("div");
    row.className = "log-row";

    const isSpecial = !!comment.isSpecial;
    const eventColor = comment.colorStr || "";

    if (isSpecial && eventColor) {
      row.classList.add("log-row--special");
      row.style.setProperty("--event-color", eventColor);
    }

    const badges = document.createElement("span");
    badges.className = "log-row__badges";
    badges.appendChild(createBadgeList(comment.badges));
    badges.appendChild(createUserFlagBadges(comment.userFlags));

    const supportText = getSupportDisplayText(comment);
    const name = document.createElement("span");
    name.className = "log-row__name";
    name.textContent = comment.userName || "unknown";

    const separator = document.createElement("span");
    separator.className = "log-row__separator";
    separator.textContent = "：";

    const message = document.createElement("span");
    message.className = "log-row__message";
    appendMessageParts(message, comment, config);

    row.appendChild(badges);
    if (supportText && (config.SUPPORT_AMOUNT_DISPLAY || "badge") === "badge") {
      row.appendChild(createSupportBadge(supportText));
    }
    row.appendChild(name);
    row.appendChild(separator);
    row.appendChild(message);

    return row;
  }

  function createCommentRuntime(options) {
    const listEl = options.listEl;
    const getConfig = options.getConfig;
    const setStatus = options.setStatus;
    const onMeta = typeof options.onMeta === "function" ? options.onMeta : () => {};
    const onGiftCard = typeof options.onGiftCard === "function" ? options.onGiftCard : () => {};
    const seenIds = new Set();

    function trimRows() {
      const config = getConfig();
      const max = Math.max(10, Number(config.LOG_MAX_ITEMS) || 80);
      while (listEl.children.length > max) {
        listEl.removeChild(listEl.firstElementChild);
      }
    }

    function addComment(raw) {
      const config = getConfig();
      const comment = parseComment(raw);
      if (!comment) return;

      const id = comment.id;
      if (id && seenIds.has(String(id))) return;

      if (id) {
        seenIds.add(String(id));
      }

      if (shouldShowGiftCard(comment, config)) {
        onGiftCard(createGiftCardData(comment, config));
      }

      if (!shouldShowEventLog(comment, config)) return;

      const row = createLogRow(comment, config);
      if (id) row.dataset.commentId = String(id);
      listEl.appendChild(row);
      trimRows();
    }

    function clear() {
      listEl.replaceChildren();
      seenIds.clear();
    }

    function addSystem(text) {
      const row = document.createElement("div");
      row.className = "log-row log-row--system";
      row.textContent = text;
      listEl.appendChild(row);
      trimRows();
    }

    function connectOneSDK() {
      if (!global.OneSDK) {
        setStatus("わんコメ未接続");
        addSystem("わんコメ未接続");
        return;
      }

      setStatus("わんコメ接続準備中");

      try {
        function fetchInitialMeta() {
          if (typeof global.OneSDK.getServices !== "function") return;
          global.OneSDK.getServices().then((services) => {
            if (Array.isArray(services) && services[0]) onMeta(services[0]);
          }).catch(() => {});
        }

        global.OneSDK.setup();

        global.OneSDK.subscribe({
          action: "comments",
          callback: (comments) => {
            const list = Array.isArray(comments) ? comments : [comments];
            list.filter(Boolean).forEach(addComment);
          }
        });

        global.OneSDK.subscribe({
          action: "clear",
          callback: clear
        });

        global.OneSDK.subscribe({
          action: "connected",
          callback: () => {
            setStatus("わんコメ接続中");
            fetchInitialMeta();
          }
        });

        global.OneSDK.subscribe({
          action: "meta",
          callback: onMeta
        });

        global.OneSDK.ready()
          .then(() => {
            setStatus("わんコメ接続中");
            global.OneSDK.connect();
            setTimeout(fetchInitialMeta, 1000);
          })
          .catch((err) => {
            console.warn("[VCT_InfoHUD] OneSDK ready failed.", err);
            setStatus("わんコメ未接続");
            addSystem("わんコメ未接続");
          });
      } catch (err) {
        console.warn("[VCT_InfoHUD] OneSDK setup failed.", err);
        setStatus("わんコメ未接続");
        addSystem("わんコメ未接続");
      }
    }

    return {
      addComment,
      addSystem,
      clear,
      connectOneSDK
    };
  }

  global.VCTInfoHUDComments = { create: createCommentRuntime };
})(window);
