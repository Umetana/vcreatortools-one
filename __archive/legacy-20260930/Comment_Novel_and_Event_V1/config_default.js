window.CNE_CONFIG_DEFAULT = {
  mode: "event",
  canvas: {
    width: 1920,
    height: 1080
  },
  event: {
    triggerRate: 1,
    cooldownMs: 0,
    userDedupe: {
      enabled: true
    },
    recentUserWindow: 5,
    maxNameLength: 24,
    maxTextLength: 100,
    commentDisplay: {
      maxUnits: 36,
      maxMediaItems: 4,
      emojiUnitCost: 2,
      stickerUnitCost: 6,
      overflowText: "…",
      emojiSizeEm: 1.2,
      stickerSizeEm: 2.2
    },
    maxVisible: 5,
    durationMs: 4500,
    spawnMode: "random",
    fixedPosition: { x: 960, y: 540 },
    randomArea: { xMin: 100, xMax: 1820, yMin: 100, yMax: 980 },
    allowOverflow: true,
    dictionarySelectMode: "randomFile",
    queue: {
      enabled: true,
      maxSize: 10,
      intervalMs: 700,
      overflow: "dropOldest"
    },
    routes: {
normal: {
  enabled: true,
  dictionaryFiles: [
    "event/normal/001.js",
    "event/normal/002.js",
    "event/normal/003.js",
    "event/normal/004.js",
    "event/normal/005.js",
    "event/normal/006.js",
    "event/normal/007.js",
    "event/normal/008.js",
    "event/normal/009.js",
    // "event/normal/010.js",
    "event/normal/011.js"
  ]
      },
      superchat: {
        enabled: true,
        dictionaryFiles: ["event/gift/superchat.js"]
      },
      supersticker: {
        enabled: true,
        dictionaryFiles: ["event/gift/supersticker.js"]
      },
      membership_gift: {
        enabled: true,
        dictionaryFiles: ["event/gift/membership.js"]
      },
      member_join: {
        enabled: true,
        dictionaryFiles: ["event/member/join.js"]
      },
      member_milestone: {
        enabled: true,
        dictionaryFiles: ["event/member/milestone.js"]
      },
      membership_event: {
        enabled: true,
        dictionaryFiles: ["event/member/milestone.js"]
      },
      default: {
        enabled: false,
        dictionaryFiles: []
      }
    }
  },
  appearance: {
    preset: "popup",
    dictionaryPresetMode: "dictionary", // "dictionary" | "global"
    fontFamily: '"M PLUS 1p", "Noto Sans JP", sans-serif',
    cardMaxWidthPx: 500,
    presets: {
      popup: {
        fontSizePx: 38,
        cardBackground: "rgba(255, 255, 255, 0.94)",
        textColor: "#1b1b24",
        accentColor: "#ff5fa2",
        border: "3px solid rgba(255, 95, 162, 0.9)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.28), 0 0 18px rgba(255, 95, 162, 0.35)",
        borderRadiusPx: 28,
        popDurationMs: 220
      },
      rpg: {
        fontSizePx: 38,
        cardBackground: "linear-gradient(145deg, rgba(52, 38, 18, 0.96), rgba(20, 14, 8, 0.96))",
        textColor: "#fff5d6",
        accentColor: "#ffd76a",
        border: "3px double rgba(255, 215, 106, 0.95)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.48), inset 0 0 20px rgba(255, 215, 106, 0.12)",
        borderRadiusPx: 12,
        popDurationMs: 280
      },
      dark: {
        fontSizePx: 36,
        cardBackground: "linear-gradient(135deg, rgba(38, 42, 72, 0.94), rgba(15, 18, 32, 0.94))",
        textColor: "#f5fbff",
        accentColor: "#7df9ff",
        border: "2px solid rgba(125, 249, 255, 0.82)",
        boxShadow: "0 14px 34px rgba(0, 0, 0, 0.42), 0 0 22px rgba(125, 249, 255, 0.28)",
        borderRadiusPx: 999,
        popDurationMs: 240
      },
      rpg2: {
        fontSizePx: 38,
        cardMaxWidthPx: 400,
        cardBackground: "rgba(4, 0, 255, 0.5)",
        textColor: "#ffffff",
        accentColor: "#ffffff",
        border: "5px solid rgba(255, 255, 255, 0.9)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.28), 0 0 18px rgba(255, 95, 162, 0.35)",
        borderRadiusPx: 28,
        popDurationMs: 220
      },
      horror: {
        fontSizePx: 36,
        cardBackground: "linear-gradient(145deg, rgba(24, 8, 12, 0.96), rgba(5, 5, 8, 0.97))",
        textColor: "#f4e8e8",
        accentColor: "#ff4d5f",
        border: "2px solid rgba(180, 24, 42, 0.9)",
        boxShadow: "0 14px 36px rgba(0, 0, 0, 0.58), 0 0 20px rgba(180, 24, 42, 0.3)",
        borderRadiusPx: 8,
        popDurationMs: 320
      },
      sf: {
        fontSizePx: 36,
        cardBackground: "linear-gradient(135deg, rgba(5, 20, 38, 0.95), rgba(8, 46, 58, 0.92))",
        textColor: "#e8fdff",
        accentColor: "#56f5ff",
        border: "2px solid rgba(86, 245, 255, 0.86)",
        boxShadow: "0 14px 34px rgba(0, 0, 0, 0.46), 0 0 24px rgba(86, 245, 255, 0.3)",
        borderRadiusPx: 6,
        popDurationMs: 210
      },
      recipe: {
        fontSizePx: 36,
        cardBackground: "rgba(255, 248, 224, 0.96)",
        textColor: "#4a2d1b",
        accentColor: "#e76f35",
        border: "3px solid rgba(231, 111, 53, 0.88)",
        boxShadow: "0 12px 30px rgba(74, 45, 27, 0.28)",
        borderRadiusPx: 24,
        popDurationMs: 240
      },
      system: {
        fontSizePx: 34,
        cardBackground: "rgba(12, 18, 28, 0.94)",
        textColor: "#f2f7ff",
        accentColor: "#8eb8ff",
        border: "2px solid rgba(142, 184, 255, 0.82)",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.46), inset 0 0 18px rgba(142, 184, 255, 0.08)",
        borderRadiusPx: 10,
        popDurationMs: 180
      }
    },
    overrides: {},
    eventColor: {
      enabled: true,
      kinds: [
        "superchat",
        "supersticker",
        "membership_gift",
        "member_join",
        "member_milestone",
        "membership_event"
      ],
      useFallbackColors: true,
      fallbackColors: {
        member_join: "rgb(43, 166, 64)",
        membership_gift: "rgb(43, 166, 64)",
        member_milestone: "rgb(43, 166, 64)",
        membership_event: "rgb(43, 166, 64)"
      },
      textColor: "#ffffff",
      accentColor: "#ffffff",
      border: "4px solid rgba(255, 255, 255, 0.95)",
      boxShadow: "0 12px 34px rgba(0, 0, 0, 0.38), 0 0 18px rgba(255, 255, 255, 0.28)"
    }
  },
  debug: false
};
