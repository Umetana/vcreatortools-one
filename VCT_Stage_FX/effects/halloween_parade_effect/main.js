(function () {
// StageFXから移植。Stage契約・強度・1920x1080論理座標へ適合。
class HalloweenParadeEffect {
  static manifest = {
    stageApi: 1,
    lifecycle: 'effect',
    name: "ハロウィンパレード",
    description: "カボチャ、幽霊、コウモリなどが役割ごとの動きで登場するハロウィン演出です。",
    assetDisclosure: "ai-generated",
    settings: {
    HALLOWEEN_RENDER_MODE: { default: 'emoji', type: 'select', options: ['emoji', 'image'], labels: { emoji: '絵文字', image: 'AI生成画像' }, label: '表示素材' },
    HALLOWEEN_PATTERN: { default: 'parade', type: 'select', options: ['parade', 'ghostNight', 'batSwarm', 'candyRain', 'randomPop'], labels: { parade: 'パレード', ghostNight: 'ゴーストナイト', batSwarm: 'コウモリの群れ', candyRain: 'キャンディレイン', randomPop: 'ランダムポップ' }, label: '演出パターン' }
  }

  };

  constructor(context, params) {
    this.context = context;
    const strength = ({ small: .6, standard: 1, large: 1.45, extra: 2 })[params.intensity] || 1;
    this.params = { ...params,
      count: Math.min(60, Math.max(1, Math.round((params.count || 18) * strength))),
      minSize: Math.min(180, 48 * Math.sqrt(strength)), maxSize: Math.min(260, 104 * Math.sqrt(strength)),
      travelTimeMs: Math.min(10000, (params.duration || 3000) * Math.sqrt(strength)),
      motionPower: Math.min(1.2, .82 * Math.sqrt(strength)),
      renderMode: params.settings?.HALLOWEEN_RENDER_MODE || 'emoji',
      pattern: params.settings?.HALLOWEEN_PATTERN || 'parade'
    };
    this.root = context.root;
    this.running = false;
    this.branchWebUsed = false;
  }

  async start() {
    this.running = true;
    this.root.classList.add("fx-halloween-root");
    const count = this.clamp(Math.floor(Number(this.params.count)), 1, 60, 18);
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
      { opacity: 0, transform: "translate3d(0,-194.4px,0) rotate(0deg) scale(.7)" },
      { offset: .1, opacity: 1 },
      { offset: .78, opacity: 1, transform: `translate3d(${sway}px,885.6px,0) rotate(${turn}deg) scale(1)` },
      { offset: .88, opacity: 1, transform: `translate3d(${sway * .9}px,777.6px,0) rotate(${turn * 1.08}deg) scale(1.08)` },
      { opacity: 0, transform: `translate3d(${sway * 1.1}px,1209.6px,0) rotate(${turn * 1.25}deg) scale(.95)` }
    ], { duration, delay, easing: kind === "candy" ? "linear" : "cubic-bezier(.35,.05,.72,.9)", fill: "both" });
  }

  animateFloat(item, duration, delay, power) {
    const x = this.rand(4, 96);
    const drift = this.rand(-130, 130) * power;
    item.style.left = `${x}%`;
    this.context.animations.animate(item, [
      { opacity: 0, transform: "translate3d(0,1209.6px,0) rotate(-8deg) scale(.65)" },
      { offset: .12, opacity: 1 },
      { offset: .36, transform: `translate3d(${drift * .45}px,756.0px,0) rotate(8deg) scale(1)` },
      { offset: .68, opacity: 1, transform: `translate3d(${drift * -.25}px,345.6px,0) rotate(-6deg) scale(.94)` },
      { opacity: 0, transform: `translate3d(${drift}px,-194.4px,0) rotate(7deg) scale(.8)` }
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
      { opacity: 0, transform: `translate3d(${(start) * this.context.size.width / 100}px,0,0) scale(${facing},.65) rotate(-8deg)` },
      { offset: .08, opacity: 1 },
      { offset: .3, transform: `translate3d(${(start + (end - start) * .3) * this.context.size.width / 100}px,${(-wave) * this.context.size.height / 100}px,0) scale(${facing},1.12) rotate(7deg)` },
      { offset: .62, opacity: 1, transform: `translate3d(${(start + (end - start) * .62) * this.context.size.width / 100}px,${(wave * .55) * this.context.size.height / 100}px,0) scale(${facing},.82) rotate(-6deg)` },
      { opacity: 0, transform: `translate3d(${(end) * this.context.size.width / 100}px,${(-wave * .3) * this.context.size.height / 100}px,0) scale(${facing},1.05) rotate(5deg)` }
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

window.VCTStage.registry.register('halloween_parade_effect', HalloweenParadeEffect);

})();
