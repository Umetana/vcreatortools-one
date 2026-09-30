/**
 * Welcome Celebration V2 - fx.js
 * 全画面の歓迎カード、紙吹雪、キラキラを制御する。
 */
(function () {
  const canvas = document.getElementById("fx");
  const ctx = canvas?.getContext("2d");
  const overlay = document.getElementById("celebration");
  const card = overlay?.querySelector(".celebration-card");
  const avatar = overlay?.querySelector(".celebration-avatar");
  const avatarFallback = overlay?.querySelector(".celebration-avatar-fallback");
  const label = overlay?.querySelector(".celebration-label");
  const user = overlay?.querySelector(".celebration-user");
  const headline = overlay?.querySelector(".celebration-headline");
  const eventLabel = overlay?.querySelector(".celebration-event-label");
  const message = overlay?.querySelector(".celebration-message");

  if (!canvas || !ctx || !overlay || !card) {
    window.FX = { push: () => {}, clear: () => {}, reset: () => {} };
    return;
  }

  const queue = [];
  const particles = [];
  const sparkles = [];
  let current = null;
  let startedAt = 0;
  let last = performance.now();

  function configNumber(key, fallback) {
    const value = Number(window.CONFIG?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function configBool(key, fallback) {
    const value = window.CONFIG?.[key];
    return typeof value === "boolean" ? value : fallback;
  }

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function safeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function initials(name) {
    const text = safeText(name, "?").replace(/^@/, "");
    return Array.from(text).slice(0, 2).join("");
  }

  function setAvatar(url, name) {
    avatarFallback.textContent = initials(name);
    if (!url) {
      avatar.removeAttribute("src");
      avatar.classList.add("is-hidden");
      avatarFallback.classList.remove("is-hidden");
      return;
    }

    avatar.onload = () => {
      avatar.classList.remove("is-hidden");
      avatarFallback.classList.add("is-hidden");
    };
    avatar.onerror = () => {
      avatar.classList.add("is-hidden");
      avatarFallback.classList.remove("is-hidden");
    };
    avatar.src = url;
  }

  function particleColor(tone, index) {
    const join = ["#19d37b", "#f8f75a", "#ffffff", "#45d8ff", "#ff5ebc"];
    const milestone = ["#36b7ff", "#fff06a", "#ffffff", "#7cffc4", "#ff8ad8"];
    const firstTime = ["#45d8ff", "#ffffff", "#f8f75a", "#7cffc4", "#ff8ad8"];
    const colors = tone === "milestone" ? milestone : (tone === "first-time" ? firstTime : join);
    return colors[index % colors.length];
  }

  function burst(event) {
    const intensity = Number(event.intensity) || configNumber("FX_INTENSITY", 1);

    if (configBool("CONFETTI_ENABLED", true)) {
      const baseAmount = Number.isFinite(Number(event.confettiAmount))
        ? Number(event.confettiAmount)
        : configNumber("CONFETTI_AMOUNT", 150);
      const count = Math.round(baseAmount * intensity);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: window.innerWidth * (0.12 + Math.random() * 0.76),
          y: -30 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 520,
          vy: 260 + Math.random() * 520,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 9,
          w: 8 + Math.random() * 12,
          h: 5 + Math.random() * 10,
          age: 0,
          life: 2.6 + Math.random() * 1.4,
          color: particleColor(event.tone, i)
        });
      }
    }

    if (configBool("SPARKLES_ENABLED", true)) {
      const baseAmount = Number.isFinite(Number(event.sparkleAmount))
        ? Number(event.sparkleAmount)
        : configNumber("SPARKLE_AMOUNT", 80);
      const count = Math.round(baseAmount * intensity);
      for (let i = 0; i < count; i++) {
        sparkles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: 2 + Math.random() * 6,
          age: 0,
          life: 0.7 + Math.random() * 1.4,
          delay: Math.random() * 0.8,
          color: particleColor(event.tone, i + 2)
        });
      }
    }
  }

  function show(event) {
    current = event;
    startedAt = performance.now();
    particles.length = 0;
    sparkles.length = 0;

    overlay.className = `celebration is-active tone-${event.tone || "join"}`;
    const cardScale = Number.isFinite(Number(event.cardScale))
      ? Number(event.cardScale)
      : configNumber("CARD_SCALE", 1);
    card.style.setProperty("--card-scale", String(cardScale));
    label.textContent = safeText(event.label, "NEW MEMBER");
    user.textContent = safeText(event.user, "Anonymous");
    headline.textContent = safeText(event.headline, "WELCOME!");
    eventLabel.textContent = safeText(event.eventLabel, event.label);
    message.textContent = safeText(event.message, "ようこそ");
    setAvatar(event.iconUrl, event.user);

    card.classList.remove("is-playing");
    void card.offsetWidth;
    card.classList.add("is-playing");
    burst(event);
  }

  function finishCurrent() {
    overlay.classList.remove("is-active");
    card.classList.remove("is-playing");
    current = null;
    startedAt = 0;
  }

  function playNext() {
    if (current || queue.length === 0) return;
    show(queue.shift());
  }

  function push(event) {
    if (!event || event.type !== "welcome-celebration") return;

    if (event.kind === "first_time" && Number.isFinite(Number(event.maxQueue))) {
      const maxSameKind = Math.max(0, Number(event.maxQueue));
      const sameKindCount = queue.filter((item) => item?.kind === event.kind).length
        + (current?.kind === event.kind ? 1 : 0);
      if (sameKindCount >= maxSameKind) return;
    }

    const maxQueue = Math.max(1, configNumber("MAX_QUEUE", 8));
    queue.push(event);
    while (queue.length > maxQueue) queue.shift();
    playNext();
  }

  function updateParticles(dt) {
    const gravity = 520;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.age > p.life || p.y > window.innerHeight + 120) particles.splice(i, 1);
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.age += dt;
      if (s.age > s.life + s.delay) sparkles.splice(i, 1);
    }
  }

  function drawSparkle(s) {
    const localAge = s.age - s.delay;
    if (localAge < 0) return;
    const progress = Math.min(1, localAge / s.life);
    const alpha = Math.sin(progress * Math.PI);
    const r = s.r * (0.5 + progress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - r, s.y);
    ctx.lineTo(s.x + r, s.y);
    ctx.moveTo(s.x, s.y - r);
    ctx.lineTo(s.x, s.y + r);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticle(p) {
    const alpha = Math.max(0, 1 - p.age / p.life);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    sparkles.forEach(drawSparkle);
    particles.forEach(drawParticle);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (current) {
      const elapsed = (now - startedAt) / 1000;
      const duration = Number(current.life) || configNumber("DISPLAY_DURATION", 5);
      if (elapsed >= duration) finishCurrent();
    }

    updateParticles(dt);
    render();
    playNext();
    requestAnimationFrame(loop);
  }

  function clear() {
    queue.length = 0;
    particles.length = 0;
    sparkles.length = 0;
    finishCurrent();
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);

  window.FX = {
    push,
    clear,
    reset: clear
  };
})();
