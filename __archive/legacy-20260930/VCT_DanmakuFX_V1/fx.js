/**
 * VCT DanmakuFX V1 - fx.js
 * 絵文字/スタンプをCanvas2Dで軽量にランダム演出する。
 */
(function () {
  const canvas = document.getElementById("fx");
  const ctx = canvas?.getContext("2d", { alpha: true });

  if (!canvas || !ctx) {
    window.FX = { push: () => {}, clear: () => {}, reset: () => {} };
    return;
  }

  const items = [];
  const particles = [];
  const spriteCache = new Map();

  function cfgNum(key, fallback) {
    const value = Number(window.CONFIG?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function resolveDuration(event, effect) {
    if (effect === "burst") {
      return Math.max(0.2, cfgNum("BURST_DURATION", 1.4));
    }

    const fallback = Number(event.life) || cfgNum("EFFECT_DURATION", 3.2);
    const min = cfgNum("EFFECT_DURATION_MIN", fallback);
    const max = cfgNum("EFFECT_DURATION_MAX", fallback);
    const lo = Math.max(0.2, Math.min(min, max));
    const hi = Math.max(lo, Math.max(min, max));
    return rand(lo, hi);
  }

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
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

    const entry = { ready: false, canvas: null, w: 0, h: 0, failed: false };
    spriteCache.set(key, entry);

    const img = new Image();
    img.onload = () => {
      const h = Math.max(1, Math.floor(size * 1.25));
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

  function createBaseItem(event) {
    const size = cfgNum("BASE_SIZE_PX", 48) * rand(cfgNum("RANDOM_SIZE_MIN", 0.8), cfgNum("RANDOM_SIZE_MAX", 1.4));
    const effect = event.effect || "fall";
    const duration = resolveDuration(event, effect);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const item = {
      text: String(event.text || ""),
      imageUrl: String(event.imageUrl || ""),
      effect,
      x: rand(size, Math.max(size, w - size)),
      y: -size,
      vx: rand(-35, 35),
      vy: rand(90, 190),
      baseX: 0,
      age: 0,
      duration,
      size,
      scale: 1,
      rot: rand(-0.35, 0.35),
      vr: rand(-1.4, 1.4),
      wobbleAmp: rand(12, 42),
      wobbleFreq: rand(1.1, 2.4),
      color: event.color || { r: 255, g: 255, b: 255 },
      colorStr: event.colorStr || "rgb(255,255,255)",
      intensity: Number(event.intensity) || 1
    };

    if (effect === "float") {
      item.y = h + size;
      item.vy = -rand(70, 150);
      item.vx = rand(-30, 30);
    } else if (effect === "wave") {
      const leftToRight = Math.random() < 0.5;
      item.x = leftToRight ? -size : w + size;
      item.y = rand(h * 0.16, h * 0.84);
      item.vx = (leftToRight ? 1 : -1) * rand(90, 180);
      item.vy = rand(-12, 12);
    } else if (effect === "spin") {
      item.y = rand(-size, h * 0.35);
      item.vx = rand(-95, 95);
      item.vy = rand(80, 155);
      item.vr = rand(-4.5, 4.5);
    } else if (effect === "burst") {
      item.x = rand(w * 0.18, w * 0.82);
      item.y = rand(h * 0.2, h * 0.72);
      item.vx = rand(-35, 35);
      item.vy = rand(-55, 25);
      item.vr = rand(-3.2, 3.2);
    }

    item.baseX = item.x;
    return item;
  }

  function spawnParticles(item) {
    const count = Math.max(6, Math.floor(item.size / 3));
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * (i / count) + rand(-0.22, 0.22);
      const speed = rand(80, 280);
      particles.push({
        x: item.x,
        y: item.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.35, 0.8),
        age: 0,
        size: rand(1.5, 4.5),
        colorStr: item.colorStr
      });
    }

    const maxParticles = Math.max(40, Math.floor(cfgNum("MAX_PARTICLES", 260)));
    while (particles.length > maxParticles) particles.shift();
  }

  function push(event) {
    if (!event || typeof event !== "object") return;
    if (!event.text && !event.imageUrl) return;

    const item = createBaseItem(event);
    if (item.imageUrl) ensureImageSprite(item.imageUrl, item.size);
    items.push(item);
    if (item.effect === "burst") spawnParticles(item);

    const max = Math.max(1, Math.floor(cfgNum("MAX_ACTIVE", 24)));
    while (items.length > max) items.shift();
  }

  function update(dt) {
    const globalIntensity = cfgNum("FX_INTENSITY", 1.0);
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const intensity = globalIntensity * item.intensity;
      item.age += dt * intensity;

      if (item.effect === "fall" || item.effect === "float") {
        item.x = item.baseX + Math.sin(item.age * item.wobbleFreq * Math.PI * 2) * item.wobbleAmp;
      }

      if (item.effect === "wave") {
        item.y += Math.sin(item.age * item.wobbleFreq * Math.PI * 2) * 24 * dt;
      }

      item.x += item.vx * dt * intensity;
      item.y += item.vy * dt * intensity;
      item.rot += item.vr * dt * intensity;

      if (
        item.age >= item.duration ||
        item.x < -item.size * 3 ||
        item.x > w + item.size * 3 ||
        item.y < -item.size * 3 ||
        item.y > h + item.size * 3
      ) {
        items.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      if (p.age >= p.life) particles.splice(i, 1);
    }
  }

  function drawText(item, alpha) {
    if (!item.text) return;

    const fontSize = Math.max(12, item.size);
    ctx.font = `bold ${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(3, fontSize / 10);
    ctx.strokeStyle = "rgba(0,0,0,0.62)";
    ctx.fillStyle = item.colorStr;
    ctx.globalAlpha = alpha;
    ctx.strokeText(item.text, 0, 0);
    ctx.fillText(item.text, 0, 0);
  }

  function drawImage(item, alpha) {
    if (!item.imageUrl) return false;

    const sprite = ensureImageSprite(item.imageUrl, item.size);
    if (!sprite) return false;

    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
    return true;
  }

  function drawItem(item) {
    const progress = clamp01(item.age / item.duration);
    const fade = item.effect === "burst"
      ? Math.sin(progress * Math.PI)
      : clamp01(Math.min(progress * 4, (1 - progress) * 3));
    const burstScale = item.effect === "burst" ? 0.45 + progress * 1.35 : 1;

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rot);
    ctx.scale(item.scale * burstScale, item.scale * burstScale);

    const drewImage = drawImage(item, fade);
    if (!drewImage) drawText(item, fade);

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      const alpha = clamp01(1 - p.age / p.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.colorStr || "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const item of items) drawItem(item);
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
    push,
    clear: () => {
      items.length = 0;
      particles.length = 0;
    },
    reset: () => {
      items.length = 0;
      particles.length = 0;
    }
  };
})();
