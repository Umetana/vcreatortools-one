(function () {
  'use strict';

  const launcherStyle = document.createElement('style');
  launcherStyle.textContent = `
    #vct-settings-launcher {
      position: fixed;
      right: 12px;
      bottom: 12px;
      z-index: 2147483000;
      width: 42px;
      height: 42px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.9);
      color: #fff;
      font: 24px/1 sans-serif;
      cursor: pointer;
      opacity: 0;
      transform: translateY(5px);
      transition: opacity 160ms ease, transform 160ms ease;
    }
    #vct-settings-launcher:hover,
    #vct-settings-launcher:focus-visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(launcherStyle);

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.id = 'vct-settings-launcher';
  launcher.textContent = '\u2699';
  launcher.title = '表示設定を開く';
  launcher.setAttribute('aria-label', '表示設定を開く');
  document.body.appendChild(launcher);

  let loading = false;

  const loadStyle = (href) => new Promise((resolve, reject) => {
    if (document.querySelector(`link[data-vct-settings="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.vctSettings = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-vct-settings="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.vctSettings = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  launcher.addEventListener('click', async () => {
    if (window.VCT_SETTINGS_PANEL?.open) {
      window.VCT_SETTINGS_PANEL.open();
      return;
    }
    if (loading) return;
    loading = true;
    launcher.disabled = true;
    try {
      await Promise.all([
        loadStyle('./settings/settings-panel.css'),
        loadScript('./settings/settings-schema.js')
      ]);
      await loadScript('./settings/settings-panel.js');
      window.VCT_SETTINGS_PANEL?.open();
    } catch (error) {
      console.error('[VCT Settings] panel load failed.', error);
      launcher.title = '設定UIの読み込みに失敗しました';
    } finally {
      loading = false;
      launcher.disabled = false;
    }
  });
})();
