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
  let materialPreview;
  let reloadConfirmation;
  const syncLayout = () => {
    const random = draft.ARRANGEMENT === 'random';
    for (const key of ['POSITION','OFFSET_X','OFFSET_Y','WRAP_COUNT','ITEM_GAP_PX']) {
      const input = controls?.querySelector('[data-config-key="' + key + '"]');
      if (input) input.closest('.vct-settings-field').hidden = random;
    }
    controls?.querySelectorAll('[data-only-arrangement]').forEach(group => { group.hidden = group.dataset.onlyArrangement !== draft.ARRANGEMENT; });
  };
  const syncMaterial = () => {
    const input = controls?.querySelector('[data-config-key="FX_MATERIAL_FILE"]');
    if(input) input.closest('.vct-settings-field').hidden = draft.FX_MATERIAL_MODE !== 'image';
    materialPreview?.update(draft);
  };

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

    if (field.type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.dataset.configKey = key;
      textarea.value = draft[key] ?? '';
      textarea.rows = 5;
      textarea.maxLength = 2048;
      textarea.setAttribute('aria-label', field.label);
      row.append(textarea);
      wrap.appendChild(row);
      return wrap;
    } else if (field.type === 'placement') {
      input.type = 'number';
      input.min = field.min;
      input.max = field.max;
      input.step = field.numberStep;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = field.min;
      slider.max = field.max;
      slider.step = field.step;
      slider.dataset.placementSlider = key;
      slider.setAttribute('aria-label', field.label + ' スライダー');
      input.setAttribute('aria-label', field.label + ' 数値');
      input.className = 'vct-placement-number';
      const commit = () => {
        const parsed = Number(input.value);
        const previous = Number(input.dataset.committed);
        const value = input.value.trim() && Number.isFinite(parsed) ? parsed : previous;
        const clamped = Math.min(field.max, Math.max(field.min, value));
        const rounded = Number((Math.round(clamped / field.numberStep) * field.numberStep).toFixed(2));
        input.value = rounded;
        input.dataset.committed = rounded;
        slider.value = rounded;
      };
      input.dataset.committed = draft[key] ?? runtime.defaults[key];
      input.value = input.dataset.committed;
      commit();
      // 入力途中の空欄や小数点を壊さず、確定した値だけを共有する。
      input.addEventListener('input', event => event.stopPropagation());
      input.addEventListener('change', commit);
      input.addEventListener('blur', () => input.dispatchEvent(new Event('change', { bubbles: true })));
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      slider.addEventListener('input', () => {
        input.value = slider.value;
        commit();
      });
      row.append(slider, input);
      wrap.appendChild(row);
      return wrap;
    } else if (field.type === 'checkbox') {
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
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      select.dataset.configKey = key;
      for (const optionValue of field.options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = field.optionLabels?.[optionValue] || optionValue;
        option.selected = draft[key] === optionValue;
        select.appendChild(option);
      }
      row.appendChild(select);
      if (key === 'POSITION') {
        select.addEventListener('change', () => {
          if (root.hidden || collect().ARRANGEMENT === 'random') return;
          for (const offsetKey of ['OFFSET_X', 'OFFSET_Y']) {
            const target = controls.querySelector('[data-config-key="' + offsetKey + '"]');
            const value = runtime.defaults[offsetKey];
            target.value = value;
            target.dataset.committed = value;
            controls.querySelector('[data-placement-slider="' + offsetKey + '"]').value = value;
          }
        });
        // 同じ選択肢の選び直しではchangeが出ないため、現在の四隅にも戻せるようにする。
        row.appendChild(createButton('この四隅に戻す', 'is-secondary', () => {
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }));
      }
      wrap.appendChild(row);
      return wrap;
    } else {
      input.type = field.type === 'color' && /^#[0-9a-f]{6}$/i.test(draft[key] || '') ? 'color' : field.type;
      input.value = draft[key] ?? '';
      if (field.type === 'number') input.step = 'any';
    }

    row.appendChild(input);
    wrap.appendChild(row);
    return wrap;
  };

  const render = () => {
    materialPreview?.destroy();
    materialPreview = null;
    controls.replaceChildren();
    for (const section of Object.values(schema)) {
      const group = document.createElement('section');
      group.className = 'vct-settings-section';
      if (section.arrangement) group.dataset.onlyArrangement = section.arrangement;
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      group.appendChild(heading);
      for (const [key, field] of Object.entries(section.fields)) {
        group.appendChild(makeInput(key, field));
      }
      controls.appendChild(group);
    }
    colorPicker?.refresh();
    syncLayout();
    if (window.VCT_EFFECT?.material) {
      const preview = document.createElement('div');
      preview.className = 'vct-material-preview';
      const message = document.createElement('p');
      message.setAttribute('role','status');
      materialPreview = window.VCT_MATERIAL.create(draft, window.VCT_EFFECT.material.emoji || '✨', text => { message.textContent = text; });
      preview.append(materialPreview.element, message);
      controls.append(preview);
      syncMaterial();
    }
  };

  const collect = () => {
    const next = { ...draft };
    controls.querySelectorAll('[data-config-key]').forEach(input => {
      const key = input.dataset.configKey;
      if (input.type === 'checkbox') next[key] = input.checked;
      else if (input.type === 'number' || input.type === 'range') {
        let value=Number(input.value);
        if (input.dataset.committed !== undefined) value = Number(input.dataset.committed);
        next[key]=value;
      }
      else if (input.classList.contains('vct-settings-color-text')) next[key] = normalizeHexColor(input.value);
      else next[key] = input.value;
    });
    return next;
  };

  const emitPreview = (nextConfig) => {
    syncMaterial();
    syncLayout();
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
    const match = text.trim().match(/^window\.CONFIG\s*=\s*([\s\S]*?);?\s*$/);
    if (!match) throw new Error('JSON形式の window.CONFIG 代入を指定してください。');
    const result = JSON.parse(match[1]);
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
      if (root.hidden) return;
      draft = collect();
      emitPreview(draft);
      setStatus('表示はプレビュー中です。カウント・対象者・時間条件は保存時に適用します。');
    });
    controls.addEventListener('change', () => {
      if (root.hidden) return;
      draft = collect();
      emitPreview(draft);
    });

    const tools = document.createElement('div');
    tools.className = 'vct-settings-tools';
    tools.append(
      createButton('変更を保存', 'is-primary', () => saveChanges()),
      createButton('再読み込み', 'is-secondary', () => {
        if (isDirty()) reloadConfirmation.hidden = false;
        else window.location.reload();
      }),
      createButton('現在の設定', 'is-secondary', () => loadDraft(runtime.effective, '現在の適用値を読み込みました。')),
      createButton('config.js', 'is-secondary', () => loadDraft(runtime.baseline, 'config.js の値を読み込みました。')),
      createButton('初期設定', 'is-secondary', () => loadDraft(runtime.defaults, '初期設定を読み込みました。'))
    );

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
    reloadConfirmation = document.createElement('div');
    reloadConfirmation.hidden = true;
    const reloadMessage = document.createElement('p');
    reloadMessage.textContent = '未保存の変更を破棄して再読み込みしますか？';
    reloadConfirmation.append(reloadMessage,
      createButton('破棄して再読み込み', 'is-danger', () => window.location.reload()),
      createButton('取消', 'is-secondary', () => { reloadConfirmation.hidden = true; }));

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
          runtime.commitLocal(collect());
          runtime.broadcastReload?.('settings-saved');
          window.location.reload();
        } catch (error) {
          setStatus('ローカル設定を保存できませんでした。', true);
        }
      })
    );

    const previewTools = document.createElement('div');
    const placementButton = createButton('マウス配置を開始', '', () => window.dispatchEvent(new Event('rom-placement-toggle')));
    placementButton.id = 'rom-placement-toggle';
    window.addEventListener('rom-placement-state', event => {
      placementButton.textContent = event.detail ? 'マウス配置を終了' : 'マウス配置を開始';
      placementButton.setAttribute('aria-pressed', String(event.detail));
    });
    previewTools.append(placementButton);
    const audioStatus = document.createElement('p');
    audioStatus.id = 'rom-audio-status';
    audioStatus.setAttribute('role', 'status');
    audioStatus.textContent = '効果音は初期設定OFF。試聴は編集中の種類・音量で再生します。';
    const audioButton = createButton('爆発音を試聴', '', () => {
      const next = collect();
      window.dispatchEvent(new CustomEvent('rom-audio-test', { detail: { volume: next.SOUND_VOLUME, mode: next.SOUND_MODE } }));
    });
    audioButton.id = 'rom-audio-test';
    previewTools.append(audioButton, audioStatus);
    window.addEventListener('rom-audio-status', event => { audioStatus.textContent = event.detail; });
    for(const [kind,label] of [['demo','短時間で演出を確認'],['stop','確認表示を終了']]) previewTools.append(createButton(label,'',()=>window.dispatchEvent(new CustomEvent('rom-test',{detail:kind}))));
    panel.append(header, previewTools, tools, reloadConfirmation);
    window.VCT_TEMPLATE_LINK?.attach(panel);
    panel.append(colorPickerMount, controls, statusText, footer);
    window.addEventListener('vct-placement-change', event => {
      if(root.hidden) return;
      const {key,value}=event.detail;
      const input=controls.querySelector('[data-config-key="'+key+'"]');
      if(input) { input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); }
    });
    window.addEventListener('rom-placement-change', event => {
      if (root.hidden) return;
      for (const [key, value] of Object.entries(event.detail)) {
        const input = controls.querySelector('[data-config-key="' + key + '"]');
        if (!input) continue;
        input.value = value;
        input.dataset.committed = value;
        const slider = controls.querySelector('[data-placement-slider="' + key + '"]');
        if (slider) slider.value = value;
      }
      draft = collect();
      emitPreview(draft);
      setStatus('マウス配置をプレビュー中です。保存すると確定します。');
    });
    root.append(backdrop, document.getElementById('rom-placement-editor'), panel);
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
    reloadConfirmation.hidden = true;
    setStatus('表示は一時反映、カウント・対象者・時間条件は保存時に適用します。閉じると未保存の設定と確認表示を取り消します。');
    root.hidden = false;
    updatePanelUi();
    document.documentElement.classList.add('vct-settings-open');
  }

  function close() {
    materialPreview?.destroy();
    materialPreview = null;
    if (!root) return;
    root.hidden = true;
    window.dispatchEvent(new CustomEvent('vct-settings-reset-preview'));
    draft = { ...runtime.effective };
    root.hidden = true;
    document.documentElement.classList.remove('vct-settings-open');
    document.getElementById('vct-settings-launcher')?.blur();
  }

  const isDirty = () => root && !root.hidden && Object.entries(collect()).some(([key, value]) => value !== runtime.effective[key]);
  const refreshSaved = () => { if (root) { draft = { ...runtime.effective }; render(); sourceText.textContent = 'ローカル設定を適用中'; reloadConfirmation.hidden = true; } };
  function saveChanges() {
    try {
      runtime.commitLocal(collect());
      refreshSaved();
      setStatus('変更をローカルへ保存・適用しました。再読み込みはしていません。');
    } catch (error) { setStatus('保存できませんでした: ' + error.message, true); }
  }
  window.VCT_SETTINGS_PANEL = Object.freeze({ open, close, isDirty, refreshSaved });
})();
