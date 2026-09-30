/**
 * CommentFX Base V2.6 - fx.js
 * 汎用 CommentFX event を Canvas2D で描画する。
 */
(function () {
  const canvas = document.getElementById("fx");
  const ctx = canvas?.getContext("2d");

  if (!canvas || !ctx) {
    window.FX = {
      push: () => {},
      clear: () => {},
      reset: () => {}
    };
    return;
  }

  const items = [];
  const spriteCache = new Map();

  function getConfigNumber(key, fallback) {
    const value = Number(window.CONFIG?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureImageSprite(url, size) {
    if (!url) return null;

    const key = `IMG|${url}|${Math.round(size)}`;
    const cached = spriteCache.get(key);
    if (cached) return cached.ready ? cached : null;

    const entry = { ready: false, canvas: null, w: 0, h: 0 };
    spriteCache.set(key, entry);

    const img = new Image();
    img.onload = () => {
      const h = Math.max(1, Math.floor(size * 1.2));
      const ratio = img.height ? img.width / img.height : 1;
      const w = Math.max(1, Math.floor(h * ratio));
      const spriteCanvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement("canvas"), { width: w, height: h });
      const spriteCtx = spriteCanvas.getContext("2d");
      spriteCtx.drawImage(img, 0, 0, w, h);
      entry.ready = true;
      entry.canvas = spriteCanvas;
      entry.w = w;
      entry.h = h;
    };
    img.onerror = () => spriteCache.delete(key);
    img.src = url;

    return null;
  }

  function resolveColor(color) {
    if (color && typeof color === "object" && color.r !== undefined) {
      return color;
    }
    return { r: 255, g: 255, b: 255 };
  }

  function firstImageUrl(event) {
    if (Array.isArray(event.imgUrls) && event.imgUrls.length > 0) {
      return event.imgUrls[0];
    }

    if (Array.isArray(event.parts)) {
      const emoji = event.parts.find((part) => part?.type === "emoji" && part.url);
      if (emoji) return emoji.url;
    }

    return null;
  }

  function spawn(event) {
    if (!event || typeof event !== "object") return;

    const baseFontSize = getConfigNumber("FONT_SIZE", 36);
    const duration = Number(event.life) || getConfigNumber("EFFECT_DURATION", 3.0);
    const scale = Number(event.scale) || (0.9 + Math.random() * 0.25);
    const imgSize = baseFontSize * 1.5;
    const emojiUrl = event.emojiUrl || firstImageUrl(event);

    const item = {
      type: event.type || "comment",
      text: String(event.text || ""),
      user: String(event.user || ""),
      color: resolveColor(event.color),
      x: Number.isFinite(event.x) ? event.x : Math.random() * window.innerWidth,
      y: Number.isFinite(event.y) ? event.y : -50,
      vx: Number.isFinite(event.vx) ? event.vx : (Math.random() - 0.5) * 70,
      vy: Number.isFinite(event.vy) ? event.vy : 160 + Math.random() * 120,
      age: 0,
      duration,
      scale,
      intensity: Number(event.intensity) || 1.0,
      emojiUrl,
      imgSize
    };

    if (item.emojiUrl) ensureImageSprite(item.emojiUrl, imgSize);

    items.push(item);

    const max = getConfigNumber("MAX_ACTIVE", 30);
    while (items.length > max) items.shift();
  }

  function update(dt) {
    const globalIntensity = getConfigNumber("FX_INTENSITY", 1.0);

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const intensity = globalIntensity * item.intensity;

      item.x += item.vx * dt * intensity;
      item.y += item.vy * dt * intensity;
      item.age += dt;

      if (item.age >= item.duration || item.y > window.innerHeight + 200) {
        items.splice(i, 1);
      }
    }
  }

  function drawText(item, drawX, drawY, alpha) {
    if (!item.text) return;

    const baseFontSize = getConfigNumber("FONT_SIZE", 36);
    const fontSize = baseFontSize * item.scale;
    const textY = item.emojiUrl ? drawY + item.imgSize * item.scale * 0.72 : drawY;

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(3, fontSize / 8);
    ctx.strokeStyle = "rgba(0,0,0,0.88)";
    ctx.strokeText(item.text, drawX, textY);
    ctx.fillStyle = `rgb(${item.color.r},${item.color.g},${item.color.b})`;
    ctx.fillText(item.text, drawX, textY);
  }

  function drawImage(item, drawX, drawY, alpha) {
    if (!item.emojiUrl) return;

    const sprite = ensureImageSprite(item.emojiUrl, item.imgSize);
    if (!sprite) return;

    const scale = item.scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      sprite.canvas,
      drawX - (sprite.w * scale) / 2,
      drawY - (sprite.h * scale) / 2,
      sprite.w * scale,
      sprite.h * scale
    );
  }

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const item of items) {
      const progress = Math.min(1, item.age / item.duration);
      const alpha = Math.max(0, Math.min(1, 1 - progress));
      const drawX = item.x;
      const drawY = item.y;

      drawImage(item, drawX, drawY, alpha);
      drawText(item, drawX, drawY, alpha);
    }

    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);

  window.FX = {
    push: spawn,
    clear: () => { items.length = 0; },
    reset: () => { items.length = 0; }
  };
})();
