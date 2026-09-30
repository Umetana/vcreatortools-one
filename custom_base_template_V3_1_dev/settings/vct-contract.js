// テンプレートUIとVCT通信は同じ項目定義・初期値・検証処理を使う。
(function () {
  const { templateId, schemaVersion, templateVersion } = window.VCT_TEMPLATE_DEFINITION;
  window.VCT_TEMPLATE_SETTINGS = window.VCT_SETTINGS_CONTRACT.create({
    templateId, schemaVersion, templateVersion,
    sections: window.VCT_SETTINGS_SCHEMA,
    defaults: { ...window.VCT_CONFIG_RUNTIME.baseline }
  });
})();
