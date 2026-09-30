/**
 * VCT DanmakuFX V1 - engine.js
 * コメント本文から絵文字/カスタム絵文字だけを抽出してFXイベント化する。
 */

window.ENGINE = (function () {
  const EMOJI_RE = /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)/gu;

  function cfg(key, fallback) {
    return window.CONFIG?.[key] ?? fallback;
  }

  function num(key, fallback) {
    const value = Number(window.CONFIG?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function getRawData(comment) {
    const raw = comment?.raw || {};
    return raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw;
  }

  function getCommentHtml(comment) {
    const data = getRawData(comment);
    return String(data?.comment ?? data?.message ?? data?.text ?? data?.body ?? comment?.text ?? "");
  }

  function isCustomEmoji(img, alt) {
    const customAttr = img.getAttribute("data-custom-emoji") || img.dataset?.customEmoji;
    if (String(customAttr).toLowerCase() === "true") return true;
    if (/^:[^:\s][^:]*:$/.test(alt)) return true;
    return img.classList.contains("custom-emoji") || img.classList.contains("gift-sticker") || img.classList.contains("gift-image");
  }

  function pushTextEmojiTokens(tokens, text) {
    if (!text) return;
    const matches = String(text).matchAll(EMOJI_RE);
    for (const match of matches) {
      const key = match[0];
      if (!key) continue;
      tokens.push({
        key,
        type: "emoji",
        text: key,
        src: null,
        isCustom: false
      });
    }
  }

  function extractTokensFromHtml(html) {
    const tokens = [];
    if (!html) return tokens;

    let doc;
    try {
      doc = new DOMParser().parseFromString(String(html), "text/html");
    } catch (err) {
      pushTextEmojiTokens(tokens, html);
      return tokens;
    }

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        pushTextEmojiTokens(tokens, node.textContent || "");
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      if (node.tagName === "IMG") {
        const alt = (node.getAttribute("alt") || "").trim();
        const src = node.getAttribute("data-src") || node.getAttribute("src") || "";
        if (!alt && !src) return;

        const custom = isCustomEmoji(node, alt);
        tokens.push({
          key: alt || src,
          type: custom ? "customEmoji" : "emoji",
          text: alt,
          src,
          isCustom: custom
        });
        return;
      }

      node.childNodes.forEach(walk);
    }

    doc.body.childNodes.forEach(walk);
    return tokens;
  }

  function filterTokens(tokens) {
    const mode = cfg("SOURCE_MODE", "all");
    if (mode === "emoji") return tokens.filter((token) => !token.isCustom);
    if (mode === "custom") return tokens.filter((token) => token.isCustom);
    return tokens;
  }

  function shuffle(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function pickEffect() {
    const effects = Array.isArray(window.CONFIG?.EFFECTS) ? window.CONFIG.EFFECTS : [];
    const enabled = effects.filter((effect) => effect?.name && Number(effect.weight) > 0);
    if (cfg("EFFECT_MODE", "random") !== "random") return cfg("EFFECT_MODE", "fall");
    if (enabled.length === 0) return "fall";

    const total = enabled.reduce((sum, effect) => sum + Number(effect.weight), 0);
    let roll = Math.random() * total;
    for (const effect of enabled) {
      roll -= Number(effect.weight);
      if (roll <= 0) return effect.name;
    }
    return enabled[enabled.length - 1].name;
  }

  function buildEvent(comment, token) {
    const useImage = token.isCustom && cfg("CUSTOM_EMOJI_USE_IMAGE", true) && token.src;
    const fallbackText = cfg("FALLBACK_TO_ALT_TEXT", true) ? token.text || token.key : "";

    return {
      type: "danmaku-token",
      token,
      text: useImage ? fallbackText : token.text || token.key,
      imageUrl: useImage ? token.src : "",
      effect: pickEffect(),
      color: comment.color || { r: 255, g: 255, b: 255 },
      colorStr: comment.colorStr || "rgb(255,255,255)",
      intensity: num("FX_INTENSITY", 1.0)
    };
  }

  function onComment(comment) {
    if (!comment) return [];
    if (Math.random() > num("PICKUP_RATE", 0.3)) return [];

    const tokens = filterTokens(extractTokensFromHtml(getCommentHtml(comment)));
    if (tokens.length === 0) return [];

    const minPick = Math.max(1, Math.floor(num("MIN_PICK_PER_COMMENT", 1)));
    const maxPick = Math.max(minPick, Math.floor(num("MAX_PICK_PER_COMMENT", 2)));
    const count = Math.min(tokens.length, minPick + Math.floor(Math.random() * (maxPick - minPick + 1)));

    return shuffle(tokens).slice(0, count).map((token) => buildEvent(comment, token));
  }

  return {
    onComment,
    extractTokensFromHtml
  };
})();
