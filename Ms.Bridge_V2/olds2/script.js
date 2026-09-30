/* Ms.Bridge v0.2 - OneComme custom template
   - Subscribe OneSDK comments
   - Detect triggers (command / regex / all) => send "trigger"
   - (optional) also send "comment" as raw/lite for debugging & rule tuning
   - POST JSON to localhost endpoint
   - Hub (server.js) should forward as-is to WS

   Output examples:
     { type:"trigger", ts, payload:{ name, args, mode, text?, user?/service? } }
     { type:"comment", ts, payload:{ ...rawOrLite... } }
*/

const STORAGE_KEY = "ms_bridge_settings_v02";

function safeNow() { return Date.now(); }

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html ?? "");
  return (div.textContent || "").trim();
}

function isLocalhostUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = (u.hostname || "").toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return (u.protocol === "http:" || u.protocol === "https:") && isLocal;
  } catch {
    return false;
  }
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

function pickLiteComment(comment) {
  const d = comment?.data || {};
  // “生っぽい”けど重すぎない最小限
  return {
    id: comment?.id || null,
    service: comment?.service || null,
    name: comment?.name || null,
    url: comment?.url || null,
    color: comment?.color || null,
    data: {
      id: d.id || null,
      liveId: d.liveId || null,
      userId: d.userId || null,
      name: d.name || null,
      displayName: d.displayName || null,
      isOwner: !!d.isOwner,
      isModerator: !!d.isModerator,
      isMember: !!d.isMember,
      timestamp: d.timestamp || null,
      comment: d.comment || "",
      speechText: d.speechText || null,

      // superchat / paid
      hasGift: !!d.hasGift,
      giftType: d.giftType || "normal",
      tier: d.tier ?? null,
      paidText: d.paidText || "",
      price: d.price || 0,
      unit: d.unit || "",
      colors: d.colors || null,
    },
    meta: comment?.meta || null,
  };
}

const app = Vue.createApp({
  setup() {
    document.body.removeAttribute("hidden");
  },
  data() {
    const defaults = {
      enabled: false,
      isRunning: true,
      endpoint: "http://127.0.0.1:3000/bridge",

      // trigger detection
      mode: "command",   // command | regex | all
      regex: "^(1|2|3)$",
      cooldownMs: 0,
      includeText: false,
      includeUser: false,

      // raw comment send
      sendRaw: false,
      rawLevel: "lite",        // lite | full
      rawCooldownMs: 0,

      bg: { r: 255, g: 255, b: 255, a: 0.55 },
      fg: { r: 0, g: 0, b: 0 }
    };

    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch {}

    const bridge = Object.assign({}, defaults, saved || {});
    bridge.bg = Object.assign({}, defaults.bg, (saved && saved.bg) || {});
    bridge.fg = Object.assign({}, defaults.fg, (saved && saved.fg) || {});

    // migrate old key (v01a) if present
    try {
      const old = JSON.parse(localStorage.getItem("ms_bridge_settings_v01a") || "null");
      if (old && !saved) {
        bridge.enabled = !!old.enabled;
        bridge.isRunning = !!old.isRunning;
        bridge.endpoint = old.endpoint || bridge.endpoint;
        bridge.mode = old.mode || bridge.mode;
        bridge.regex = old.regex || bridge.regex;
        bridge.cooldownMs = old.cooldownMs ?? bridge.cooldownMs;
        bridge.includeText = !!old.includeText;
        bridge.includeUser = !!old.includeUser;
        bridge.bg = Object.assign({}, bridge.bg, old.bg || {});
        bridge.fg = Object.assign({}, bridge.fg, old.fg || {});
      }
    } catch {}

    return {
      bridge,
      stats: { seen: 0, sent: 0, fail: 0 },
      logs: [],
      _cache: new Map(),
      _commentIndex: 0,
      _lastTriggerAt: 0,
      _lastRawAt: 0,
      _regexObj: null,
    };
  },
  computed: {
    panelStyle() {
      const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v)));
      const r = clamp(this.bridge.bg?.r ?? 255, 0, 255);
      const g = clamp(this.bridge.bg?.g ?? 255, 0, 255);
      const b = clamp(this.bridge.bg?.b ?? 255, 0, 255);
      const a = clamp(this.bridge.bg?.a ?? 0.55, 0, 1);
      const fr = clamp(this.bridge.fg?.r ?? 0, 0, 255);
      const fg = clamp(this.bridge.fg?.g ?? 0, 0, 255);
      const fb = clamp(this.bridge.fg?.b ?? 0, 0, 255);
      return { background: `rgba(${r},${g},${b},${a})`, color: `rgb(${fr},${fg},${fb})` };
    },
    endpointIsLocalhost() {
      return isLocalhostUrl(this.bridge.endpoint);
    }
  },
  watch: {
    bridge: {
      deep: true,
      handler() {
        const s = {
          enabled: !!this.bridge.enabled,
          isRunning: !!this.bridge.isRunning,
          endpoint: String(this.bridge.endpoint || "").trim(),

          mode: String(this.bridge.mode || "command"),
          regex: String(this.bridge.regex || ""),
          cooldownMs: clampInt(this.bridge.cooldownMs, 0, 60000),
          includeText: !!this.bridge.includeText,
          includeUser: !!this.bridge.includeUser,

          sendRaw: !!this.bridge.sendRaw,
          rawLevel: (this.bridge.rawLevel === "full") ? "full" : "lite",
          rawCooldownMs: clampInt(this.bridge.rawCooldownMs, 0, 60000),

          bg: this.bridge.bg,
          fg: this.bridge.fg,
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
      }
    }
  },
  methods: {
    start() {
      this.bridge.isRunning = true;
      this.log("info", "Start: 受付を開始しました");
    },
    stop() {
      this.bridge.isRunning = false;
      this.log("info", "Stop: 受付を停止しました");
    },
    reset() {
      this.stats = { seen: 0, sent: 0, fail: 0 };
      this.logs = [];
      this._lastTriggerAt = 0;
      this._lastRawAt = 0;
      this._regexObj = null;
      this._cache = new Map();
      this._commentIndex = 0;
      this.log("info", "Reset: 状態を初期化しました");
    },
    log(level, msg) {
      const ts = new Date().toLocaleTimeString();
      this.logs.unshift({ level, msg, ts });
      if (this.logs.length > 60) this.logs.pop();
    },
    compileRegex() {
      if (this.bridge.mode !== "regex") return null;
      const src = String(this.bridge.regex || "").trim();
      if (!src) return null;
      try {
        this._regexObj = new RegExp(src);
        return this._regexObj;
      } catch (e) {
        this._regexObj = null;
        this.log("err", `正規表現エラー: ${String(e?.message || e)}`);
        return null;
      }
    },
    parseTrigger(text) {
      const t = String(text || "").trim();
      if (!t) return null;

      if (this.bridge.mode === "all") return { type: "all", key: "all", args: "" };

      if (this.bridge.mode === "command") {
        const m = t.match(/^!([A-Za-z0-9_\-]{1,32})(?:\s+(.*))?$/);
        if (!m) return null;
        return { type: "command", key: m[1], args: (m[2] || "").trim() };
      }

      const re = this._regexObj || this.compileRegex();
      if (!re) return null;
      if (!re.test(t)) return null;
      return { type: "regex", key: "match", args: "" };
    },
    getUserInfo(comment) {
      const d = comment?.data || {};
      return {
        service: comment?.service || "",
        userId: d.userId || "",
        name: d.name || "",
        displayName: d.displayName || "",
      };
    },
    buildTriggerEvent(comment, text, trig) {
      const payload = {
        name: trig.key,
        args: trig.args || "",
        mode: trig.type,
      };

      if (this.bridge.includeText) payload.text = text;

      if (this.bridge.includeUser) payload.user = this.getUserInfo(comment);
      else payload.service = comment?.service || "";

      return {
        type: "trigger",
        ts: new Date().toISOString(),
        payload,
      };
    },
    buildCommentEvent(comment) {
      const payload = (this.bridge.rawLevel === "full")
        ? comment
        : pickLiteComment(comment);

      return {
        type: "comment",
        ts: new Date().toISOString(),
        payload,
      };
    },
    async postEvent(ev, kind /* "trigger" | "comment" */) {
      if (!this.bridge.enabled) return;

      if (!this.endpointIsLocalhost) {
        this.stats.fail += 1;
        this.log("err", "送信先がlocalhostではありません（ブロック）");
        return;
      }

      const now = safeNow();

      if (kind === "trigger") {
        const cd = clampInt(this.bridge.cooldownMs, 0, 60000);
        if (cd > 0 && (now - this._lastTriggerAt) < cd) return;
      } else if (kind === "comment") {
        const cd = clampInt(this.bridge.rawCooldownMs, 0, 60000);
        if (cd > 0 && (now - this._lastRawAt) < cd) return;
      }

      try {
        const res = await fetch(this.bridge.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ev),
          keepalive: true,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        this.stats.sent += 1;
        if (kind === "trigger") this._lastTriggerAt = now;
        if (kind === "comment") this._lastRawAt = now;
      } catch (e) {
        this.stats.fail += 1;
        this.log("err", `送信失敗: ${String(e?.message || e)}`);
      }
    },
    onNewComment(comment) {
      if (!this.bridge.isRunning) return;

      const text = stripHtml(comment?.data?.comment);
      this.stats.seen += 1;

      // (A) raw comment forwarding (optional)
      if (this.bridge.sendRaw) {
        const cev = this.buildCommentEvent(comment);
        this.postEvent(cev, "comment");
      }

      // (B) trigger forwarding (optional by mode match)
      const trig = this.parseTrigger(text);
      if (!trig) return;

      const tev = this.buildTriggerEvent(comment, text, trig);
      this.postEvent(tev, "trigger");

      const shown = (this.bridge.mode === "command")
        ? `!${trig.key}${trig.args ? " " + trig.args : ""}`
        : (this.bridge.mode === "regex" ? `regex match` : `all`);
      this.log("info", `TRIGGER: ${shown}`);
    }
  },
  mounted() {
    let cache = this._cache;
    let commentIndex = this._commentIndex;

    OneSDK.setup({
      permissions: OneSDK.usePermission([OneSDK.PERM.COMMENT]),
    });

    OneSDK.subscribe({
      action: "comments",
      callback: (comments) => {
        const newCache = new Map();

        comments.forEach((comment) => {
          const id = comment?.data?.id;
          if (!id) return;

          const index = cache.get(id);
          if (isNaN(index)) {
            comment.commentIndex = commentIndex;
            newCache.set(id, commentIndex);
            commentIndex += 1;
            this.onNewComment(comment);
          } else {
            comment.commentIndex = index;
            newCache.set(id, index);
          }
        });

        cache = newCache;
        this._cache = newCache;
        this._commentIndex = commentIndex;
      },
    });

    OneSDK.connect();

    this.log("info", "起動しました（コメント購読中）");
    if (!this.endpointIsLocalhost) this.log("err", "注意: endpointがlocalhostではありません（送信はブロックされます）");
  },
});

OneSDK.ready().then(() => {
  app.mount("#container");
});
