(function () {
  "use strict";
  if (!window.ENGINE) return;
  const CELL = { UNKNOWN: "UNKNOWN", FILLED: "FILLED", MARKED: "MARKED" },
    PHASE = {
      IDLE: "IDLE",
      READY: "READY",
      POLLING: "POLLING",
      RESOLVE: "RESOLVE",
      RESULT: "RESULT",
      CLEAR: "CLEAR",
    },
    DEF = { pollMs: 15000, resultMs: 3000, topCount: 3 },
    SAVE_KEY = "crbNonogramV2.progress",
    SAVE_VERSION = 1;

  // ===== 問題データとヒント =====
  function validatePuzzles(src) {
    const valid = [],
      warnings = [],
      ids = new Set();
    (Array.isArray(src) ? src : []).forEach((p, i) => {
      const e = [],
        id = typeof p?.id === "string" ? p.id.trim() : "",
        title = typeof p?.title === "string" ? p.title.trim() : "";
      if (!id) e.push("idが空です");
      else if (ids.has(id)) e.push("id重複");
      if (!title) e.push("titleが空です");
      if (p?.width !== 10 || p?.height !== 10) e.push("サイズ不正");
      if (!Array.isArray(p?.solution) || p.solution.length !== 10)
        e.push("行数不正");
      else {
        p.solution.forEach((r, n) => {
          if (typeof r !== "string" || !/^[01]{10}$/.test(r))
            e.push(`${n + 1}行目不正`);
        });
        if (!p.solution.some((r) => typeof r === "string" && r.includes("1")))
          e.push("塗りマスなし");
      }
      if (e.length) warnings.push(`問題${i + 1}: ${e.join(" / ")}`);
      else {
        ids.add(id);
        valid.push({
          id,
          title,
          width: 10,
          height: 10,
          solution: p.solution.slice(),
        });
      }
    });
    return { valid, warnings };
  }
  function lineHint(a) {
    const out = [];
    let n = 0;
    a.forEach((v) => {
      if (v === "1") n++;
      else if (n) {
        out.push(n);
        n = 0;
      }
    });
    if (n) out.push(n);
    return out.length ? out : [0];
  }
  function createHints(p) {
    return {
      rows: p.solution.map((r) => lineHint([...r])),
      cols: Array.from({ length: 10 }, (_, c) =>
        lineHint(p.solution.map((r) => r[c])),
      ),
    };
  }
  function parseCommand(text) {
    const m = String(text ?? "").match(
      /^[ \u3000]*(FILL|MARK)[ \u3000]+([A-J](?:10|[1-9]))[ \u3000]*$/i,
    );
    if (!m) return null;
    const coordinate = m[2].toUpperCase();
    return {
      action: m[1].toUpperCase(),
      coordinate,
      col: coordinate.charCodeAt(0) - 65,
      row: Number(coordinate.slice(1)) - 1,
    };
  }
  const blank = () =>
    Array.from({ length: 10 }, () => Array(10).fill(CELL.UNKNOWN));
  function ensure(state) {
    state.crbNonogram = state.crbNonogram || {};
    const s = state.crbNonogram;
    s.runtime = s.runtime || {};
    s.ui = s.ui || {};
    s.persist = s.persist || {};
    return s;
  }
  const key = (v) => `${v.action} ${v.coordinate}`,
    unknown = (s, v) => s.board?.[v.row]?.[v.col] === CELL.UNKNOWN;
  function rankedCandidates(s, recheck = false) {
    const map = new Map();
    for (const v of s.votes.values()) {
      if (recheck && !unknown(s, v)) continue;
      const k = key(v),
        meta = s.candidateMeta.get(k);
      if (!meta) continue;
      const x = map.get(k) || {
        key: k,
        action: v.action,
        coordinate: v.coordinate,
        row: v.row,
        col: v.col,
        count: 0,
        firstAt: meta.firstAt,
        sequence: meta.sequence,
      };
      x.count++;
      map.set(k, x);
    }
    return [...map.values()].sort(
      (a, b) =>
        b.count - a.count || a.firstAt - b.firstAt || a.sequence - b.sequence,
    );
  }
  function resetVotes(s) {
    s.votes = new Map();
    s.candidateMeta = new Map();
  }
  function cancel(s) {
    resetVotes(s);
    s.pollEndsAt = 0;
    s.turnResolved = true;
  }
  function cleanMeta(s, k) {
    for (const v of s.votes.values()) if (key(v) === k) return;
    s.candidateMeta.delete(k);
  }
  function settings() {
    const c = window.NONOGRAM_CONFIG || {},
      p = Number(c.POLL_DURATION_SECONDS),
      r = Number(c.RESULT_DURATION_SECONDS),
      t = Number(c.TOP_CANDIDATE_COUNT);
    return {
      pollMs: [10, 15, 20, 30, 60].includes(p) ? p * 1000 : DEF.pollMs,
      resultMs: Number.isFinite(r) && r >= 0 ? r * 1000 : DEF.resultMs,
      topCount:
        Number.isFinite(t) && t >= 3 && t <= 5 ? Math.trunc(t) : DEF.topCount,
    };
  }
  function pending() {
    const p = document.getElementById("nonogram-poll-duration"),
      r = document.getElementById("nonogram-result-duration"),
      t = document.getElementById("nonogram-top-count");
    if (p) window.NONOGRAM_CONFIG.POLL_DURATION_SECONDS = Number(p.value);
    if (r) window.NONOGRAM_CONFIG.RESULT_DURATION_SECONDS = Number(r.value);
    if (t) window.NONOGRAM_CONFIG.TOP_CANDIDATE_COUNT = Number(t.value);
    return settings();
  }
  function showPopup(
    s,
    text,
    kind = "info",
    durationMs = 2000,
    now = performance.now(),
  ) {
    s.popup = {
      text: String(text || ""),
      kind,
      until: now + Math.max(0, durationMs),
    };
  }
  function addTurnResult(s, kind, text) {
    s.turnResults.unshift({ kind, text });
    if (s.turnResults.length > 3) s.turnResults.length = 3;
  }
  function puzzleSignature(p) {
    return p.solution.join("");
  }
  // ===== 途中経過の保存と復元 =====
  function saveProgress(s) {
    if (typeof localStorage === "undefined" || !s.puzzle) return false;
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: SAVE_VERSION,
          puzzleId: s.puzzle.id,
          puzzleSignature: puzzleSignature(s.puzzle),
          board: s.board,
          history: s.history,
          autoMarked: s.autoMarked,
          phase: s.phase === PHASE.CLEAR ? PHASE.CLEAR : PHASE.READY,
          savedAt: new Date().toISOString(),
        }),
      );
      return true;
    } catch (e) {
      console.warn("[Nonogram] 進行状況を保存できませんでした", e);
      return false;
    }
  }
  function validBoard(board) {
    return (
      Array.isArray(board) &&
      board.length === 10 &&
      board.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 10 &&
          row.every(
            (v) => v === CELL.UNKNOWN || v === CELL.FILLED || v === CELL.MARKED,
          ),
      )
    );
  }
  function validMove(m, p, board) {
    if (
      !m ||
      !Number.isInteger(m.row) ||
      !Number.isInteger(m.col) ||
      m.row < 0 ||
      m.row > 9 ||
      m.col < 0 ||
      m.col > 9 ||
      !["FILL", "MARK"].includes(m.action)
    )
      return false;
    const expected = p.solution[m.row][m.col] === "1" ? "FILL" : "MARK",
      cell = m.action === "FILL" ? CELL.FILLED : CELL.MARKED;
    return m.action === expected && board[m.row][m.col] === cell;
  }
  function restoreProgress(s) {
    if (typeof localStorage === "undefined") return false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw),
        index = s.puzzles.findIndex((p) => p.id === data.puzzleId);
      if (data.version !== SAVE_VERSION || index < 0) return false;
      const puzzle = s.puzzles[index];
      if (
        data.puzzleSignature !== puzzleSignature(puzzle) ||
        !validBoard(data.board) ||
        !Array.isArray(data.history) ||
        !data.history.every((m) => validMove(m, puzzle, data.board)) ||
        !Array.isArray(data.autoMarked)
      )
        return false;
      const autoValid = data.autoMarked.every(
        (x) =>
          Array.isArray(x) &&
          x.length === 2 &&
          Number.isInteger(x[0]) &&
          Number.isInteger(x[1]) &&
          x[0] >= 0 &&
          x[0] < 10 &&
          x[1] >= 0 &&
          x[1] < 10 &&
          puzzle.solution[x[0]][x[1]] === "0" &&
          data.board[x[0]][x[1]] === CELL.MARKED,
      );
      if (!autoValid) return false;
      s.puzzleIndex = index;
      s.puzzle = puzzle;
      s.hints = createHints(puzzle);
      s.board = data.board.map((row) => row.slice());
      s.history = data.history.map((m) => ({
        row: m.row,
        col: m.col,
        action: m.action,
      }));
      s.autoMarked = data.autoMarked.map((x) => x.slice());
      s.phase =
        data.phase === PHASE.CLEAR && cleared(s) ? PHASE.CLEAR : PHASE.READY;
      const hasProgress =
        s.phase === PHASE.CLEAR ||
        s.history.length > 0 ||
        s.board.some((row) => row.some((cell) => cell !== CELL.UNKNOWN));
      s.result =
        s.phase === PHASE.CLEAR
          ? `CLEAR！ 正解：${puzzle.title}`
          : hasProgress
            ? "保存した途中経過を復元しました"
            : "投票開始を待っています";
      s.resultKind = s.phase === PHASE.CLEAR ? "is-clear" : "";
      s.restoredWithProgress = hasProgress;
      s.boardVersion++;
      cancel(s);
      return true;
    } catch (e) {
      console.warn("[Nonogram] 保存データを復元できませんでした", e);
      return false;
    }
  }
  function load(s, index, msg) {
    cancel(s);
    if (!s.puzzles.length) {
      s.phase = PHASE.IDLE;
      s.result = "有効な問題がありません";
      showPopup(s, s.result, "wrong", 3000);
      render(s);
      return false;
    }
    s.puzzleIndex =
      ((index % s.puzzles.length) + s.puzzles.length) % s.puzzles.length;
    s.puzzle = s.puzzles[s.puzzleIndex];
    s.hints = createHints(s.puzzle);
    s.board = blank();
    s.history = [];
    s.autoMarked = [];
    s.turnResults = [];
    s.phase = PHASE.READY;
    s.result = msg || "投票開始を待っています";
    s.resultKind = "";
    s.boardVersion++;
    if (msg) showPopup(s, msg, "info", 1800);
    saveProgress(s);
    render(s, true);
    return true;
  }
  // ===== ゲーム進行とターン解決 =====
  function start(s, now) {
    if (s.phase !== PHASE.READY && s.phase !== PHASE.RESULT) return false;
    s.activeSettings = pending();
    resetVotes(s);
    s.phase = PHASE.POLLING;
    s.pollEndsAt = now + s.activeSettings.pollMs;
    s.turnResolved = false;
    s.result = "";
    s.resultKind = "";
    render(s);
    return true;
  }
  const cleared = (s) =>
    s.puzzle.solution.every((row, r) =>
      [...row].every((v, c) => v !== "1" || s.board[r][c] === CELL.FILLED),
    );
  function complete(s) {
    s.autoMarked = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (s.puzzle.solution[r][c] === "0" && s.board[r][c] === CELL.UNKNOWN) {
          s.board[r][c] = CELL.MARKED;
          s.autoMarked.push([r, c]);
        }
    s.phase = PHASE.CLEAR;
    s.result = `CLEAR！ 正解：${s.puzzle.title}`;
    s.resultKind = "is-clear";
    s.boardVersion++;
  }
  function resolve(s, now) {
    if (s.phase !== PHASE.POLLING || s.turnResolved) return false;
    s.turnResolved = true;
    s.phase = PHASE.RESOLVE;
    const rank = rankedCandidates(s, true);
    resetVotes(s);
    s.pollEndsAt = 0;
    if (!rank.length) {
      s.result = "無票：盤面は変わりません";
      s.resultKind = "";
      addTurnResult(s, "empty", "― 無票");
      showPopup(s, s.result, "empty", s.activeSettings.resultMs, now);
    } else {
      const w = rank[0],
        expected = s.puzzle.solution[w.row][w.col] === "1" ? "FILL" : "MARK";
      if (w.action === expected) {
        s.board[w.row][w.col] = w.action === "FILL" ? CELL.FILLED : CELL.MARKED;
        s.history.push({ row: w.row, col: w.col, action: w.action });
        s.result = `正解：${w.key}（${w.count}票）`;
        s.resultKind = "is-correct";
        addTurnResult(s, "correct", `✓ ${w.key} · ${w.count}票`);
        showPopup(s, s.result, "correct", s.activeSettings.resultMs, now);
        s.boardVersion++;
      } else {
        s.result = `不正解：${w.key}（${w.count}票）`;
        s.resultKind = "is-wrong";
        addTurnResult(s, "wrong", `× ${w.key} · ${w.count}票`);
        showPopup(s, s.result, "wrong", s.activeSettings.resultMs, now);
      }
    }
    if (cleared(s)) {
      complete(s);
      showPopup(
        s,
        s.result,
        "clear",
        Math.max(3500, s.activeSettings.resultMs),
        now,
      );
    } else {
      s.phase = PHASE.RESULT;
      s.resultEndsAt = now + s.activeSettings.resultMs;
    }
    saveProgress(s);
    render(s, true);
    return true;
  }
  function undo(s) {
    cancel(s);
    if (s.phase === PHASE.CLEAR) {
      s.autoMarked.forEach(([r, c]) => (s.board[r][c] = CELL.UNKNOWN));
      s.autoMarked = [];
    }
    const m = s.history.pop();
    if (m) {
      s.board[m.row][m.col] = CELL.UNKNOWN;
      s.boardVersion++;
    }
    if (s.puzzle) {
      s.phase = PHASE.READY;
      s.result = m
        ? `1手戻しました：${String.fromCharCode(65 + m.col)}${m.row + 1}`
        : "戻せる手がありません";
      s.resultKind = "";
      showPopup(s, s.result, "info", 1800);
      saveProgress(s);
    }
    render(s, true);
  }
  // ===== コメント投票と配信中ショートカット =====
  function vote(s, c, now) {
    if (s.phase !== PHASE.POLLING || now >= s.pollEndsAt) return false;
    const cmd = parseCommand(c?.message?.text);
    if (!cmd || !unknown(s, cmd)) return false;
    const sid = c?.service?.id,
      uid = c?.user?.id;
    if (
      sid === undefined ||
      sid === null ||
      sid === "" ||
      uid === undefined ||
      uid === null ||
      uid === ""
    )
      return false;
    const u = `${String(sid)}:${String(uid)}`,
      old = s.votes.get(u),
      k = key(cmd);
    if (old && key(old) === k) return true;
    if (old) {
      s.votes.delete(u);
      cleanMeta(s, key(old));
    }
    if (!s.candidateMeta.has(k))
      s.candidateMeta.set(k, { firstAt: now, sequence: ++s.voteSequence });
    s.votes.set(u, cmd);
    render(s);
    return true;
  }
  function handleShortcut(s, event, now) {
    const tag = String(event?.target?.tagName || "").toUpperCase();
    if (
      event?.repeat ||
      event?.ctrlKey ||
      event?.metaKey ||
      event?.altKey ||
      event?.target?.isContentEditable ||
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA"
    )
      return false;
    const k = String(event?.key || "").toLowerCase();
    if (k === "p" && s.phase === PHASE.READY) {
      start(s, now);
      return true;
    }
    if (k === "s" && s.phase === PHASE.POLLING) {
      cancel(s);
      s.phase = PHASE.READY;
      s.result = "投票を停止しました";
      s.resultKind = "";
      showPopup(s, s.result, "info", 1500, now);
      render(s);
      return true;
    }
    return false;
  }
  // ===== 盤面とステータスUIの描画 =====
  function buildBoard(s) {
    const wrap = document.getElementById("nonogram-board-wrap");
    if (!wrap || !s.puzzle) return;
    const grid = document.createElement("div");
    grid.className = "ng-grid";
    const add = (cls, text, col, row) => {
      const e = document.createElement("div");
      e.className = cls;
      e.textContent = text;
      e.style.gridColumn = col;
      e.style.gridRow = row;
      grid.appendChild(e);
    };
    add("ng-corner", "", 1, 1);
    add("ng-corner", "", 2, 1);
    add("ng-corner", "", 1, 2);
    add("ng-corner", "", 2, 2);
    for (let c = 0; c < 10; c++) {
      add("ng-col-label", String.fromCharCode(65 + c), c + 3, 1);
      add("ng-col-hint", s.hints.cols[c].join("\n"), c + 3, 2);
    }
    for (let r = 0; r < 10; r++) {
      add("ng-row-label", String(r + 1), 1, r + 3);
      add("ng-row-hint", s.hints.rows[r].join("  "), 2, r + 3);
    }
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const x = ["ng-cell"];
        if (!c) x.push("edge-left");
        if (!r) x.push("edge-top");
        if (c === 4 || c === 9) x.push("major-right");
        if (r === 4 || r === 9) x.push("major-bottom");
        if (s.board[r][c] === CELL.FILLED) x.push("filled");
        if (s.board[r][c] === CELL.MARKED) x.push("marked");
        add(x.join(" "), "", c + 3, r + 3);
      }
    wrap.replaceChildren(grid);
    s.renderedBoardVersion = s.boardVersion;
  }
  function render(s, force = false) {
    if (!document.getElementById("nonogram-app")) return;
    if (s.puzzle && (force || s.renderedBoardVersion !== s.boardVersion))
      buildBoard(s);
    const set = (id, v) => {
      const e = document.getElementById(id);
      if (e) e.textContent = v;
    };
    set("nonogram-phase", s.phase);
    set(
      "nonogram-title",
      s.phase === PHASE.CLEAR ? s.puzzle?.title || "???" : "???",
    );
    set("nonogram-voters", s.votes?.size || 0);
    const left =
      s.phase === PHASE.POLLING
        ? Math.max(0, s.pollEndsAt - performance.now())
        : 0;
    set(
      "nonogram-timer",
      s.phase === PHASE.POLLING ? `${(left / 1000).toFixed(1)}s` : "--",
    );
    const rank = s.votes
        ? rankedCandidates(s).slice(0, s.activeSettings?.topCount || 3)
        : [],
      list = document.getElementById("nonogram-ranking");
    if (list) {
      list.replaceChildren();
      (rank.length ? rank : [{ key: "投票待機中", count: null }]).forEach(
        (x) => {
          const li = document.createElement("li");
          li.textContent = x.count === null ? x.key : `${x.key}  ${x.count}票`;
          list.appendChild(li);
        },
      );
    }
    const recent = document.getElementById("nonogram-recent-list");
    if (recent) {
      recent.replaceChildren();
      (s.turnResults.length
        ? s.turnResults
        : [{ kind: "empty", text: "まだ結果はありません" }]
      ).forEach((x) => {
        const li = document.createElement("li");
        li.className = `recent-${x.kind}`;
        li.textContent = x.text;
        recent.appendChild(li);
      });
    }
    const popup = document.getElementById("nonogram-popup");
    if (popup) {
      const visible = s.popup?.text && performance.now() < s.popup.until;
      popup.textContent = visible ? s.popup.text : "";
      popup.className =
        `system-popup ${visible ? "is-visible" : ""} popup-${s.popup?.kind || "info"}`.trim();
    }
    const select = document.getElementById("nonogram-puzzle-select");
    if (select && String(select.value) !== String(s.puzzleIndex))
      select.value = String(s.puzzleIndex);
  }
  // ===== 管理UIのイベント登録 =====
  function bind(s) {
    const app = document.getElementById("nonogram-app");
    if (!app || app.dataset.bound) return;
    app.dataset.bound = "1";
    const select = document.getElementById("nonogram-puzzle-select");
    s.puzzles.forEach((p, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = `${i + 1}. ${p.title}`;
      select?.appendChild(o);
    });
    app.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const a = b.dataset.action,
        now = performance.now();
      if (a === "load")
        load(s, Number(select?.value || 0), "問題を読み込みました");
      else if (a === "poll") start(s, now);
      else if (a === "stop" && s.phase === PHASE.POLLING) {
        cancel(s);
        s.phase = PHASE.READY;
        s.result = "投票を停止しました";
        showPopup(s, s.result, "info", 1500, now);
        render(s);
      } else if (a === "close") resolve(s, now);
      else if (a === "reset") load(s, s.puzzleIndex, "問題をリセットしました");
      else if (a === "next")
        load(s, s.puzzleIndex + 1, "次の問題を読み込みました");
      else if (a === "random") {
        let i = s.puzzleIndex;
        if (s.puzzles.length > 1)
          while (i === s.puzzleIndex)
            i = Math.floor(Math.random() * s.puzzles.length);
        load(s, i, "ランダム問題を読み込みました");
      } else if (a === "undo") undo(s);
      else if (b.id === "nonogram-hide-admin") {
        app.classList.add("admin-hidden");
        document.getElementById("nonogram-show-admin").hidden = false;
      } else if (b.id === "nonogram-show-admin") {
        app.classList.remove("admin-hidden");
        b.hidden = true;
      }
    });
    window.addEventListener("keydown", (e) => {
      if (handleShortcut(s, e, performance.now())) e.preventDefault();
    });
    const cfg = settings(),
      p = document.getElementById("nonogram-poll-duration"),
      r = document.getElementById("nonogram-result-duration"),
      t = document.getElementById("nonogram-top-count");
    if (p) p.value = String(cfg.pollMs / 1000);
    if (r) r.value = String(cfg.resultMs / 1000);
    if (t) t.value = String(cfg.topCount);
    if (
      new URLSearchParams(location.search).get("admin") === "0" ||
      window.NONOGRAM_CONFIG?.SHOW_ADMIN_UI === false
    )
      app.classList.add("admin-hidden");
  }
  // ===== Base hookへの登録 =====
  const plugin = {
    name: "CRBNonogram",
    manifest: "./plugins/plugin_manifest.js",
    onInit(ctx, state) {
      const s = ensure(state),
        v = validatePuzzles(window.NONOGRAM_PUZZLES);
      s.puzzles = v.valid;
      s.warnings = v.warnings;
      s.phase = PHASE.IDLE;
      s.puzzleIndex = -1;
      s.puzzle = null;
      s.board = blank();
      s.history = [];
      s.autoMarked = [];
      s.turnResults = [];
      s.popup = null;
      s.boardVersion = 0;
      s.renderedBoardVersion = -1;
      s.voteSequence = 0;
      s.activeSettings = settings();
      resetVotes(s);
      v.warnings.forEach((x) => console.warn(`[Nonogram] ${x}`));
      bind(s);
      if (s.puzzles.length) {
        if (!restoreProgress(s)) load(s, 0);
        else {
          if (s.phase === PHASE.CLEAR)
            showPopup(s, s.result, "clear", 3500, ctx.now);
          else if (s.restoredWithProgress)
            showPopup(s, s.result, "info", 2200, ctx.now);
          render(s, true);
        }
      } else {
        s.result = "有効な問題がありません";
        showPopup(s, s.result, "wrong", 3000, ctx.now);
        render(s);
      }
    },
    onUpdate(ctx, state) {
      const s = ensure(state);
      bind(s);
      if (s.phase === PHASE.POLLING && ctx.now >= s.pollEndsAt)
        resolve(s, ctx.now);
      else if (s.phase === PHASE.RESULT && ctx.now >= s.resultEndsAt) {
        s.phase = PHASE.READY;
        start(s, ctx.now);
      }
      if (s.popup && ctx.now >= s.popup.until) s.popup = null;
      render(s);
    },
    beforeComment(ctx, state) {
      if (vote(ensure(state), ctx.commentData, ctx.now)) ctx.terminated = true;
    },
  };
  window.NONOGRAM_TEST_API = {
    CELL,
    PHASE,
    validatePuzzles,
    lineHint,
    createHints,
    parseCommand,
    rankedCandidates,
    start,
    resolve,
    vote,
    undo,
    load,
    blank,
    saveProgress,
    restoreProgress,
    handleShortcut,
    showPopup,
    addTurnResult,
  };
  window.ENGINE.use(plugin);
})();
