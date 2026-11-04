// VCT連携用の識別と、同梱演出の定義生成順。
window.VCT_TEMPLATE_DEFINITION = {
  "templateId": "vct_christmas_stage_fx",
  "schemaVersion": 1,
  "templateVersion": "0.2.0",
  "contractFile": "christmas-stage-fx-contract.js",
  "definitionScripts": [
    "config_default.js",
    "config.js",
    "settings/definition-prepare.js",
    "runtime/effect-registry.js",
    "effects/sample_effect/main.js",
    "effects/heart_effect/main.js",
    "effects/stars_effect/main.js",
    "effects/confetti_effect/main.js",
    "effects/sparkle_effect/main.js",
    "effects/christmas_tree/main.js",
    "effects/christmas_snow/main.js",
    "effects/christmas_lights/main.js",
    "effects/christmas_present/main.js",
    "widgets/comments/settings-schema.js",
    "settings/settings-schema.js",
    "settings/definition-defaults.js"
  ],
  "visibility": { "display": "DISPLAY_MODE", "effect": "COMMENT_EFFECT", "plugin": "STAGE_EFFECT_ID" },
  "placement": {
    "section": "comments",
    "fullscreenWhen": [
      {
        "DISPLAY_MODE": "underbar"
      },
      {
        "DISPLAY_MODE": "popup",
        "POPUP_PLACEMENT": "random"
      }
    ]
  }
};
