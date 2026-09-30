/**
 * CommentFX Base V2 - parser.js
 * OneSDK の生コメントを CommentFX 用 commentData に正規化する。
 */
(function (global) {
  const DEFAULT_COLOR = { r: 255, g: 255, b: 255 };

  function parseLegacy(rawComment) {
    const data = rawComment?.data || rawComment?.payload?.data || rawComment?.payload || rawComment || {};
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
      isSticky: !!data.isSticky,
      membership: !!data.membership,
      isOwner: !!(data.isOwner || data.isBroadcaster),
      isModerator: !!data.isModerator,
      raw: rawComment
    };
  }

  function normalize(parsed, rawComment) {
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

  function parse(rawComment) {
    try {
      if (global.VCT && typeof global.VCT.parse === "function") {
        return normalize(global.VCT.parse(rawComment), rawComment);
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
    parseLegacy
  };
})(window);
