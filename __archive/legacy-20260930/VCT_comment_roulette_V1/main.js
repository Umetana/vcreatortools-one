const { createApp, ref, reactive, computed, onMounted, onBeforeUnmount } = window.Vue || Vue;

createApp({
  setup() {
    const C = reactive({ ...(window.CONFIG || {}) });
    const appliedConfig = { ...(window.CONFIG || {}) };
    const phase = ref("idle");
    const targetName = ref("");
    const themeTitle = ref("");
    const slots = ref([]);
    const selectedIndex = ref(-1);
    const winnerIndex = ref(-1);
    const resultText = ref("");
    const history = ref([]);
    const seenCommentIds = new Set();
    const pathParts = String(window.location?.pathname || "").split("/").filter(Boolean);
    const templateId = decodeURIComponent(pathParts[pathParts.length - 2] || "vct-comment-roulette-v1")
      .replace(/[^a-z0-9._-]+/gi, "_")
      .toLowerCase();
    const historyStorageKey = `vct.comment-roulette.history.${templateId}.v1`;
    let running = false;
    let lastAutoTriggerAt = 0;
    let disposed = false;

    const isActive = computed(() => phase.value !== "idle");
    const commandGuide = computed(() => {
      const commands = parseCommands(C.TRIGGER_COMMANDS);
      return commands.length ? `${commands[0]} とコメントすると抽選スタート` : "抽選コマンドを設定してください";
    });

    const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomItem = items => items[Math.floor(Math.random() * items.length)];

    function parseCommands(value) {
      const source = Array.isArray(value) ? value : String(value || "").split(",");
      return source.map(item => String(item).trim().toLocaleLowerCase()).filter(Boolean);
    }

    function shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    function buildSlots(items, count) {
      const source = items.map(item => String(item).trim()).filter(Boolean);
      if (!source.length) return [];

      const result = [];
      while (result.length < count) {
        const batch = shuffle(source);
        result.push(...batch.slice(0, count - result.length));
      }
      return result;
    }

    function getDictionaryEntries() {
      return Object.entries(window.ROULETTE_DICTIONARIES || {}).filter(([, dictionary]) => {
        return dictionary && dictionary.title && Array.isArray(dictionary.items) && dictionary.items.length;
      });
    }

    function applyStyle() {
      const root = document.documentElement;
      root.style.setProperty("--font-family", C.FONT_FAMILY || "sans-serif");
      root.style.setProperty("--accent", C.ACCENT_COLOR || "#ffd54a");
      root.style.setProperty("--secondary", C.SECONDARY_COLOR || "#ff5c8a");
      root.style.setProperty("--panel-bg", C.PANEL_BG || "rgba(12, 16, 30, 0.88)");
      root.style.setProperty("--text", C.TEXT_COLOR || "#ffffff");
    }

    function getHistoryMax() {
      return Math.max(1, Number(C.HISTORY_MAX) || 8);
    }

    function normalizeHistoryEntry(entry) {
      if (!entry || typeof entry !== "object") return null;
      const name = String(entry.name || "").trim();
      const theme = String(entry.theme || "").trim();
      const result = String(entry.result || "").trim();
      if (!name || !theme || !result) return null;

      return {
        id: String(entry.id || `${Date.now()}:${Math.random()}`),
        name,
        theme,
        result
      };
    }

    function saveHistory() {
      const entries = history.value.slice(0, getHistoryMax());
      history.value = entries;
      try {
        if (entries.length) {
          window.localStorage.setItem(historyStorageKey, JSON.stringify(entries));
        } else {
          window.localStorage.removeItem(historyStorageKey);
        }
      } catch (error) {
        console.warn("[Comment Roulette] History save failed.", error);
      }
    }

    function restoreHistory() {
      try {
        const raw = window.localStorage.getItem(historyStorageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          clearHistory();
          return;
        }
        history.value = parsed.map(normalizeHistoryEntry).filter(Boolean).slice(0, getHistoryMax());
        saveHistory();
      } catch (error) {
        console.warn("[Comment Roulette] History restore failed.", error);
        clearHistory();
      }
    }

    function clearHistory() {
      history.value = [];
      try {
        window.localStorage.removeItem(historyStorageKey);
      } catch (error) {
        console.warn("[Comment Roulette] History clear failed.", error);
      }
    }

    function normalizeComment(raw) {
      if (!window.VCT) return null;

      if (typeof VCT.parseStructured === "function") {
        const parsed = VCT.parseStructured(raw);
        return {
          id: parsed.id || raw?.id || `${Date.now()}:${Math.random()}`,
          name: parsed.user?.displayName || parsed.user?.name || "Anonymous",
          text: parsed.message?.text || parsed.message?.command?.fullText || "",
          eventKind: parsed.event?.kind || "normal"
        };
      }

      const parsed = VCT.parse(raw);
      return {
        id: parsed.id || raw?.id || `${Date.now()}:${Math.random()}`,
        name: parsed.user || "Anonymous",
        text: parsed.text || "",
        eventKind: "normal"
      };
    }

    function rememberComment(id) {
      if (!id || seenCommentIds.has(id)) return false;
      seenCommentIds.add(id);
      if (seenCommentIds.size > 500) {
        seenCommentIds.delete(seenCommentIds.values().next().value);
      }
      return true;
    }

    function isCommand(text) {
      const normalized = String(text || "").trim().toLocaleLowerCase();
      return parseCommands(C.TRIGGER_COMMANDS).includes(normalized);
    }

    function shouldAutoTrigger(comment) {
      if (!C.AUTO_TRIGGER || comment.eventKind !== "normal") return false;
      const now = Date.now();
      const cooldown = Math.max(0, Number(C.AUTO_TRIGGER_COOLDOWN_MS) || 0);
      if (now - lastAutoTriggerAt < cooldown) return false;
      if (Math.random() >= Math.min(1, Math.max(0, Number(C.AUTO_TRIGGER_RATE) || 0))) return false;
      lastAutoTriggerAt = now;
      return true;
    }

    async function animateCursor(targetIndex) {
      const count = slots.value.length;
      if (!count) return;

      if (count === 1) {
        selectedIndex.value = 0;
        await sleep(Math.max(300, Number(C.SPIN_DURATION_MS) || 2500));
        return;
      }

      const cycles = Math.max(2, Number(C.MIN_SPIN_CYCLES) || 4);
      const totalSteps = cycles * count + targetIndex + 1;
      const duration = Math.max(600, Number(C.SPIN_DURATION_MS) || 2500);
      const weights = Array.from({ length: totalSteps }, (_, index) => {
        const progress = index / Math.max(1, totalSteps - 1);
        return 0.25 + Math.pow(progress, 3) * 2.75;
      });
      const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);

      for (let step = 0; step < totalSteps && !disposed; step += 1) {
        selectedIndex.value = step % count;
        await sleep(duration * weights[step] / weightTotal);
      }
      selectedIndex.value = targetIndex;
    }

    async function runRoulette(name) {
      if (running || disposed) return;

      const dictionaries = getDictionaryEntries();
      if (!dictionaries.length) {
        console.warn("[Comment Roulette] No valid dictionaries found.");
        return;
      }

      running = true;
      const [, dictionary] = randomItem(dictionaries);
      const minSlots = Math.max(1, Math.min(12, Number(C.MIN_SLOTS) || 1));
      const maxSlots = Math.max(minSlots, Math.min(12, Number(C.MAX_SLOTS) || 12));
      const slotCount = randomInt(minSlots, maxSlots);

      targetName.value = name;
      themeTitle.value = dictionary.title;
      slots.value = buildSlots(dictionary.items, slotCount);
      winnerIndex.value = randomInt(0, slots.value.length - 1);
      resultText.value = slots.value[winnerIndex.value];
      selectedIndex.value = -1;
      phase.value = "intro";

      await sleep(Number(C.INTRO_DURATION_MS) || 600);
      phase.value = "spinning";
      await animateCursor(winnerIndex.value);
      if (disposed) return;

      phase.value = "result";
      history.value.unshift({
        id: `${Date.now()}:${Math.random()}`,
        name,
        theme: dictionary.title,
        result: resultText.value
      });
      saveHistory();

      await sleep(Math.max(0, Number(C.RESULT_DISPLAY_MS) || 3000));
      if (!disposed) {
        phase.value = "idle";
        selectedIndex.value = -1;
        running = false;
      }
    }

    function handleComment(raw) {
      const comment = normalizeComment(raw);
      if (!comment || !rememberComment(comment.id)) return;
      if (running) return;

      const commandTriggered = isCommand(comment.text);
      if (!commandTriggered && !shouldAutoTrigger(comment)) return;

      if (C.DEBUG) console.log("[Comment Roulette] Trigger", comment);
      runRoulette(comment.name);
    }

    function applyPreview(nextConfig) {
      if (!nextConfig || typeof nextConfig !== "object") return;
      Object.assign(C, nextConfig);
      applyStyle();
    }

    const handleSettingsPreview = event => applyPreview(event.detail);
    const handleSettingsReset = () => applyPreview(appliedConfig);
    const handleHistoryClear = () => clearHistory();

    onMounted(() => {
      applyStyle();
      restoreHistory();
      window.addEventListener("vct-settings-preview", handleSettingsPreview);
      window.addEventListener("vct-settings-reset-preview", handleSettingsReset);
      window.addEventListener("vct-roulette-clear-history", handleHistoryClear);

      if (!window.OneSDK) {
        console.error("[Comment Roulette] OneSDK not found.");
        return;
      }

      OneSDK.setup({ mode: "diff", permissions: ["comments", "clear"] });
      OneSDK.subscribe({
        action: "comments",
        callback: response => {
          const comments = Array.isArray(response) ? response : [response];
          comments.forEach(handleComment);
        }
      });
      OneSDK.subscribe({ action: "clear", callback: clearHistory });
      OneSDK.ready().then(() => {
        OneSDK.connect();
        console.log("VCT Comment Roulette V1: Ready");
      });
    });

    onBeforeUnmount(() => {
      disposed = true;
      window.removeEventListener("vct-settings-preview", handleSettingsPreview);
      window.removeEventListener("vct-settings-reset-preview", handleSettingsReset);
      window.removeEventListener("vct-roulette-clear-history", handleHistoryClear);
    });

    return {
      config: C,
      phase,
      targetName,
      themeTitle,
      slots,
      selectedIndex,
      winnerIndex,
      resultText,
      history,
      isActive,
      commandGuide
    };
  }
}).mount("#app");
