/**
 * CommentFX Base V2.6 - engine.js
 * コメントデータから汎用 CommentFX event を生成する。
 */

window.ENGINE = (function () {
  function onComment(comment) {
    if (!comment) return [];

    return [{
      type: "comment",
      text: comment.text || "",
      user: comment.user || "",
      color: comment.color || { r: 255, g: 255, b: 255 },
      colorStr: comment.colorStr || "rgb(255,255,255)",
      imgUrls: comment.imgUrls || [],
      parts: comment.parts || [],
      event: comment.event || null,
      structured: comment.structured || null,
      monetization: comment.monetization || null,
      membershipDetail: comment.membershipDetail || null,
      service: comment.service || null,
      system: comment.system || null,
      raw: comment.raw || null,
      life: window.CONFIG?.EFFECT_DURATION || 3.0,
      scale: 1.0,
      intensity: 1.0
    }];
  }

  return { onComment };
})();
