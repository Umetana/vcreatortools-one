// 同梱演出の初期値を、実行時のcatalogと同じ優先順で合成する。
window.VCT_DEFINITION_DEFAULTS = { ...window.CONFIG_DEFAULT, ...window.CONFIG };
for (const Effect of window.VCTStage.registry.effects.values()) {
  for (const [name,field] of Object.entries(Effect.manifest.settings || {})) window.VCT_DEFINITION_DEFAULTS[name] = window.CONFIG[name] ?? field.default;
}
