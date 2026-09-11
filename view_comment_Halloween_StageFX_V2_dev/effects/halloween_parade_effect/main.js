class HalloweenParadeEffect {
  static manifest = {
    apiVersion: 2,
    name: "ハロウィンパレード",
    description: "カボチャ、幽霊、コウモリなどが役割ごとの動きで登場するハロウィン演出です。",
    assetDisclosure: "ai-generated",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "renderMode", label: "表示素材", type: "select", default: "emoji", options: [
        { label: "絵文字", value: "emoji" },
        { label: "AI生成画像", value: "image" }
      ]},
      { name: "pattern", label: "演出パターン", type: "select", default: "parade", options: [
        { label: "ハロウィンパレード", value: "parade" },
        { label: "ゴーストナイト", value: "ghostNight" },
        { label: "コウモリの群れ", value: "batSwarm" },
        { label: "キャンディレイン", value: "candyRain" },
        { label: "ランダムポップ", value: "randomPop" }
      ]},
      { name: "count", label: "表示数", type: "number", default: 32, min: 1, max: 120, step: 1 },
      { name: "minSize", label: "最小サイズ(px)", type: "number", default: 128, min: 16, max: 180, step: 2 },
      { name: "maxSize", label: "最大サイズ(px)", type: "number", default: 256, min: 16, max: 260, step: 2 },
      { name: "travelTimeMs", label: "移動時間(ms)", type: "number", default: 3800, min: 800, max: 12000, step: 100 },
      { name: "motionPower", label: "動きの強さ", type: "number", default: 1, min: .3, max: 2, step: .1 }
    ]
  };

  constructor(context, params) {
    this.context = context;
    this.params = params;
    this.root = context.root;
    this.running = false;
    this.branchWebUsed = false;
  }

  async start() {
    this.running = true;
    this.root.className = "fx-halloween-root";
    const count = this.clamp(Math.floor(Number(this.params.count)), 1, 120, 32);
    const travel = this.clamp(this.params.travelTimeMs, 800, 12000, 3800);
    const duration = Math.max(800, Number(this.params.duration || 4500));
    const pattern = this.pattern(this.params.pattern);
    const spread = pattern === "batSwarm" ? Math.min(duration * .42, 1500) : Math.min(duration * .62, 2400);

    const entries = [];
    for (let i = 0; i < count; i++) {
      const kind = this.pickKind(pattern);
      const delay = count === 1 ? 0 : (i / count) * spread + this.rand(0, 160);
      const item = this.createItem(kind, pattern);
      entries.push({ item, kind, delay, duration: travel * this.rand(.82, 1.18) });
    }

    const images = entries.map((entry) => entry.item).filter((item) => item.tagName === "IMG");
    if (images.length > 0) {
      const ready = await Promise.all(images.map((image) => this.context.assets.ready(image)));
      if (!this.running) return;
      if (ready.some((value) => !value)) {
        this.context.logger.warn("ハロウィンパレードの画像素材を読み込めませんでした。");
        this.context.complete();
        return;
      }
    }

    entries.forEach(({ item, kind, duration: itemDuration, delay }) => {
      this.animateItem(item, kind, pattern, itemDuration, delay);
    });

    this.context.timers.setTimeout(
      () => this.context.complete(),
      Math.max(duration, travel * 1.18 + spread) + 100
    );
  }

  pattern(value) {
    return ["parade", "ghostNight", "batSwarm", "candyRain", "randomPop"].includes(value)
      ? value
      : "parade";
  }

  pickKind(pattern) {
    const sets = {
      parade: ["pumpkin", "ghost", "bat", "skull", "candy", "candle", "web", "potion"],
      ghostNight: ["ghost", "ghost", "ghost", "candle", "potion", "web"],
      batSwarm: ["bat"],
      candyRain: ["candy", "candy", "candy", "pumpkin", "skull"],
      randomPop: ["pumpkin", "ghost", "bat", "skull", "candy", "candle", "web", "potion"]
    };
    const choices = sets[pattern] || sets.parade;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  createItem(kind, pattern) {
    const symbols = {
      pumpkin: "🎃", ghost: "👻", bat: "🦇", skull: "💀",
      candy: "🍬", candle: "🕯️", web: "🕸️", potion: "🧪"
    };
    const imageMode = this.params.renderMode === "image";
    const item = document.createElement(imageMode ? "img" : "span");
    item.className = `fx-halloween-item is-${kind}`;
    const min = this.clamp(this.params.minSize, 16, 180, 128);
    const max = Math.max(min, this.clamp(this.params.maxSize, 16, 260, 256));
    const size = this.rand(min, max);
    if (imageMode) {
      const branchWeb = kind === "web" && pattern === "ghostNight" && !this.branchWebUsed;
      if (branchWeb) this.branchWebUsed = true;
      const fileName = kind === "web" ? (branchWeb ? "web_01.png" : "web_02.png") : `${kind}.png`;
      item.src = this.context.assets.url(`assets/${fileName}`);
      item.alt = "";
      item.style.width = `${branchWeb ? size * 1.35 : size}px`;
      if (branchWeb) item.classList.add("is-branch-web");
    } else {
      item.textContent = symbols[kind];
      item.style.fontSize = `${size}px`;
    }
    this.root.appendChild(item);
    return item;
  }

  animateItem(item, kind, pattern, duration, delay) {
    const power = this.clamp(this.params.motionPower, .3, 2, 1);
    if (pattern === "randomPop") return this.animatePop(item, duration, delay, power);
    if (kind === "bat") return this.animateBat(item, duration, delay, power);
    if (kind === "ghost" || kind === "candle" || kind === "potion") {
      return this.animateFloat(item, duration, delay, power);
    }
    if (kind === "web") return this.animateWeb(item, duration, delay);
    return this.animateFall(item, kind, duration, delay, power);
  }

  animateFall(item, kind, duration, delay, power) {
    const x = this.rand(3, 97);
    const sway = this.rand(-110, 110) * power;
    const turn = this.rand(-300, 300) * power;
    item.style.left = `${x}%`;
    this.context.animations.animate(item, [
      { opacity: 0, transform: "translate3d(0,-18vh,0) rotate(0deg) scale(.7)" },
      { offset: .1, opacity: 1 },
      { offset: .78, opacity: 1, transform: `translate3d(${sway}px,82vh,0) rotate(${turn}deg) scale(1)` },
      { offset: .88, opacity: 1, transform: `translate3d(${sway * .9}px,72vh,0) rotate(${turn * 1.08}deg) scale(1.08)` },
      { opacity: 0, transform: `translate3d(${sway * 1.1}px,112vh,0) rotate(${turn * 1.25}deg) scale(.95)` }
    ], { duration, delay, easing: kind === "candy" ? "linear" : "cubic-bezier(.35,.05,.72,.9)", fill: "both" });
  }

  animateFloat(item, duration, delay, power) {
    const x = this.rand(4, 96);
    const drift = this.rand(-130, 130) * power;
    item.style.left = `${x}%`;
    this.context.animations.animate(item, [
      { opacity: 0, transform: "translate3d(0,112vh,0) rotate(-8deg) scale(.65)" },
      { offset: .12, opacity: 1 },
      { offset: .36, transform: `translate3d(${drift * .45}px,70vh,0) rotate(8deg) scale(1)` },
      { offset: .68, opacity: 1, transform: `translate3d(${drift * -.25}px,32vh,0) rotate(-6deg) scale(.94)` },
      { opacity: 0, transform: `translate3d(${drift}px,-18vh,0) rotate(7deg) scale(.8)` }
    ], { duration, delay, easing: "ease-in-out", fill: "both" });
  }

  animateBat(item, duration, delay, power) {
    const fromLeft = Math.random() < .5;
    const y = this.rand(8, 72);
    const start = fromLeft ? -14 : 114;
    const end = fromLeft ? 114 : -14;
    const wave = this.rand(8, 24) * power;
    const facing = fromLeft ? 1 : -1;
    item.style.left = "0";
    item.style.top = `${y}%`;
    this.context.animations.animate(item, [
      { opacity: 0, transform: `translate3d(${start}vw,0,0) scale(${facing},.65) rotate(-8deg)` },
      { offset: .08, opacity: 1 },
      { offset: .3, transform: `translate3d(${start + (end - start) * .3}vw,${-wave}vh,0) scale(${facing},1.12) rotate(7deg)` },
      { offset: .62, opacity: 1, transform: `translate3d(${start + (end - start) * .62}vw,${wave * .55}vh,0) scale(${facing},.82) rotate(-6deg)` },
      { opacity: 0, transform: `translate3d(${end}vw,${-wave * .3}vh,0) scale(${facing},1.05) rotate(5deg)` }
    ], { duration, delay, easing: "linear", fill: "both" });
  }

  animateWeb(item, duration, delay) {
    const left = Math.random() < .5;
    const top = Math.random() < .5;
    item.style.left = left ? "1%" : "auto";
    item.style.right = left ? "auto" : "1%";
    item.style.top = top ? "1%" : "auto";
    item.style.bottom = top ? "auto" : "1%";
    this.context.animations.animate(item, [
      { opacity: 0, transform: "scale(.15) rotate(-16deg)" },
      { offset: .22, opacity: .9, transform: "scale(1.08) rotate(2deg)" },
      { offset: .72, opacity: .82, transform: "scale(1) rotate(0deg)" },
      { opacity: 0, transform: "scale(1.16) rotate(4deg)" }
    ], { duration, delay, easing: "ease-out", fill: "both" });
  }

  animatePop(item, duration, delay, power) {
    item.style.left = `${this.rand(6, 94)}%`;
    item.style.top = `${this.rand(8, 88)}%`;
    const rotation = this.rand(-22, 22) * power;
    const popDuration = Math.max(650, duration * this.rand(.35, .58));
    this.context.animations.animate(item, [
      { opacity: 0, transform: `translate(-50%,-50%) scale(.1) rotate(${-rotation}deg)` },
      { offset: .22, opacity: 1, transform: `translate(-50%,-50%) scale(1.24) rotate(${rotation}deg)` },
      { offset: .45, opacity: 1, transform: "translate(-50%,-50%) scale(1) rotate(0deg)" },
      { offset: .78, opacity: 1, transform: `translate(-50%,-50%) scale(1.08) rotate(${-rotation * .35}deg)` },
      { opacity: 0, transform: "translate(-50%,-50%) scale(.45) rotate(0deg)" }
    ], { duration: popDuration, delay, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" });
  }

  clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  rand(min, max) { return min + Math.random() * (max - min); }
  destroy() { this.running = false; this.root = null; }
}

window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
window.REGISTERED_EFFECTS.halloween_parade_effect = HalloweenParadeEffect;
