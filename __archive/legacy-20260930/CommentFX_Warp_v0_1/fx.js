/**
 * CommentFX Warp v0.1 - fx.js
 * コメント文字列をワープ空間の光跡として Canvas2D で描画する。
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
  const TAU = Math.PI * 2;

  function getConfigNumber(key, fallback) {
    const value = Number(window.CONFIG?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function getConfigBoolean(key, fallback) {
    const value = window.CONFIG?.[key];
    return typeof value === "boolean" ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(min, max, t) {
    return min + (max - min) * t;
  }

  function randomRange(min, max) {
    return lerp(min, max, Math.random());
  }

  function reverseText(value) {
    return Array.from(String(value || "")).reverse().join("");
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

    const entry = { ready: false, failed: false, canvas: null, w: 0, h: 0 };
    spriteCache.set(key, entry);

    const img = new Image();
    img.onload = () => {
      const h = Math.max(1, Math.floor(size));
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
    img.onerror = () => {
      entry.failed = true;
      spriteCache.delete(key);
    };
    img.src = url;

    return null;
  }

  function resolveColor(event) {
    if (getConfigBoolean("RANDOM_COLOR", false)) {
      const hue = Math.floor(Math.random() * 360);
      return { r: 255, g: 255, b: 255, css: `hsl(${hue}, 95%, 68%)` };
    }

    const color = event.color;
    const useNormalColor = getConfigBoolean("USE_NORMAL_USER_COLOR", getConfigBoolean("USE_USER_COLOR", true));
    const useGiftColor = getConfigBoolean("USE_GIFT_COLOR", getConfigBoolean("USE_USER_COLOR", true));
    const useStickyColor = getConfigBoolean("USE_STICKY_COLOR", useGiftColor);
    const useMemberColor = getConfigBoolean("USE_MEMBER_COLOR", useNormalColor);
    const shouldUseColor = event.hasGift
      ? useGiftColor
      : event.isSticky
        ? useStickyColor
        : event.membership
          ? useMemberColor
          : useNormalColor;

    if (shouldUseColor && color && typeof color === "object" && color.r !== undefined) {
      const r = clamp(Number.isFinite(Number(color.r)) ? Number(color.r) : 255, 0, 255);
      const g = clamp(Number.isFinite(Number(color.g)) ? Number(color.g) : 255, 0, 255);
      const b = clamp(Number.isFinite(Number(color.b)) ? Number(color.b) : 255, 0, 255);
      return {
        r,
        g,
        b,
        css: `rgb(${r},${g},${b})`
      };
    }

    return { r: 255, g: 255, b: 255, css: "rgb(255,255,255)" };
  }

  function getCenter() {
    return {
      x: window.innerWidth * getConfigNumber("CENTER_X_RATIO", 0.5),
      y: window.innerHeight * getConfigNumber("CENTER_Y_RATIO", 0.5)
    };
  }

  function getMaxDistance() {
    return Math.hypot(window.innerWidth, window.innerHeight) * 0.62 + 240;
  }

  function pickAngle() {
    const spreadDeg = clamp(getConfigNumber("ANGLE_SPREAD", 360), 1, 360);
    const spread = spreadDeg * Math.PI / 180;
    return -Math.PI / 2 + randomRange(-spread / 2, spread / 2);
  }

  function pushTextPart(parts, content, maxParts) {
    const text = String(content || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    const last = parts[parts.length - 1];
    if (last?.type === "text") {
      last.content += text;
      return;
    }

    if (parts.length < maxParts) {
      parts.push({ type: "text", content: text });
    }
  }

  function pushImagePart(parts, part, imageState, maxParts, maxImages) {
    const url = part?.url || "";
    const alt = part?.alt || "";
    const isSticker = !!part?.isSticker;

    if (url && imageState.count < maxImages && parts.length < maxParts) {
      parts.push({ type: "emoji", url, alt, isSticker });
      imageState.count += 1;
      imageState.urls.add(url);
      return;
    }

    if (!url && alt) pushTextPart(parts, alt, maxParts);
  }

  function truncateParts(parts) {
    const maxChars = Math.max(0, getConfigNumber("MAX_TEXT_CHARS_PER_COMMENT", 28));
    if (maxChars === 0) return parts.filter((part) => part.type !== "text");

    const suffix = String(window.CONFIG?.TRUNCATE_SUFFIX ?? "...");
    const nextParts = [];
    let usedChars = 0;
    let truncated = false;

    for (const part of parts) {
      if (part.type !== "text") {
        nextParts.push(part);
        continue;
      }

      const chars = Array.from(String(part.content || ""));
      if (chars.length === 0) continue;

      const remaining = maxChars - usedChars;
      if (remaining <= 0) {
        truncated = true;
        continue;
      }

      if (chars.length > remaining) {
        nextParts.push({ ...part, content: chars.slice(0, remaining).join("") });
        usedChars += remaining;
        truncated = true;
      } else {
        nextParts.push(part);
        usedChars += chars.length;
      }
    }

    if (!truncated || !suffix) return nextParts;

    const last = nextParts[nextParts.length - 1];
    if (last?.type === "text") {
      last.content += suffix;
    } else {
      nextParts.push({ type: "text", content: suffix });
    }

    return nextParts;
  }

  function buildParts(event) {
    const maxParts = Math.max(1, getConfigNumber("MAX_PARTS_PER_COMMENT", 16));
    const maxImages = Math.max(0, getConfigNumber("MAX_IMAGES_PER_COMMENT", 4));
    const enableParts = getConfigBoolean("ENABLE_PARTS_RENDERING", true);
    const sourceParts = enableParts && Array.isArray(event.parts) ? event.parts : [];
    const parts = [];
    const imageState = { count: 0, urls: new Set() };

    for (const part of sourceParts) {
      if (parts.length >= maxParts) break;
      if (part?.type === "text") {
        pushTextPart(parts, part.content, maxParts);
      } else if (part?.type === "emoji") {
        pushImagePart(parts, part, imageState, maxParts, maxImages);
      }
    }

    if (parts.length === 0) {
      pushTextPart(parts, event.text, maxParts);
    }

    if (enableParts && Array.isArray(event.imgUrls)) {
      for (const url of event.imgUrls) {
        if (parts.length >= maxParts || imageState.count >= maxImages) break;
        if (!url || imageState.urls.has(url)) continue;
        pushImagePart(parts, { type: "emoji", url, alt: "", isSticker: false }, imageState, maxParts, maxImages);
      }
    }

    const truncatedParts = truncateParts(parts);
    const shouldReverse = window.CONFIG?.TEXT_FLOW_MODE === "motion" && window.CONFIG?.WARP_MODE !== "inward";
    if (!shouldReverse) return truncatedParts;

    return truncatedParts
      .slice()
      .reverse()
      .map((part) => part.type === "text"
        ? { ...part, content: reverseText(part.content) }
        : { ...part });
  }

  function getPlainTextLength(parts) {
    return parts.reduce((sum, part) => {
      if (part.type === "text") return sum + String(part.content || "").length;
      return sum + 4;
    }, 0);
  }

  function spawn(event) {
    if (!event || typeof event !== "object") return;

    const text = String(event.text || "").trim();
    const parts = buildParts(event);
    if (parts.length === 0) return;

    const mode = window.CONFIG?.WARP_MODE === "inward" ? "inward" : "outward";
    const maxDistance = getMaxDistance();
    const speedMin = getConfigNumber("WARP_SPEED_MIN", 620);
    const speedMax = getConfigNumber("WARP_SPEED_MAX", 1280);
    const trailMin = getConfigNumber("TRAIL_LENGTH_MIN", 150);
    const trailMax = getConfigNumber("TRAIL_LENGTH_MAX", 520);
    const startMin = getConfigNumber("WARP_START_DISTANCE_MIN", 72);
    const startMax = getConfigNumber("WARP_START_DISTANCE_MAX", 140);
    const duration = Number(event.life) || getConfigNumber("EFFECT_DURATION", 1.8);
    const textFactor = clamp(getPlainTextLength(parts) / 28, 0, 1);
    const trailLength = randomRange(trailMin, trailMax) * lerp(0.75, 1.25, textFactor);

    const item = {
      type: "warp",
      text,
      parts,
      user: String(event.user || ""),
      color: resolveColor(event),
      angle: Number.isFinite(event.angle) ? event.angle : pickAngle(),
      distance: mode === "inward" ? maxDistance : randomRange(startMin, Math.max(startMin, startMax)),
      speed: randomRange(speedMin, speedMax),
      trailLength,
      age: 0,
      duration,
      maxDistance,
      mode,
      hasGift: !!event.hasGift,
      isSticky: !!event.isSticky,
      membership: !!event.membership,
      isOwner: !!event.isOwner,
      isModerator: !!event.isModerator,
      baseScale: Number(event.scale) || 1,
      intensity: Number(event.intensity) || 1
    };

    const baseFontSize = getConfigNumber("FONT_SIZE", 34);
    for (const part of item.parts) {
      if (part.type !== "emoji" || !part.url) continue;
      const ratio = part.isSticker
        ? getConfigNumber("STICKER_SIZE_RATIO", 1.45)
        : getConfigNumber("EMOJI_SIZE_RATIO", 1.15);
      ensureImageSprite(part.url, baseFontSize * ratio);
    }

    items.push(item);

    const max = getConfigNumber("MAX_ACTIVE", 48);
    while (items.length > max) items.shift();
  }

  function update(dt) {
    const globalIntensity = getConfigNumber("FX_INTENSITY", 1.0);

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const velocity = item.speed * item.intensity * globalIntensity;
      item.age += dt;
      item.distance += item.mode === "inward" ? -velocity * dt : velocity * dt;

      const outsideOutward = item.mode === "outward" && item.distance > item.maxDistance + item.trailLength;
      const outsideInward = item.mode === "inward" && item.distance < 0;
      if (item.age >= item.duration || outsideOutward || outsideInward) {
        items.splice(i, 1);
      }
    }
  }

  function getProgress(item) {
    if (item.mode === "inward") {
      return clamp(1 - item.distance / item.maxDistance, 0, 1);
    }
    return clamp(item.distance / item.maxDistance, 0, 1);
  }

  function getAlpha(item, progress) {
    const lifeProgress = clamp(item.age / item.duration, 0, 1);
    const fadeIn = clamp(lifeProgress / 0.12, 0, 1);
    const fadeOut = clamp((1 - lifeProgress) / 0.22, 0, 1);
    const centerFade = item.mode === "inward" ? clamp(item.distance / 160, 0, 1) : 1;
    const edgeFade = item.mode === "outward" ? clamp((1 - progress) / 0.16, 0, 1) : 1;
    return clamp(fadeIn * fadeOut * centerFade * edgeFade, 0, 1);
  }

  function getScale(item, progress) {
    if (!getConfigBoolean("PERSPECTIVE_SCALE", true)) return item.baseScale;

    if (item.mode === "inward") {
      return item.baseScale * lerp(1.75, 0.18, progress);
    }
    return item.baseScale * lerp(0.18, 1.85, progress);
  }

  function drawCore(center) {
    if (!getConfigBoolean("CORE_GLOW", true)) return;

    const radius = Math.max(28, Math.min(window.innerWidth, window.innerHeight) * 0.045);
    const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.68)");
    gradient.addColorStop(0.24, "rgba(130,220,255,0.32)");
    gradient.addColorStop(1, "rgba(80,180,255,0)");

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawTrail(item, x, y, alpha) {
    const dir = item.mode === "inward" ? 1 : -1;
    const coreClearRadius = getConfigNumber("CORE_CLEAR_RADIUS", 48);
    const visibleTrailLength = item.mode === "outward"
      ? Math.max(0, Math.min(item.trailLength, item.distance - coreClearRadius))
      : item.trailLength;
    if (visibleTrailLength <= 0) return;

    const tailX = dir * visibleTrailLength;
    const gradient = ctx.createLinearGradient(0, 0, tailX, 0);
    gradient.addColorStop(0, `rgba(${item.color.r},${item.color.g},${item.color.b},${0.42 * alpha})`);
    gradient.addColorStop(0.45, `rgba(${item.color.r},${item.color.g},${item.color.b},${0.18 * alpha})`);
    gradient.addColorStop(1, `rgba(${item.color.r},${item.color.g},${item.color.b},0)`);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(item.angle);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(3, getConfigNumber("FONT_SIZE", 34) * 0.14);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tailX, 0);
    ctx.stroke();
    ctx.restore();
  }

  function measureParts(parts, fontSize) {
    const baseFontSize = getConfigNumber("FONT_SIZE", 34);
    const displayScale = fontSize / baseFontSize;
    const gap = getConfigNumber("PART_GAP", 6);
    const emojiRatio = getConfigNumber("EMOJI_SIZE_RATIO", 1.15);
    const stickerRatio = getConfigNumber("STICKER_SIZE_RATIO", 1.45);
    let width = 0;
    let count = 0;

    for (const part of parts) {
      let partWidth = 0;
      if (part.type === "text") {
        partWidth = ctx.measureText(String(part.content || "")).width;
      } else if (part.type === "emoji") {
        const size = baseFontSize * (part.isSticker ? stickerRatio : emojiRatio);
        const sprite = part.url ? ensureImageSprite(part.url, size) : null;
        partWidth = sprite ? sprite.w * displayScale : (part.alt ? ctx.measureText(part.alt).width : size * displayScale);
      }

      if (partWidth <= 0) continue;
      width += partWidth;
      count += 1;
    }

    if (count > 1) width += gap * (count - 1);
    return width;
  }

  function drawPartsLine(item, x, y, alpha, scale) {
    const baseFontSize = getConfigNumber("FONT_SIZE", 34);
    const fontSize = Math.max(8, getConfigNumber("FONT_SIZE", 34) * scale);
    const displayScale = fontSize / baseFontSize;
    const stretch = getConfigNumber("TEXT_STRETCH", 1.12);
    const gap = getConfigNumber("PART_GAP", 6);
    const emojiRatio = getConfigNumber("EMOJI_SIZE_RATIO", 1.15);
    const stickerRatio = getConfigNumber("STICKER_SIZE_RATIO", 1.45);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(item.angle);
    ctx.scale(stretch, 1);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.globalAlpha = alpha;

    if (getConfigBoolean("GLOW", true)) {
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = item.color.css;
      ctx.shadowBlur = Math.max(8, fontSize * 0.55);
    }

    const totalWidth = measureParts(item.parts, fontSize);
    let cursorX = item.mode === "inward" ? -8 - totalWidth : 8;

    ctx.lineWidth = Math.max(2, fontSize * 0.12);
    ctx.strokeStyle = `rgba(6,16,26,${0.62 * alpha})`;
    ctx.fillStyle = item.color.css;

    for (const part of item.parts) {
      if (part.type === "text") {
        const content = String(part.content || "");
        if (!content) continue;

        ctx.strokeText(content, cursorX, 0);
        ctx.fillText(content, cursorX, 0);
        cursorX += ctx.measureText(content).width + gap;
      } else if (part.type === "emoji") {
        const size = baseFontSize * (part.isSticker ? stickerRatio : emojiRatio);
        const sprite = part.url ? ensureImageSprite(part.url, size) : null;

        if (sprite) {
          const drawW = sprite.w * displayScale;
          const drawH = sprite.h * displayScale;
          ctx.drawImage(sprite.canvas, cursorX, -drawH / 2, drawW, drawH);
          cursorX += drawW + gap;
        } else if (part.alt) {
          ctx.strokeText(part.alt, cursorX, 0);
          ctx.fillText(part.alt, cursorX, 0);
          cursorX += ctx.measureText(part.alt).width + gap;
        } else {
          cursorX += size * displayScale + gap;
        }
      }
    }

    ctx.restore();
  }

  function render() {
    const center = getCenter();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawCore(center);

    for (const item of items) {
      const progress = getProgress(item);
      const alpha = getAlpha(item, progress);
      if (alpha <= 0) continue;

      const x = center.x + Math.cos(item.angle) * item.distance;
      const y = center.y + Math.sin(item.angle) * item.distance;
      const scale = getScale(item, progress);

      drawTrail(item, x, y, alpha);
      drawPartsLine(item, x, y, alpha, scale);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
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
