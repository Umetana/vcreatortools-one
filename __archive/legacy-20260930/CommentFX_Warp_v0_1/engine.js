/**
 * CommentFX Warp v0.1 - engine.js
 * コメントデータから Warp event を生成する。
 */

window.ENGINE = (function () {
  function hasRenderablePart(part) {
    if (!part || typeof part !== "object") return false;
    if (part.type === "text") return String(part.content || "").trim().length > 0;
    if (part.type === "emoji") return !!(part.url || part.alt);
    return false;
  }

  function onComment(comment) {
    if (!comment) return [];
    const text = String(comment.text || "").trim();
    const parts = Array.isArray(comment.parts) ? comment.parts : [];
    const imgUrls = Array.isArray(comment.imgUrls) ? comment.imgUrls : [];
    const hasRenderableContent = !!text || parts.some(hasRenderablePart) || imgUrls.length > 0;
    if (!hasRenderableContent) return [];

    return [{
      type: "warp",
      text,
      user: comment.user || "",
      color: comment.color || { r: 255, g: 255, b: 255 },
      colorStr: comment.colorStr || "rgb(255,255,255)",
      imgUrls,
      parts,
      hasGift: !!comment.hasGift,
      isSticky: !!comment.isSticky,
      membership: !!comment.membership,
      isOwner: !!comment.isOwner,
      isModerator: !!comment.isModerator,
      raw: comment.raw || null,
      life: window.CONFIG?.EFFECT_DURATION || 3.0,
      scale: 1.0,
      intensity: 1.0
    }];
  }

  return { onComment };
})();
