(function () {
  'use strict';

  const runtime = window.VCT_CONFIG_RUNTIME;
  const schema = window.VCT_SETTINGS_SCHEMA;
  if (!runtime || !schema) return;

  let draft = { ...runtime.effective };
  let root;
  let controls;
  let sourceText;
  let statusText;
  let colorPicker;
  let colorPickerMount;
  const panelSideKey = `${runtime.storageKey}.panel-side`;
  let panelSide = 'right';
  let panelCollapsed = false;

  try {
    panelSide = window.localStorage.getItem(panelSideKey) === 'left' ? 'left' : 'right';
  } catch (_) {}

  const setStatus = (message, isError = false) => {
    statusText.textContent = message || '';
    statusText.classList.toggle('is-error', isError);
  };

  const fieldKeys = () => Object.values(schema).flatMap(section => Object.keys(section.fields));

  const normalizedConfig = (source) => {
    const result = {};
    for (const key of fieldKeys()) {
      if (Object.prototype.hasOwnProperty.call(source || {}, key)) result[key] = source[key];
    }
    return result;
  };

  const updateSource = () => {
    const labels = {
      localStorage: 'ローカル設定を適用中',
      'config.js': 'config.js を適用中',
      'config_default.js': '初期設定を適用中'
    };
    sourceText.textContent = labels[runtime.source] || runtime.source;
  };

  const normalizeHexColor = (value) => {
    const text = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text;
    if (/^[0-9a-f]{6}$/i.test(text)) return `#${text}`;
    return text;
  };

  const makeInput = (key, field) => {
    const wrap = document.createElement('label');
    wrap.className = 'vct-settings-field';
    const title = document.createElement('span');
    title.textContent = field.label;
    wrap.appendChild(title);

    const row = document.createElement('span');
    row.className = 'vct-settings-input-row';
    const input = document.createElement('input');
    input.dataset.configKey = key;

    if (field.type === 'checkbox') {
      input.type = 'checkbox';
      input.checked = !!draft[key];
    } else if (field.type === 'color') {
      const value = draft[key] ?? '';
      const picker = document.createElement('input');
      const text = document.createElement('input');
      const colorValue = normalizeHexColor(value);
      picker.type = 'color';
      picker.value = /^#[0-9a-f]{6}$/i.test(colorValue) ? colorValue : '#ffffff';
      picker.className = 'vct-settings-color-picker';
      text.type = 'text';
      text.value = value;
      text.dataset.configKey = key;
      text.className = 'vct-settings-color-text';
      if (colorPicker) {
        colorPicker.attach(text, { label: field.label });
      }
      picker.addEventListener('input', () => {
        text.value = picker.value;
        text.dispatchEvent(new Event('input', { bubbles: true }));
      });
      text.addEventListener('input', () => {
        const normalized = normalizeHexColor(text.value);
        if (/^#[0-9a-f]{6}$/i.test(normalized)) {
          picker.value = normalized;
        }
      });
      text.addEventListener('blur', () => {
        text.value = normalizeHexColor(text.value);
      });
      row.append(picker, text);
      wrap.appendChild(row);
      return wrap;
    } else if (field.type === 'range') {
      input.type = 'range';
      input.min = field.min;
      input.max = field.max;
      input.step = field.step;
      input.value = draft[key];
      const output = document.createElement('output');
      output.textContent = draft[key];
      input.addEventListener('input', () => { output.textContent = input.value; });
      row.append(input, output);
      wrap.appendChild(row);
      return wrap;
    } else if (field.type === 'range-number') {
      const slider = document.createElement('input');
      const number = document.createElement('input');
      slider.type = 'range';
      slider.min = field.min;
      slider.max = field.max;
      slider.step = field.step;
      slider.value = draft[key];
      slider.className = 'vct-settings-position-slider';
      number.type = 'number';
      number.min = field.min;
      number.max = field.max;
      number.step = 1;
      number.value = draft[key];
      number.dataset.configKey = key;
      number.className = 'vct-settings-position-number';
      slider.addEventListener('input', () => { number.value = slider.value; });
      number.addEventListener('input', () => { slider.value = number.value; });
      row.append(slider, number);
      wrap.appendChild(row);
      return wrap;
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      select.dataset.configKey = key;
      for (const optionValue of field.options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        option.selected = draft[key] === optionValue;
        select.appendChild(option);
      }
      row.appendChild(select);
      wrap.appendChild(row);
      return wrap;
    } else {
      input.type = field.type === 'color' && /^#[0-9a-f]{6}$/i.test(draft[key] || '') ? 'color' : field.type;
      input.value = draft[key] ?? '';
    }

    row.appendChild(input);
    wrap.appendChild(row);
    return wrap;
  };

  const render = () => {
    controls.replaceChildren();
    for (const section of Object.values(schema)) {
      const group = document.createElement('section');
      group.className = 'vct-settings-section';
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      group.appendChild(heading);
      for (const [key, field] of Object.entries(section.fields)) {
        group.appendChild(makeInput(key, field));
      }
      controls.appendChild(group);
    }
    colorPicker?.refresh();
  };

  const collect = () => {
    const next = { ...draft };
    controls.querySelectorAll('[data-config-key]').forEach(input => {
      const key = input.dataset.configKey;
      if (input.type === 'checkbox') next[key] = input.checked;
      else if (input.type === 'number' || input.type === 'range') next[key] = Number(input.value);
      else if (input.classList.contains('vct-settings-color-text')) next[key] = normalizeHexColor(input.value);
      else next[key] = input.value;
    });
    return next;
  };

  const emitPreview = (nextConfig) => {
    window.dispatchEvent(new CustomEvent('vct-settings-preview', {
      detail: { ...(nextConfig || collect()) }
    }));
  };

  const loadDraft = (source, message) => {
    draft = { ...runtime.defaults, ...normalizedConfig(source) };
    render();
    emitPreview(draft);
    setStatus(message);
  };

  const parseConfigFile = (text) => {
    const sandbox = {};
    const result = Function('window', `${text}\n; return window.CONFIG || window.CONFIG_FILE;`)(sandbox);
    if (!result || typeof result !== 'object') throw new Error('window.CONFIG が見つかりません。');
    return result;
  };

  const createButton = (label, className, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  };

  const updatePanelUi = () => {
    if (!root) return;
    root.classList.toggle('is-left', panelSide === 'left');
    root.classList.toggle('is-collapsed', panelCollapsed);
    const sideButton = root.querySelector('.vct-settings-side-toggle');
    const collapseButton = root.querySelector('.vct-settings-collapse-toggle');
    if (sideButton) {
      sideButton.title = panelSide === 'right' ? '設定パネルを左へ移動' : '設定パネルを右へ移動';
      sideButton.setAttribute('aria-label', sideButton.title);
    }
    if (collapseButton) {
      collapseButton.textContent = panelCollapsed ? '▣' : '—';
      collapseButton.title = panelCollapsed ? '設定パネルを展開' : '設定パネルを折りたたんで確認';
      collapseButton.setAttribute('aria-label', collapseButton.title);
    }
  };

  const togglePanelSide = () => {
    panelSide = panelSide === 'right' ? 'left' : 'right';
    try { window.localStorage.setItem(panelSideKey, panelSide); } catch (_) {}
    updatePanelUi();
  };

  const togglePanelCollapsed = () => {
    panelCollapsed = !panelCollapsed;
    updatePanelUi();
  };

  const applyPlacementPreset = (placement, label) => {
    const next = collect();
    const width = Math.max(Number(next.COMMENT_WIDTH) || 760, 240);
    const height = Math.max(Number(next.COMMENT_HEIGHT) || 880, 200);
    const scale = Math.max(Number(next.COMMENT_SCALE) || 1, 0.1);
    const marginX = 70;
    const marginY = 80;
    const right = Math.max(0, Math.round(1920 - width * scale - marginX));
    const bottom = Math.max(0, Math.round(1080 - height * scale - marginY));
    const centerX = Math.max(0, Math.round((1920 - width * scale) / 2));
    const centerY = Math.max(0, Math.round((1080 - height * scale) / 2));
    const positions = {
      'left-top': [marginX, marginY],
      'left-bottom': [marginX, bottom],
      'right-top': [right, marginY],
      'right-bottom': [right, bottom],
      center: [centerX, centerY]
    };
    const [x, y] = positions[placement] || positions['left-bottom'];
    loadDraft({ ...next, COMMENT_X: x, COMMENT_Y: y }, `${label}へ配置しました。保存するまで確定されません。`);
  };

  const build = () => {
    root = document.createElement('div');
    root.id = 'vct-settings-root';
    root.hidden = true;

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'vct-settings-backdrop';
    backdrop.setAttribute('aria-label', '設定を閉じる');
    backdrop.addEventListener('click', close);

    const panel = document.createElement('aside');
    panel.className = 'vct-settings-panel';
    panel.setAttribute('aria-label', '表示設定');

    const header = document.createElement('header');
    const headingWrap = document.createElement('div');
    headingWrap.className = 'vct-settings-heading';
    const heading = document.createElement('h2');
    heading.textContent = '表示設定';
    sourceText = document.createElement('p');
    sourceText.className = 'vct-settings-source';
    headingWrap.append(heading, sourceText);
    const closeButton = createButton('\u00d7', 'vct-settings-close', close);
    closeButton.title = '閉じる';
    const headerActions = document.createElement('div');
    headerActions.className = 'vct-settings-header-actions';
    const sideButton = createButton('⇆', 'vct-settings-side-toggle', togglePanelSide);
    const collapseButton = createButton('—', 'vct-settings-collapse-toggle', togglePanelCollapsed);
    headerActions.append(sideButton, collapseButton, closeButton);
    header.append(headingWrap, headerActions);

    controls = document.createElement('div');
    controls.className = 'vct-settings-controls';
    controls.addEventListener('input', () => {
      draft = collect();
      emitPreview(draft);
      setStatus('プレビュー中です。保存するまで確定されません。');
    });
    controls.addEventListener('change', () => {
      draft = collect();
      emitPreview(draft);
    });

    const tools = document.createElement('div');
    tools.className = 'vct-settings-tools';
    tools.append(
      createButton('現在の設定', 'is-secondary', () => loadDraft(runtime.effective, '現在の適用値を読み込みました。')),
      createButton('config.js', 'is-secondary', () => loadDraft(runtime.baseline, 'config.js の値を読み込みました。')),
      createButton('初期設定', 'is-secondary', () => loadDraft(runtime.defaults, '初期設定を読み込みました。')),
      createButton('背景・枠を透明', 'is-secondary', () => loadDraft({
        ...collect(),
        BG_OPACITY: 0,
        BG_GLASS: 'rgba(0, 0, 0, 0)',
        BG_BLUR: '0px',
        BASE_BORDER_OPACITY: 0,
        GIFT_BG_OPACITY: 0,
        GIFT_BORDER_OPACITY: 0,
        MEMBER_BG_OPACITY: 0,
        MEMBER_BORDER_OPACITY: 0,
        SYSTEM_BORDER_OPACITY: 0,
        SHADOW_SOFT: 'none'
      }, '背景・枠線・影を透明化してプレビューしています。'))
    );

    const placementTools = document.createElement('div');
    placementTools.className = 'vct-settings-placement-tools';
    const placementLabel = document.createElement('span');
    placementLabel.textContent = '配置';
    placementTools.append(
      placementLabel,
      createButton('左上', 'is-secondary', () => applyPlacementPreset('left-top', '左上')),
      createButton('左下', 'is-secondary', () => applyPlacementPreset('left-bottom', '左下')),
      createButton('中央', 'is-secondary', () => applyPlacementPreset('center', '中央')),
      createButton('右上', 'is-secondary', () => applyPlacementPreset('right-top', '右上')),
      createButton('右下', 'is-secondary', () => applyPlacementPreset('right-bottom', '右下'))
    );
    tools.appendChild(placementTools);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.js,text/javascript';
    fileInput.hidden = true;
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        loadDraft(parseConfigFile(await file.text()), `${file.name} を読み込み、プレビューしています。保存するまで確定されません。`);
      } catch (error) {
        setStatus(`読み込みに失敗しました: ${error.message}`, true);
      } finally {
        fileInput.value = '';
      }
    });
    tools.append(createButton('ファイルから読込', 'is-secondary', () => fileInput.click()), fileInput);

    colorPickerMount = document.createElement('div');
    colorPickerMount.className = 'vct-settings-inline-color-picker';
    if (window.VCTInlineColorPicker?.create) {
      colorPicker = window.VCTInlineColorPicker.create({ mount: colorPickerMount });
    }

    statusText = document.createElement('p');
    statusText.className = 'vct-settings-status';

    const footer = document.createElement('footer');
    footer.append(
      createButton('ローカル設定を削除', 'is-danger', () => {
        runtime.clearLocal();
        runtime.broadcastReload?.('settings-cleared');
        window.location.reload();
      }),
      createButton('保存して再読み込み', 'is-primary', () => {
        try {
          runtime.writeLocal(collect());
          runtime.broadcastReload?.('settings-saved');
          window.location.reload();
        } catch (error) {
          setStatus('ローカル設定を保存できませんでした。', true);
        }
      })
    );

    panel.append(header, tools, colorPickerMount, controls, statusText, footer);
    root.append(backdrop, panel);
    document.body.appendChild(root);
    updateSource();
    render();
    updatePanelUi();
  };

  function open() {
    if (!root) build();
    draft = { ...runtime.effective };
    panelCollapsed = false;
    render();
    setStatus('設定変更は画面へ一時反映されます。保存するまで確定されません。');
    root.hidden = false;
    updatePanelUi();
    document.documentElement.classList.add('vct-settings-open');
  }

  function close() {
    if (!root) return;
    window.dispatchEvent(new CustomEvent('vct-settings-reset-preview'));
    draft = { ...runtime.effective };
    root.hidden = true;
    document.documentElement.classList.remove('vct-settings-open');
    document.getElementById('vct-settings-launcher')?.blur();
  }

  window.VCT_SETTINGS_PANEL = Object.freeze({ open, close });
})();
