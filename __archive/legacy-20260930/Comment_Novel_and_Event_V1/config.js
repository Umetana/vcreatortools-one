window.CNE_CONFIG = {
  // config_default.js の値を必要な箇所だけ上書きします。
  event: {
    triggerRate: 1,
    // テスト中は同一ユーザーの連続発動を許可します。
    userDedupe: { enabled: false },
    routes: {
      normal: { enabled: true }
    }
  },
  appearance: {
    // "popup" | "rpg" | "dark" | "rpg2" | "horror" | "sf" | "recipe" | "system"
    preset: "popup",
    // "dictionary": 辞書指定を使用 / "global": presetへ固定
    dictionaryPresetMode: "dictionary"
  },
  debug: false
};
