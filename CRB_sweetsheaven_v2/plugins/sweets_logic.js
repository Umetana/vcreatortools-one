/**
 * Sweets Heaven Logic Plugin
 * Generates one shared sweets event per comment and accumulates calories.
 */
(function () {
  if (!window.ENGINE) return;

  const STORAGE_KEY = "comment_sweets_totalCalories";
  const UI_DISPLAY_MODES = new Set(["full", "top_only", "bottom_only", "effect_only"]);
  let activePluginState = null;
  let boundToggleKey = null;
  let keyListenerAttached = false;

  function getConfig() {
    return window.CONFIG_SWEETS || {};
  }

  function normalizeUiDisplayMode(value) {
    const mode = String(value || "full").trim().toLowerCase();
    return UI_DISPLAY_MODES.has(mode) ? mode : "full";
  }

  function resolveUiToggleSequence() {
    const fallback = ["full", "effect_only"];
    const configured = Array.isArray(getConfig().UI_TOGGLE_SEQUENCE)
      ? getConfig().UI_TOGGLE_SEQUENCE
      : fallback;
    const normalized = configured
      .map((mode) => normalizeUiDisplayMode(mode))
      .filter((mode, index, list) => list.indexOf(mode) === index);
    return normalized.length > 0 ? normalized : fallback;
  }

  function isUiPartVisible(mode, part) {
    if (mode === "effect_only") return false;
    if (mode === "top_only") return part === "top";
    if (mode === "bottom_only") return part === "bottom";
    return true;
  }

  function applyUiDisplayMode(mode) {
    const normalizedMode = normalizeUiDisplayMode(mode);
    const top = document.getElementById("ui-top");
    const bottom = document.getElementById("ui-bottom");

    if (top) {
      top.style.display = isUiPartVisible(normalizedMode, "top") ? "flex" : "none";
    }

    if (bottom) {
      bottom.style.display = isUiPartVisible(normalizedMode, "bottom") ? "block" : "none";
    }

    document.body?.setAttribute("data-sweets-ui-mode", normalizedMode);
    return normalizedMode;
  }

  function cycleUiDisplayMode() {
    if (!activePluginState) return;
    const sequence = resolveUiToggleSequence();
    if (sequence.length <= 1) return;

    const current = normalizeUiDisplayMode(
      activePluginState.uiDisplayMode || getConfig().UI_DISPLAY_MODE
    );
    const currentIndex = sequence.indexOf(current);
    const nextMode = sequence[(currentIndex + 1) % sequence.length];
    activePluginState.uiDisplayMode = applyUiDisplayMode(nextMode);
  }

  function ensureUiToggleKeyBinding() {
    const nextKey = String(getConfig().UI_TOGGLE_KEY || "").trim().toLowerCase();
    if (!nextKey || (keyListenerAttached && nextKey === boundToggleKey)) return;

    if (!keyListenerAttached) {
      window.addEventListener("keydown", (event) => {
        if (!boundToggleKey || event.repeat) return;
        if (String(event.key || "").trim().toLowerCase() !== boundToggleKey) return;

        const tagName = String(event.target?.tagName || "").toUpperCase();
        if (tagName === "INPUT" || tagName === "TEXTAREA" || event.target?.isContentEditable) return;

        cycleUiDisplayMode();
      });
      keyListenerAttached = true;
    }

    boundToggleKey = nextKey;
  }

  function pickRandomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickIntRange(min, max) {
    return Math.floor(pickRandomRange(min, max + 1));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatCalories(value) {
    const suffix = getConfig().CALORIE_TEXT_SUFFIX || "kcal";
    return `${Math.round(value).toLocaleString()} ${suffix}`;
  }

  function getGaugePhaseColors() {
    const palette = getConfig().GAUGE_PHASE_COLORS;
    return Array.isArray(palette) && palette.length > 0
      ? palette
      : ["#ff8fd7"];
  }

  function getGaugeCycleCalories() {
    return Math.max(1, Number(getConfig().GAUGE_CYCLE_CALORIES ?? 100000));
  }

  function getRainbowMilestoneCalories() {
    return Math.max(1, Number(getConfig().RAINBOW_MILESTONE_CALORIES ?? 1000000));
  }

  function getRainbowDurationMs() {
    return Math.max(0, Number(getConfig().RAINBOW_DURATION_MS ?? 8000));
  }

  function getGaugePhaseIndex(totalCalories) {
    const cycle = getGaugeCycleCalories();
    const total = Math.max(0, Number(totalCalories || 0));
    return Math.floor(total / cycle);
  }

  function hexToRgb(hex) {
    const normalized = String(hex || "").replace("#", "").trim();
    const full = normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
      return { r: 255, g: 143, b: 215 };
    }

    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }

  function mixRgb(a, b, amount) {
    const t = clamp(amount, 0, 1);
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  function rgbToCss(rgb, alpha = null) {
    if (alpha === null) return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function applyGaugeTheme(totalCalories) {
    const root = document.documentElement;
    if (!root) return;

    const palette = getGaugePhaseColors();
    const phaseIndex = getGaugePhaseIndex(totalCalories) % palette.length;
    const base = hexToRgb(palette[phaseIndex]);
    const white = { r: 255, g: 255, b: 255 };
    const deep = { r: 86, g: 32, b: 130 };

    const start = mixRgb(base, white, 0.42);
    const mid = mixRgb(base, white, 0.14);
    const end = mixRgb(base, deep, 0.26);

    root.style.setProperty("--sweets-gauge-start", rgbToCss(start));
    root.style.setProperty("--sweets-gauge-mid", rgbToCss(mid));
    root.style.setProperty("--sweets-gauge-end", rgbToCss(end));
    root.style.setProperty("--sweets-gauge-lag-start", rgbToCss(mixRgb(base, white, 0.48), 0.55));
    root.style.setProperty("--sweets-gauge-lag-mid", rgbToCss(mixRgb(base, white, 0.18), 0.40));
    root.style.setProperty("--sweets-gauge-lag-end", rgbToCss(mixRgb(base, deep, 0.14), 0.22));
    root.style.setProperty("--sweets-gauge-glow-strong", rgbToCss(mixRgb(base, white, 0.12), 0.42));
    root.style.setProperty("--sweets-gauge-glow-soft", rgbToCss(mixRgb(base, deep, 0.08), 0.20));
  }

  function syncRainbowState(state, now) {
    const panel = document.getElementById("boss-panel");
    if (!panel) return;
    if ((state.rainbowUntil || 0) > now) panel.classList.add("sweets-rainbow");
    else panel.classList.remove("sweets-rainbow");
  }

  function computeProgress(totalCalories) {
    const cycle = getGaugeCycleCalories();
    const total = Math.max(0, Number(totalCalories || 0));
    const withinCycle = total % cycle;
    if (total > 0 && withinCycle === 0) return 1;
    return withinCycle / cycle;
  }

  function getCommentText(commentData) {
    return String(commentData?.message?.text || "");
  }

  function getDisplayName(commentData) {
    return commentData?.user?.displayName || commentData?.user?.name || "Anonymous";
  }

  function isSupportComment(commentData) {
    return !!(commentData?.event?.isSupport && !commentData?.membership?.isGiftReceiver);
  }

  function resolveGiftAmount(commentData) {
    if (!isSupportComment(commentData)) return 0;
    if (typeof window.ENGINE?.extractGiftPrice === "function") {
      return Number(window.ENGINE.extractGiftPrice(commentData) || 0);
    }
    return Number(commentData?.monetization?.money?.amount || 0);
  }

  function resolveGiftTier(giftAmount) {
    if (!giftAmount || giftAmount <= 0) return "small";
    if (giftAmount >= 10000) return "premium";
    if (giftAmount >= 5000) return "large";
    if (giftAmount >= 1000) return "medium";
    return "small";
  }

  function ensureUiStatusState(state) {
    state.ui = state.ui || {};
    state.ui.status = state.ui.status || {
      title: getConfig().UI_TITLE || "SWEETS HEAVEN",
      label: getConfig().UI_LABEL || "TOTAL CALORIES",
      progress: computeProgress(state.totalCalories || 0),
      text: formatCalories(state.displayCalories || 0),
      color: null
    };
    return state.ui.status;
  }

  function getSpawnProfile(commentData, cfg) {
    const defaultTiers = cfg.GIFT_TIERS || {};
    if (!isSupportComment(commentData)) {
      return { tier: "normal", ...(defaultTiers.normal || { multiplierMin: 1, multiplierMax: 1, spawnMin: 1, spawnMax: 1 }) };
    }

    const giftAmount = resolveGiftAmount(commentData);
    const tier = resolveGiftTier(giftAmount);
    return {
      tier,
      ...(defaultTiers[tier] || defaultTiers.small || { multiplierMin: 1.5, multiplierMax: 1.5, spawnMin: 2, spawnMax: 4 })
    };
  }

  function weightedSweetPick(commentText) {
    const master = Array.isArray(window.SWEETS_MASTER) ? window.SWEETS_MASTER : [];
    if (master.length === 0) {
      return { id: "donut", name: "ドーナツ", emoji: "🍩", baseKcal: 320, variance: 0.3 };
    }

    const weights = master.map((sweet) => {
      const weight = Number(sweet?.spawnWeight ?? 1);
      return Number.isFinite(weight) ? Math.max(0.05, weight) : 1;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < master.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return master[i];
    }
    return master[master.length - 1];
  }

  function calculateKcalPerSweet(sweet, commentText, multiplier) {
    const variance = Number(sweet.variance || 0);
    const base = Number(sweet.baseKcal || 0);
    const min = base * (1 - variance);
    const max = base * (1 + variance);
    const randomBase = pickRandomRange(min, max);
    const lengthBonus = Math.min(String(commentText || "").length * 5, 120);
    return Math.max(1, Math.round((randomBase + lengthBonus) * multiplier));
  }

  function resolveSweetImageSrc(sweet) {
    const file = String(sweet?.imageFile || "").trim();
    if (!file) return "";
    if (/^(?:https?:)?\/\//.test(file) || file.startsWith("./") || file.startsWith("../") || file.startsWith("/")) {
      return file;
    }
    return `./assets/food/${file}`;
  }

  const SweetsLogicPlugin = {
    name: "SweetsLogic",
    manifest: "./plugins/plugin_manifest.js",

    onInit(ctx, state) {
      activePluginState = state;
      const baseCfg = window.CONFIG || {};
      if (baseCfg.RESET_PROGRESS === true) {
        localStorage.removeItem(STORAGE_KEY);
      }

      let totalCalories = 0;
      if (baseCfg.SAVE_PROGRESS !== false) {
        totalCalories = Number(localStorage.getItem(STORAGE_KEY) || 0);
      }

      state.level = 1;
      state.totalCalories = Number.isFinite(totalCalories) ? totalCalories : 0;
      state.displayCalories = state.totalCalories;
      state.rainbowUntil = 0;
      state.lastRainbowMilestone = Math.floor(state.totalCalories / getRainbowMilestoneCalories());
      state.uiDisplayMode = applyUiDisplayMode(getConfig().UI_DISPLAY_MODE);
      const uiStatus = ensureUiStatusState(state);
      uiStatus.title = getConfig().UI_TITLE || "SWEETS HEAVEN";
      uiStatus.label = getConfig().UI_LABEL || "TOTAL CALORIES";
      uiStatus.progress = computeProgress(state.totalCalories);
      uiStatus.text = formatCalories(state.displayCalories);
      ensureUiToggleKeyBinding();
      applyGaugeTheme(state.totalCalories);
      syncRainbowState(state, performance.now());
    },

    onUpdate(ctx, state) {
      const cfg = getConfig();
      const target = Number(state.totalCalories || 0);
      const current = Number(state.displayCalories || 0);
      const lerp = clamp(Number(cfg.COUNTUP_LERP ?? 0.12), 0.01, 1);

      activePluginState = state;
      if (Math.abs(target - current) < 0.5) {
        state.displayCalories = target;
      } else {
        state.displayCalories = current + (target - current) * lerp;
      }

      state.uiDisplayMode = applyUiDisplayMode(state.uiDisplayMode || cfg.UI_DISPLAY_MODE);
      ensureUiToggleKeyBinding();
      const uiStatus = ensureUiStatusState(state);
      uiStatus.title = cfg.UI_TITLE || "SWEETS HEAVEN";
      uiStatus.label = cfg.UI_LABEL || "TOTAL CALORIES";
      uiStatus.progress = computeProgress(target);
      uiStatus.text = formatCalories(state.displayCalories);
      applyGaugeTheme(target);
      syncRainbowState(state, ctx?.now || performance.now());
    },

    afterCalculateDamage(ctx, state) {
      if (ctx.isBossAction) return;

      const cfg = getConfig();
      const commentText = getCommentText(ctx.commentData);
      const userName = getDisplayName(ctx.commentData);
      const sweet = weightedSweetPick(commentText);
      const spawnProfile = getSpawnProfile(ctx.commentData, cfg);
      const multiplier = pickRandomRange(spawnProfile.multiplierMin, spawnProfile.multiplierMax);
      const spawnCount = pickIntRange(spawnProfile.spawnMin, spawnProfile.spawnMax);
      const kcal = calculateKcalPerSweet(sweet, commentText, multiplier);
      const totalGain = kcal * spawnCount;

      const previousTotal = Number(state.totalCalories || 0);
      state.totalCalories = previousTotal + totalGain;

      const milestoneCalories = getRainbowMilestoneCalories();
      const previousMilestone = Math.floor(previousTotal / milestoneCalories);
      const currentMilestone = Math.floor(state.totalCalories / milestoneCalories);
      if (currentMilestone > previousMilestone) {
        state.lastRainbowMilestone = currentMilestone;
        state.rainbowUntil = ctx.now + getRainbowDurationMs();
      }

      const event = {
        type: "sweets",
        motion: "sweets_fall",
        userName,
        sweetId: sweet.id,
        sweetName: sweet.name,
        emoji: sweet.emoji,
        imageSrc: resolveSweetImageSrc(sweet),
        kcal,
        isGift: isSupportComment(ctx.commentData),
        giftAmount: resolveGiftAmount(ctx.commentData),
        spawnCount,
        totalGain
      };

      if ((cfg.LOG_FORMAT || "battle_1line") === "battle_1line") {
        const giftSuffix = event.isGift && cfg.GIFT_LOG_SUFFIX
          ? ` ${cfg.GIFT_LOG_SUFFIX}`
          : "";
        event.log = `${userName} のコメントが ${sweet.name} に変化！${giftSuffix}`;
      }

      ctx.events.push(event);
    },

    afterComment(ctx, state) {
      if (window.CONFIG?.SAVE_PROGRESS === false) return;
      localStorage.setItem(STORAGE_KEY, String(Math.round(state.totalCalories || 0)));
    }
  };

  window.ENGINE.use(SweetsLogicPlugin);
  console.log("[SweetsPlugin] SweetsLogic registered.");
})();
