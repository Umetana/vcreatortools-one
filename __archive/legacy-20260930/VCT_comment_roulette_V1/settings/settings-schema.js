(function () {
  "use strict";

  window.VCT_SETTINGS_SCHEMA = {
    general: {
      title: "基本設定",
      fields: {
        TITLE: { type: "text", label: "タイトル" },
        WAITING_TEXT: { type: "text", label: "待機中メッセージ" },
        HISTORY_TITLE: { type: "text", label: "履歴タイトル" },
        TRIGGER_COMMANDS: { type: "text", label: "起動コマンド（カンマ区切り）" },
        SHOW_HISTORY: { type: "checkbox", label: "履歴を表示" },
        HISTORY_MAX: { type: "number", label: "履歴件数" }
      }
    },
    trigger: {
      title: "自動起動",
      fields: {
        AUTO_TRIGGER: { type: "checkbox", label: "通常コメントから自動起動" },
        AUTO_TRIGGER_RATE: { type: "range", min: 0, max: 1, step: 0.01, label: "自動起動確率" },
        AUTO_TRIGGER_COOLDOWN_MS: { type: "number", label: "自動起動クールダウン (ms)" }
      }
    },
    roulette: {
      title: "ルーレット",
      fields: {
        MIN_SLOTS: { type: "number", label: "最小枠数 (1-12)" },
        MAX_SLOTS: { type: "number", label: "最大枠数 (1-12)" },
        MIN_SPIN_CYCLES: { type: "number", label: "最低巡回数" },
        INTRO_DURATION_MS: { type: "number", label: "一覧表示時間 (ms)" },
        SPIN_DURATION_MS: { type: "number", label: "巡回時間 (ms)" },
        RESULT_DISPLAY_MS: { type: "number", label: "結果表示時間 (ms)" }
      }
    },
    appearance: {
      title: "表示",
      fields: {
        FONT_FAMILY: { type: "text", label: "フォント" },
        ACCENT_COLOR: { type: "color", label: "アクセント色" },
        SECONDARY_COLOR: { type: "color", label: "サブ色" },
        PANEL_BG: { type: "text", label: "パネル背景" },
        TEXT_COLOR: { type: "color", label: "文字色" },
        DEBUG: { type: "checkbox", label: "デバッグログ" }
      }
    }
  };
})();
