/**
 * CommentFX Base V2.6 - parser.js
 * OneSDK の生コメントを CommentFX 用 commentData に正規化する。
 */
(function (global) {
  const DEFAULT_COLOR = { r: 255, g: 255, b: 255 };

  function getLegacyData(rawComment) {
    return rawComment?.data
      || rawComment?.payload?.raw?.data
      || rawComment?.payload?.data
      || rawComment?.raw?.data
      || rawComment?.payload
      || rawComment
      || {};
  }

  function parseLegacy(rawComment) {
    const data = getLegacyData(rawComment);
    const text = data.comment || data.text || data.message || data.body || "";
    const user = data.displayName || data.name || "Anonymous";

    return {
      id: data.id || rawComment?.id || `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: String(text),
      user,
      screenName: data.screenName || null,
      profileImage: data.profileImage || data.originalProfileImage || "",
      color: { ...DEFAULT_COLOR },
      colorStr: "rgb(255,255,255)",
      badges: data.badges || [],
      parts: [{ type: "text", content: String(text) }],
      imgUrls: [],
      vctCommand: { exists: false, name: "", body: "", fullText: String(text).trim() },
      hasGift: !!data.hasGift,
      giftType: data.giftType || "",
      isSticky: !!data.isSticky,
      membership: !!data.membership,
      isOwner: !!(data.isOwner || data.isBroadcaster),
      isModerator: !!data.isModerator,
      raw: rawComment
    };
  }

  function normalizeLegacy(parsed, rawComment) {
    const fallback = parseLegacy(rawComment);
    const color = parsed?.color || fallback.color;

    return {
      ...fallback,
      ...parsed,
      text: String(parsed?.text ?? fallback.text ?? ""),
      user: parsed?.user || fallback.user,
      color,
      colorStr: parsed?.colorStr || `rgb(${color.r},${color.g},${color.b})`,
      badges: Array.isArray(parsed?.badges) ? parsed.badges : fallback.badges,
      parts: Array.isArray(parsed?.parts) ? parsed.parts : fallback.parts,
      imgUrls: Array.isArray(parsed?.imgUrls) ? parsed.imgUrls : fallback.imgUrls,
      raw: parsed?.raw || rawComment
    };
  }

  function normalizeStructured(structured) {
    if (!structured || typeof structured !== "object") return {};

    const color = structured.style?.color || DEFAULT_COLOR;
    const legacy = structured.legacy || {};
    const message = structured.message || {};
    const user = structured.user || {};
    const monetization = structured.monetization || {};
    const membershipDetail = structured.membership || {};
    const gift = monetization.gift || {};

    return {
      id: structured.id,
      service: structured.service || null,
      user: user.displayName || user.name || "Anonymous",
      screenName: user.screenName || null,
      profileImage: user.profileImage || user.originalProfileImage || "",
      badges: Array.isArray(user.badges) ? user.badges : [],
      text: String(legacy.text ?? message.text ?? ""),
      parts: Array.isArray(legacy.parts) ? legacy.parts : (Array.isArray(message.parts) ? message.parts : []),
      imgUrls: Array.isArray(legacy.imgUrls) ? legacy.imgUrls : (Array.isArray(message.imgUrls) ? message.imgUrls : []),
      vctCommand: message.command || { exists: false, name: "", body: "", fullText: "" },
      color,
      colorStr: structured.style?.colorStr || `rgb(${color.r},${color.g},${color.b})`,
      hasGift: !!monetization.hasGift,
      giftType: gift.type || monetization.kind || "",
      giftLabel: gift.label || "",
      giftImageUrl: gift.imageUrl || "",
      isSticky: !!structured.system?.isSticky,
      membership: !!membershipDetail.active,
      isAnonymous: !!user.isAnonymous,
      isFirstTime: !!user.isFirstTime,
      isRepeater: !!user.isRepeater,
      isOwner: !!user.isOwner,
      isModerator: !!user.isModerator,
      structured,
      event: structured.event || null,
      monetization,
      membershipDetail,
      message,
      legacy,
      system: structured.system || null,
      style: structured.style || null,
      userDetail: user,
      raw: structured.raw || null
    };
  }

  function mergeParsed(legacyParsed, structuredParsed, rawComment) {
    const legacy = normalizeLegacy(legacyParsed, rawComment);
    const structured = normalizeStructured(structuredParsed);
    const color = structured.color || legacy.color || DEFAULT_COLOR;

    return {
      ...legacy,
      ...structured,
      id: structured.id || legacy.id,
      text: String(structured.text || legacy.text || ""),
      user: structured.user || legacy.user,
      color,
      colorStr: structured.colorStr || legacy.colorStr || `rgb(${color.r},${color.g},${color.b})`,
      badges: Array.isArray(structured.badges) && structured.badges.length ? structured.badges : legacy.badges,
      parts: Array.isArray(structured.parts) && structured.parts.length ? structured.parts : legacy.parts,
      imgUrls: Array.isArray(structured.imgUrls) && structured.imgUrls.length ? structured.imgUrls : legacy.imgUrls,
      raw: structured.raw || legacy.raw || rawComment
    };
  }

  function parse(rawComment) {
    try {
      if (global.VCT && typeof global.VCT.parseStructured === "function") {
        const structured = global.VCT.parseStructured(rawComment);
        const legacy = typeof global.VCT.parse === "function" ? global.VCT.parse(rawComment) : null;
        return mergeParsed(legacy, structured, rawComment);
      }

      if (global.VCT && typeof global.VCT.parse === "function") {
        return normalizeLegacy(global.VCT.parse(rawComment), rawComment);
      }
    } catch (err) {
      if (global.CONFIG?.DEBUG) {
        console.warn("[CommentFX] VCT parse failed. Fallback parser used.", err);
      }
    }

    return parseLegacy(rawComment);
  }

  global.CommentFXParser = {
    parse,
    parseLegacy,
    normalizeStructured
  };
})(window);
