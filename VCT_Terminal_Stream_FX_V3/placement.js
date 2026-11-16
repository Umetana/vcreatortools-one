(() => {
  'use strict';

  const stage = document.querySelector('#stage');
  const viewport = document.querySelector('#stream-window');
  const outline = document.querySelector('#placement-outline');
  const launcher = document.querySelector('#placement-launcher');
  const panel = document.querySelector('#placement-panel');
  const fields = panel.elements;
  const fieldset = panel.querySelector('#window-placement');
  const header = document.querySelector('#stream-header');
  const fullAngle = document.querySelector('#full-angle');
  const fullDepth = document.querySelector('#full-depth');
  const version = document.querySelector('#placement-version');
  version.textContent = `VCT Terminal Stream FX v${window.TERMINAL_STREAM_FX_VERSION}`;
  version.hidden = false;
  const status = document.querySelector('#placement-status');
  const storageKey = 'vct-terminal-stream-fx-v3:placement';
  const params = new URLSearchParams(location.search);
  const urlFormat = params.get('mode');
  const fallbackFormat = window.TERMINAL_STREAM_FX_MODE === 'json' ? 'json' : 'flow';
  const perspective = 2400;
  const defaultColors = { frontColor: '#84e9d9', backColor: '#75dad0' };
  const opacityValue = document.querySelector('#log-opacity-value');
  const picker = window.VCTInlineColorPicker?.create({ mount: document.querySelector('#log-color-picker') });
  picker?.attach(fields.namedItem('frontColor'), { label: '手前の文字色' });
  picker?.attach(fields.namedItem('backColor'), { label: '奥の文字色' });
  const choiceMount = document.querySelector('#settings-choice-dialog');
  const choiceDialog = window.VCTChoiceDialog?.create({ mount: choiceMount });
  const displayChoice = fields.namedItem('mode');
  let displayTrigger = displayChoice;
  if (choiceDialog) {
    for (const select of panel.querySelectorAll('select')) {
      const label = select.parentElement.firstChild.textContent.trim();
      const trigger = choiceDialog.attach(select, { label });
      trigger.setAttribute('aria-haspopup', 'dialog');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      if (select === displayChoice) displayTrigger = trigger;
    }
    const alignChoiceDialog = () => {
      if (panel.hidden) return;
      choiceMount.style.setProperty('--choice-panel-top', `${panel.getBoundingClientRect().top}px`);
    };
    panel.addEventListener('click', event => {
      if (event.target.closest('.vct-cd-trigger')) alignChoiceDialog();
    }, true);
    window.addEventListener('resize', alignChoiceDialog);
  }

  const isHex = value => /^#[0-9a-f]{6}$/i.test(value);
  const streamOptions = {
    visual: ['cyber', 'terminal'],
    motion: ['scroll', 'top', 'bottom'],
    source: ['mixed', 'comments', 'pseudo']
  };
  const panelSizes = ['standard', 'medium', 'large'];
  const limits = {
    x: [-1920, 1920, 100],
    y: [-1080, 1080, 140],
    width: [240, 3840, 1000],
    height: [120, 2160, 700],
    angle: [-30, 30, 0],
    fullAngle: [-30, 30, 0],
    depth: [-35, 35, 0],
    fullDepth: [-35, 35, 0],
    logOpacity: [0, 100, 100],
    scale: [1, 1, 1]
  };

  function normalize(value) {
    const result = {
      mode: value?.mode === 'window' ? 'window' : 'full',
      panelSize: panelSizes.includes(value?.panelSize) ? value.panelSize : 'standard',
      format: ['flow', 'json'].includes(value?.format) ? value.format : fallbackFormat,
      frame: value?.frame === true
    };
    for (const [key, options] of Object.entries(streamOptions)) {
      result[key] = options.includes(value?.[key]) ? value[key] : options[0];
    }
    for (const [key, fallback] of Object.entries(defaultColors)) {
      result[key] = isHex(value?.[key]) ? value[key].toLowerCase() : fallback;
    }
    for (const [key, [min, max, fallback]] of Object.entries(limits)) {
      result[key] = Number.isFinite(value?.[key])
        ? Math.min(max, Math.max(min, Math.round(value[key]))) : fallback;
    }
    return result;
  }

  let saved = normalize();
  try {
    saved = normalize(JSON.parse(localStorage.getItem(storageKey)));
  } catch (error) {
    console.warn('[Terminal Stream FX] 配置を読み込めませんでした', error);
  }
  let draft = saved;

  const editor = window.VCTPlacementEditor?.create({
    element: outline,
    getCanvasRect: () => stage.getBoundingClientRect(),
    canvasWidth: 1920,
    canvasHeight: 1080,
    limits,
    value: saved,
    onChange(value) {
      draft = normalize({ ...draft, ...value });
      render();
    }
  });

  function fullExtent(rotation, depth) {
    const roll = rotation * Math.PI / 180;
    const pitch = depth * Math.PI / 180;
    let halfWidth = 0;
    let halfHeight = 0;
    // 画面の四隅を回転・投影前の平面へ逆算する。
    for (const x of [-960, 960]) {
      for (const y of [-540, 540]) {
        const projectedX = x * Math.cos(roll) + y * Math.sin(roll);
        const projectedY = y * Math.cos(roll) - x * Math.sin(roll);
        const localY = projectedY / (Math.cos(pitch) + projectedY * Math.sin(pitch) / perspective);
        const localX = projectedX * (1 - localY * Math.sin(pitch) / perspective);
        halfWidth = Math.max(halfWidth, Math.abs(localX));
        halfHeight = Math.max(halfHeight, Math.abs(localY));
      }
    }
    return { width: Math.ceil(2 * halfWidth), height: Math.ceil(2 * halfHeight) };
  }

  function render() {
    panel.dataset.size = draft.panelSize;
    fields.namedItem('panelSize').value = draft.panelSize;
    const isWindow = draft.mode === 'window';
    const { x, y, width, height, angle } = draft;
    const rotation = isWindow ? angle : draft.fullAngle;
    const depth = isWindow ? draft.depth : draft.fullDepth;
    const extent = isWindow ? { width, height } : fullExtent(rotation, depth);
    Object.assign(viewport.style, {
      inset: isWindow ? `${y}px auto auto ${x}px` : `${(1080 - extent.height) / 2}px auto auto ${(1920 - extent.width) / 2}px`,
      width: `${extent.width}px`,
      height: `${extent.height}px`,
      transform: depth ? `perspective(${perspective}px) rotate(${rotation}deg) rotateX(${depth}deg)` : `rotate(${rotation}deg)`
    });
    header.hidden = !isWindow || !draft.frame;
    viewport.classList.toggle('has-frame', !header.hidden);
    fields.namedItem('mode').value = draft.mode;
    const lockedFormat = urlFormat === 'json' || urlFormat === 'flow';
    const format = lockedFormat ? urlFormat : draft.format;
    fields.namedItem('format').value = format;
    fields.namedItem('format').disabled = lockedFormat;
    fields.namedItem('format').title = lockedFormat ? 'URLの mode 指定を使用中' : '';
    if (stage.dataset.commentFormat !== format) {
      stage.dataset.commentFormat = format;
      stage.dispatchEvent(new Event('commentformatchange'));
    }
    let streamChanged = false;
    for (const key of Object.keys(streamOptions)) {
      fields.namedItem(key).value = draft[key];
      if (stage.dataset[key] !== draft[key]) streamChanged = true;
      stage.dataset[key] = draft[key];
    }
    if (streamChanged) stage.dispatchEvent(new Event('streamsettingschange'));
    fieldset.disabled = !isWindow;
    fieldset.hidden = !isWindow;
    fullAngle.hidden = isWindow;
    fullDepth.hidden = isWindow;
    fields.namedItem('frame').checked = draft.frame;
    for (const key of ['x', 'y', 'width', 'height', 'angle', 'fullAngle', 'depth', 'fullDepth']) {
      fields.namedItem(key).value = draft[key];
    }
    outline.hidden = panel.hidden || !isWindow || !editor;
    editor?.setValue(draft);
    editor?.setEnabled(!outline.hidden);
    for (const key of Object.keys(defaultColors)) fields.namedItem(key).value = draft[key];
    fields.namedItem('logOpacity').value = draft.logOpacity;
    fields.namedItem('backColor').disabled = draft.visual === 'terminal' || draft.source === 'comments';
    picker?.refresh();
    choiceDialog?.refresh();
    renderAppearance();
  }

  function renderAppearance() {
    viewport.style.setProperty('--front-color', draft.frontColor);
    viewport.style.setProperty('--back-color', draft.backColor);
    viewport.style.setProperty('--log-opacity', draft.logOpacity / 100);
    opacityValue.textContent = `${draft.logOpacity}%`;
  }

  function close() {
    choiceDialog?.close();
    picker?.close();
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    draft = saved;
    render();
  }

  launcher.hidden = params.get('ui') === '0';
  launcher.addEventListener('click', () => {
    if (!panel.hidden) {
      close();
      return;
    }
    status.textContent = '';
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    render();
    displayTrigger.focus();
  });

  function updateField(field) {
    const key = field.name;
    if (key === 'mode' || key === 'format' || key === 'panelSize' || Object.hasOwn(streamOptions, key)) {
      draft = normalize({ ...draft, [key]: field.value });
    }
    else if (key === 'frame') draft = normalize({ ...draft, frame: field.checked });
    else if (Object.hasOwn(defaultColors, key) && isHex(field.value)) {
      draft = normalize({ ...draft, [key]: field.value });
    }
    else if (Object.hasOwn(limits, key)) {
      const value = field.valueAsNumber;
      if (Number.isFinite(value)) draft = normalize({ ...draft, [key]: value });
    }
    render();
  }

  panel.addEventListener('change', event => updateField(event.target));
  panel.addEventListener('input', ({ target }) => {
    const key = target.name;
    if (key === 'logOpacity') draft = normalize({ ...draft, logOpacity: target.valueAsNumber });
    else if (Object.hasOwn(defaultColors, key) && isHex(target.value)) {
      draft = normalize({ ...draft, [key]: target.value });
    } else return;
    renderAppearance();
  });
  panel.addEventListener('submit', event => {
    event.preventDefault();
    if (panel.contains(document.activeElement)) updateField(document.activeElement);
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      saved = draft;
      close();
    } catch {
      status.textContent = '配置を保存できませんでした。';
    }
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
  document.querySelector('#placement-cancel').addEventListener('click', close);
  document.querySelector('#appearance-reset').addEventListener('click', () => {
    draft = normalize({ ...draft, ...defaultColors, logOpacity: limits.logOpacity[2] });
    render();
  });
  document.querySelector('#placement-reset').addEventListener('click', () => {
    const { x, y, width, height, angle, depth } = normalize();
    draft = normalize({ ...draft, x, y, width, height, angle, depth });
    render();
  });
  render();
})();
