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
  let activeTab = 'placement', tabBar, placementPresets;
  let placementEditing = false, placementOverlay, editButton, drag;
  const endDrag = () => {
    if (drag && placementOverlay?.hasPointerCapture(drag.id)) placementOverlay.releasePointerCapture(drag.id);
    drag = null;
  };
  const syncPlacementEditor = () => {
    if (!placementOverlay) return;
    const unavailable = draft.DISPLAY_MODE === 'underbar' || (draft.DISPLAY_MODE === 'popup' && draft.POPUP_PLACEMENT !== 'anchor');
    if (unavailable || activeTab !== 'placement' || root.hidden) placementEditing = false;
    editButton.disabled = unavailable;
    editButton.setAttribute('aria-pressed', String(placementEditing));
    editButton.textContent = placementEditing ? 'マウス配置を終了' : 'マウスで配置調整';
    placementOverlay.hidden = !placementEditing;
    if (!placementEditing) { endDrag(); return; }
    const rect = document.getElementById('stage').getBoundingClientRect();
    const scale = rect.width / 1920;
    Object.assign(placementOverlay.style, {
      left: (rect.left + draft.COMMENT_X * scale) + 'px', top: (rect.top + draft.COMMENT_Y * scale) + 'px',
      width: (draft.COMMENT_WIDTH * draft.COMMENT_SCALE * scale) + 'px',
      height: (draft.COMMENT_HEIGHT * draft.COMMENT_SCALE * scale) + 'px'
    });
  };
  // 既存の数値入力を経由し、丸め・下書き・保存・取消を一本化する。
  const setPlacementValue = (key, value) => {
    const input = controls.querySelector('[data-range-key="' + key + '"]');
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const tabs = { stage: 'ステージ', placement: 'コメント配置', display: 'コメント表示', decoration: 'コメント装飾', effects: '画面演出' };
  const updateVisibility = () => {
    syncPlacementEditor();
    const fullscreen = draft.DISPLAY_MODE === 'underbar' || (draft.DISPLAY_MODE === 'popup' && draft.POPUP_PLACEMENT !== 'anchor');
    controls.querySelectorAll('[data-config-field]').forEach(field => {
      if (!['COMMENT_X','COMMENT_Y','COMMENT_WIDTH','COMMENT_HEIGHT','COMMENT_SCALE'].includes(field.dataset.configField)) return;
      field.classList.toggle('is-disabled', fullscreen);
      field.querySelectorAll('input').forEach(input => { input.disabled = fullscreen; });
    });
    placementPresets?.querySelectorAll('button').forEach(button => { button.disabled = fullscreen; });
    controls.querySelectorAll('[data-section]').forEach(group => {
      const section = schema[group.dataset.section];
      group.hidden = section.tab !== activeTab || (!!section.effect && section.effect !== draft.COMMENT_EFFECT) || (!!section.display && section.display !== draft.DISPLAY_MODE) || (!!section.plugin && section.plugin !== draft.STAGE_EFFECT_ID);
      group.querySelectorAll('[data-config-field]').forEach(field => {
        const key = field.dataset.configField;
        const ticker = ['UNDERBAR_SPEED','UNDERBAR_QUEUE','UNDERBAR_LANES','UNDERBAR_LANE_MODE','UNDERBAR_LANE_GAP'];
        const stack = ['UNDERBAR_SLIDE_MS','UNDERBAR_EXIT_CARDS'];
        field.hidden = (key === 'STAGE_EFFECT_COUNT' && window.VCTStage.registry.get(draft.STAGE_EFFECT_ID)?.manifest.usesCommonCount === false) || (ticker.includes(key) && draft.UNDERBAR_MODE === 'stack') || (stack.includes(key) && draft.UNDERBAR_MODE !== 'stack') || (['POPUP_X','POPUP_Y','POPUP_SPREAD_X','POPUP_SPREAD_Y'].includes(key) && draft.POPUP_PLACEMENT !== 'anchor');
      });
    });
    const note = controls.querySelector('.vct-placement-note');
    if (note) note.textContent = draft.DISPLAY_MODE === 'underbar' || (draft.DISPLAY_MODE === 'popup' && draft.POPUP_PLACEMENT !== 'anchor')
      ? '現在はステージ全面を使用しています。下の指定領域の数値は保持され、縦積み・ポップアップ基準位置に戻すと適用されます。'
      : '縦積み・ポップアップ基準位置で使う領域です。全面表示へ切り替えても数値は保持されます。';
    const manager = controls.querySelector('.vct-effect-manager'); if (manager) manager.hidden = activeTab !== 'effects';
    tabBar?.querySelectorAll('[role="tab"]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.tab === activeTab)));
    root.querySelector('.vct-settings-placement-presets')?.toggleAttribute('hidden', activeTab !== 'placement');
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
    sourceText.textContent = `編集中：${runtime.profileId} ／ ${labels[runtime.source] || runtime.source}${runtime.profileWarning ? " ／ " + runtime.profileWarning : ""}`;
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
    wrap.dataset.configField = key;
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
    } else if (field.type === 'range' || field.type === 'range-number') {
      input.type = 'range';
      input.min = field.min;
      input.max = field.max;
      input.step = field.step;
      input.value = draft[key];
      const number = document.createElement('input');
      number.type = 'number';
      number.className = 'vct-settings-range-number';
      number.dataset.rangeKey = key;
      number.setAttribute('aria-label', field.label + '（数値入力）');
      input.setAttribute('aria-label', field.label + '（スライダー）');
      number.min = input.min; number.max = input.max; number.step = field.numberStep ?? input.step;
      if (field.numberStep !== undefined) {
        // スライダーの目盛と保存値を分離し、1pxで合わせた値を丸め戻さない。
        let committed = Number(draft[key]);
        const normalizer = document.createElement('input');
        normalizer.type = 'range'; normalizer.min = field.min; normalizer.max = field.max; normalizer.step = field.numberStep;
        const sync = value => {
          normalizer.value = value;
          committed = Number(normalizer.value);
          input.value = committed; input.dataset.preciseValue = committed; number.value = committed;
        };
        sync(committed);
        const commit = () => {
          sync(number.value.trim() !== '' && Number.isFinite(number.valueAsNumber) ? number.value : committed);
          number.dispatchEvent(new Event('change', { bubbles: true }));
        };
        number.addEventListener('input', event => event.stopPropagation());
        number.addEventListener('change', () => { sync(number.value.trim() !== '' && Number.isFinite(number.valueAsNumber) ? number.value : committed); });
        number.addEventListener('blur', commit);
        number.addEventListener('keydown', event => {
          if (event.key === 'Enter') { event.preventDefault(); commit(); }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            normalizer.value = number.value.trim() !== '' && Number.isFinite(number.valueAsNumber) ? number.value : committed;
            if (event.key === 'ArrowUp') normalizer.stepUp(); else normalizer.stepDown();
            number.value = normalizer.value; commit();
          }
        });
        input.addEventListener('input', () => sync(input.value));
        row.append(input, number); wrap.appendChild(row); return wrap;
      }
      number.value = input.value;
      const commitNumber = () => {
        // range自身の範囲・刻みへの補正を利用し、小数の誤差も揃える。
        if (number.value.trim() !== '' && Number.isFinite(number.valueAsNumber)) input.value = number.value;
        number.value = input.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      // 入力途中の空欄や小数は設定へ流さず、確定時に反映する。
      number.addEventListener('input', event => event.stopPropagation());
      number.addEventListener('change', commitNumber);
      number.addEventListener('blur', commitNumber);
      number.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); commitNumber(); }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          if (number.value.trim() !== '' && Number.isFinite(number.valueAsNumber)) input.value = number.value;
          if (event.key === 'ArrowUp') input.stepUp(); else input.stepDown();
          number.value = input.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      input.addEventListener('input', () => { number.value = input.value; });
      row.append(input, number);
      wrap.appendChild(row);
      return wrap;
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      select.dataset.configKey = key;
      for (const optionValue of field.options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = field.labels?.[optionValue] || optionValue;
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

  const renderEffectManager = () => {
    const group = document.createElement('section');
    group.className = 'vct-settings-section vct-effect-manager';
    const title = document.createElement('h3'); title.textContent = '演出の追加・登録解除';
    const help = document.createElement('p'); help.textContent = 'effects内にフォルダを置き、IDを入力します。一覧の変更は即時保存されます。';
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Effect ID（フォルダ名）'; input.setAttribute('aria-label', 'Effect ID');
    async function change(id, enabled) {
      draft = collect();
      group.querySelectorAll('button').forEach(button => { button.disabled = true; });
      try {
        await window.VCTStage.catalog.change(id, enabled);
        render(); emitPreview(draft); setStatus('演出一覧を保存しました（演出フォルダは変更しません）');
      } catch (error) { setStatus(error.message, true); }
      finally { group.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
    }
    const add = createButton('演出IDを追加', 'is-secondary', () => change(input.value.trim(), true));
    group.append(title, help, input, add);
    for (const entry of window.VCTStage.catalog.entries()) {
      const row = document.createElement('p');
      const name = document.createElement('span'); name.textContent = `${entry.name} (${entry.id}) `;
      row.append(name);
      if (entry.id !== 'sample_effect') row.append(createButton(entry.standard ? (entry.enabled ? '無効化' : '有効化') : '登録解除', 'is-secondary', () => change(entry.id, entry.standard && !entry.enabled)));
      group.append(row);
    }
    for (const [id, message] of window.VCTStage.catalog.errors) {
      const text = document.createElement('p'); text.textContent = `${id}: ${message}`; group.append(text);
    }
    controls.append(group);
  };

  const render = () => {
    window.VCT_REFRESH_EFFECT_SCHEMA();
    draft = { ...runtime.effective, ...draft };
    if (!window.VCTStage.registry.get(draft.STAGE_EFFECT_ID)) draft.STAGE_EFFECT_ID = 'sample_effect';
    controls.replaceChildren();
    renderEffectManager();
    for (const [sectionId, section] of Object.entries(schema)) {
      const group = document.createElement('section');
      group.className = 'vct-settings-section';
      group.dataset.section = sectionId;
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      group.appendChild(heading);
      if (sectionId === 'comments') {
        const note = document.createElement('p'); note.className = 'vct-placement-note'; group.append(note);
        if (placementPresets) group.append(placementPresets);
      }
      for (const [key, field] of Object.entries(section.fields)) {
        group.appendChild(makeInput(key, field));
      }
      controls.appendChild(group);
    }
    updateVisibility();
    colorPicker?.refresh();
  };

  const collect = () => {
    const next = { ...draft };
    controls.querySelectorAll('[data-config-key]').forEach(input => {
      const key = input.dataset.configKey;
      if (input.type === 'checkbox') next[key] = input.checked;
      else if (input.type === 'number' || input.type === 'range') next[key] = Number(input.dataset.preciseValue ?? input.value);
      else if (input.classList.contains('vct-settings-color-text')) next[key] = normalizeHexColor(input.value);
      else next[key] = input.value;
    });
    return next;
  };

  const emitPreview = (nextConfig) => {
    window.dispatchEvent(new CustomEvent('vct-settings-preview', {
      detail: { ...(nextConfig || collect()) }
    }));
    syncPlacementEditor();
  };

  const loadDraft = (source, message) => {
    draft = { ...runtime.defaults, ...normalizedConfig(source) };
    render();
    emitPreview(draft);
    setStatus(message);
  };

  const parseConfigFile = (text) => {
    const match = String(text).trim().replace(/^\/\/[^\n]*\n/gm, '').trim().match(/^window\.CONFIG\s*=\s*([\s\S]*?);?\s*$/);
    if (!match) throw new Error('window.CONFIG = JSON形式の設定を指定してください');
    const result = JSON.parse(match[1]);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('window.CONFIG が見つかりません。');
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
    const versionText = document.createElement('p');
    versionText.className = 'vct-settings-version';
    versionText.textContent = 'VCT Stage FX 初期実装';
    headingWrap.append(heading, versionText, sourceText);
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
      updateVisibility();
      setStatus('プレビュー中です。保存するまで確定されません。');
    });
    controls.addEventListener('change', () => {
      draft = collect();
      emitPreview(draft);
      updateVisibility();
    });

    const tools = document.createElement('div');
    tools.className = 'vct-settings-tools';
    const loadTools = document.createElement('details');
    loadTools.className = 'vct-settings-load-tools';
    const loadSummary = document.createElement('summary'); loadSummary.textContent = '設定の読込・初期化';
    loadTools.append(loadSummary);
    tools.append(loadTools);
    loadTools.append(
      createButton('現在の設定', 'is-secondary', () => loadDraft(runtime.effective, '現在の適用値を読み込みました。')),
      createButton('config.js', 'is-secondary', () => loadDraft(runtime.baseline, 'config.js の値を読み込みました。')),
      createButton('初期設定', 'is-secondary', () => loadDraft(runtime.defaults, '初期設定を読み込みました。')),
      createButton('背景・枠を透明', 'is-secondary', () => loadDraft({
        ...collect(), SHOW_STAGE_BACKGROUND: false, SHOW_COMMENT_FRAME: false
      }, 'ステージ背景と領域の外枠を非表示にしています。'))
    );

    const placementTools = document.createElement('div');
    placementTools.className = 'vct-settings-placement-tools vct-settings-placement-presets';
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
    // 配置ショートカットは初回renderから配置タブに挿入する。
    editButton = createButton('マウスで配置調整', 'is-secondary', () => {
      draft = collect(); placementEditing = !placementEditing; syncPlacementEditor();
      setStatus('枠内をドラッグで移動、ホイールで倍率調整。数値で微調整し、保存で確定します。');
    });
    placementTools.append(editButton);
    placementPresets = placementTools;

    const previewTools = document.createElement('div');
    previewTools.className = 'vct-settings-placement-tools';
    const previewApi = window.VCT_STAGE_PREVIEW;
    if (previewApi) {
      previewTools.append(
        createButton('コメントを試す', 'is-secondary', () => previewApi.comment()),
        createButton('演出を試す', 'is-secondary', () => {
          const result = previewApi.effect();
          const labels = { started: '演出を開始しました', queued: '演出を待機に追加しました' };
          const reasons = {
            'effects-off': 'イベント演出がOFFのため再生しませんでした。',
            'reduced-motion': 'テンプレートの「動きを抑える」がONのため再生しませんでした。',
            'page-hidden': 'ページが非表示のため再生しませんでした。',
            busy: '再生中の演出があるため受け付けませんでした。',
            capacity: '同時実行数または待機数の上限に達しています。',
            'unknown-effect': '選択した演出を読み込めていません。',
            'invalid-params': '演出の設定値が不正です。',
            'execution-error': '演出の開始処理でエラーが発生しました。',
            disabled: '演出の実行基盤が停止しています。'
          };
          setStatus(result.status === 'rejected' ? (reasons[result.reason] || '演出を開始できませんでした。') : labels[result.status], result.status === 'rejected');
        }),
        createButton('直前の演出を停止', 'is-secondary', () => previewApi.stopLast()),
        createButton('画面演出を全停止', 'is-secondary', () => previewApi.stopAll()),
        createButton('状態を確認', 'is-secondary', () => setStatus(previewApi.status()))
      );
      tools.appendChild(previewTools);
    }

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
    loadTools.append(createButton('ファイルから読込', 'is-secondary', () => fileInput.click()), fileInput);

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

    tabBar = document.createElement('nav');
    tabBar.className = 'vct-settings-tabs'; tabBar.setAttribute('role', 'tablist'); tabBar.setAttribute('aria-label', '設定分類');
    controls.id = 'vct-settings-tab-content'; controls.setAttribute('role', 'tabpanel');
    for (const [id, label] of Object.entries(tabs)) {
      const button = createButton(label, 'is-secondary', () => { draft = collect(); activeTab = id; updateVisibility(); controls.scrollTop = 0; colorPicker?.close?.(); });
      button.dataset.tab = id; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', controls.id); tabBar.append(button);
    }
    panel.append(header, tabBar, tools, colorPickerMount, controls, statusText, footer);
    placementOverlay = document.createElement('div');
    placementOverlay.className = 'vct-placement-editor';
    placementOverlay.hidden = true;
    placementOverlay.textContent = 'コメント領域：ドラッグで移動／ホイールで倍率';
    placementOverlay.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !placementEditing) return;
      event.preventDefault();
      const scale = document.getElementById('stage').getBoundingClientRect().width / 1920;
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY, left:Number(draft.COMMENT_X), top:Number(draft.COMMENT_Y), scale };
      placementOverlay.setPointerCapture(event.pointerId);
    });
    placementOverlay.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      setPlacementValue('COMMENT_X', Math.round(drag.left + (event.clientX-drag.x)/drag.scale));
      setPlacementValue('COMMENT_Y', Math.round(drag.top + (event.clientY-drag.y)/drag.scale));
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) placementOverlay.addEventListener(type, endDrag);
    placementOverlay.addEventListener('wheel', event => {
      if (!placementEditing) return;
      event.preventDefault();
      if (event.deltaY) setPlacementValue('COMMENT_SCALE', Number(draft.COMMENT_SCALE) - Math.sign(event.deltaY)*.05);
    }, {passive:false});
    window.addEventListener('resize', () => { endDrag(); syncPlacementEditor(); });
    window.addEventListener('blur', endDrag);
    window.addEventListener('pagehide', () => { placementEditing = false; syncPlacementEditor(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { placementEditing = false; syncPlacementEditor(); } });
    root.append(backdrop, placementOverlay, panel);
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
    syncPlacementEditor();
    document.documentElement.classList.remove('vct-settings-open');
    document.getElementById('vct-settings-launcher')?.blur();
  }

  window.VCT_SETTINGS_PANEL = Object.freeze({ open, close });
})();
