/**
 * CommentFX Base V2.6 - script.js
 * OneSDK からコメントを受け取り、Parser -> Engine -> FX へ橋渡しする。
 */
(function () {
  function isDebugEnabled() {
    const params = new URLSearchParams(location.search);
    return params.get("debug") === "1" || params.get("debug") === "true" || window.CONFIG?.DEBUG === true;
  }

  function setupDebugToggles() {
    const show = isDebugEnabled() || window.CONFIG?.HIDE_DEFAULT_COMMENTS === false;
    document.documentElement.style.setProperty("--show-comments", show ? "flex" : "none");

    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() !== "d") return;
      const current = getComputedStyle(document.documentElement).getPropertyValue("--show-comments").trim();
      const next = current === "none" ? "flex" : "none";
      document.documentElement.style.setProperty("--show-comments", next);
    });
  }

  function debugLog(...args) {
    if (isDebugEnabled()) console.log("[CommentFX]", ...args);
  }

  function debugWarn(...args) {
    if (isDebugEnabled()) console.warn("[CommentFX]", ...args);
  }

  function escapeText(value) {
    return String(value ?? "");
  }

  function pushToHtml(data) {
    const container = document.querySelector(".comments");
    if (!container) return;

    const div = document.createElement("div");
    div.className = "comment";
    div.style.setProperty("--user-color", data.colorStr || "rgb(255,255,255)");

    if (data.user) {
      const name = document.createElement("div");
      name.className = "comment-name";
      name.textContent = escapeText(data.user);
      div.appendChild(name);
    }

    const text = document.createElement("div");
    text.className = "comment-text";
    text.textContent = escapeText(data.text);
    div.appendChild(text);

    container.prepend(div);
    while (container.children.length > 20) container.removeChild(container.lastChild);
  }

  function toEventList(result) {
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  }

  function handleComment(rawComment) {
    const parser = window.CommentFXParser;
    const engine = window.ENGINE;
    const fx = window.FX;

    const commentData = parser && typeof parser.parse === "function"
      ? parser.parse(rawComment)
      : { text: "", user: "", colorStr: "rgb(255,255,255)", raw: rawComment };

    if (!engine || typeof engine.onComment !== "function") {
      debugWarn("ENGINE.onComment is not available.");
      pushToHtml(commentData);
      return;
    }

    const events = toEventList(engine.onComment(commentData));

    if (!fx || typeof fx.push !== "function") {
      debugWarn("FX.push is not available.", events);
      pushToHtml(commentData);
      return;
    }

    events.forEach((event) => {
      if (event && typeof event === "object") fx.push(event);
    });

    debugLog("parsed", commentData, "events", events);
    pushToHtml(commentData);
  }

  function setupOneSDK() {
    if (!window.OneSDK) {
      debugWarn("OneSDK is not available.");
      document.body.removeAttribute("hidden");
      return;
    }

    OneSDK.setup({ mode: "diff" });

    OneSDK.subscribe({
      action: "comments",
      callback: (comments) => {
        const list = Array.isArray(comments) ? comments : [comments];
        list.filter(Boolean).forEach(handleComment);
      }
    });

    OneSDK.subscribe({
      action: "clear",
      callback: () => {
        if (window.CONFIG?.CLEAR_ON_ONESDK_CLEAR !== false && window.FX?.clear) {
          FX.clear();
        }
      }
    });

    OneSDK.ready()
      .then(() => {
        document.body.removeAttribute("hidden");
        OneSDK.connect();
        debugLog("OneSDK connected.");
      })
      .catch((err) => {
        document.body.removeAttribute("hidden");
        debugWarn("OneSDK ready failed.", err);
      });
  }

  setupDebugToggles();
  setupOneSDK();
})();
