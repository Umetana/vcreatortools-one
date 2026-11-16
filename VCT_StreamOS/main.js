(() => {
  'use strict';

  const width = 1920;
  const height = 1080;
  const defaults = { x: 108, y: 104, open: true };
  const giftDefaults = { x: 790, y: 104, open: false };
  const galleryDefaults = { x: 240, y: 220, open: false };
  const viewerDefaults = { x: 720, y: 150, open: false };
  const liveDefaults = { x: 1120, y: 104, open: false };
  const storageKey = 'vct.streamos.layout.v1';
  const byId = id => document.getElementById(id);
  const viewport = byId('viewport');
  const desktop = byId('desktop');
  const settingsChoice = window.VCTChoiceDialog?.create({ mount: byId('settings-choice-dialog') });
  const log = byId('log');
  const handle = byId('handle');
  const messages = byId('messages');
  const giftLog = byId('gift-log');
  const giftMessages = byId('gift-messages');
  const giftTask = byId('gift-task');
  const logColors = byId('log-colors');
  const wallpaper = byId('wallpaper');
  const notice = byId('notice');
  const noticeHandle = byId('notice-handle');
  const controls = byId('controls');
  const settings = byId('settings');
  const start = byId('start');
  const startMenu = byId('start-menu');
  const task = byId('task');
  const saveStatus = byId('save-status');
  const connection = byId('connection');
  const clockFormat = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const gallery = byId('gallery');
  const viewer = byId('viewer');
  const viewerImage = byId('viewer-image');
  const viewerError = byId('viewer-error');
  const registeredImages = (Array.isArray(window.STREAMOS_GALLERY_IMAGES) ? window.STREAMOS_GALLERY_IMAGES : [])
    .filter(entry => typeof entry?.file === 'string' && /^[^/\\:%?#]+\.(png|jpe?g|webp|gif|avif)$/i.test(entry.file));
  let images = registeredImages;
  let galleryReady = false;
  // 手前から奥への順序。前面化したウィンドウだけ先頭へ移す。
  const liveStatus = byId('live-status');
  const windows = [
    { box: log, task, state: () => layout },
    { box: giftLog, task: giftTask, state: () => layout.gift },
    { box: gallery, task: byId('gallery-task'), state: () => layout.gallery },
    { box: viewer, task: byId('viewer-task'), state: () => layout.viewer },
    { box: liveStatus, task: byId('live-task'), state: () => layout.liveStatus }
  ];
  const eventTypes = [
    ['superchat', 'スパチャ', true, true],
    ['supersticker', 'スーパーステッカー', true, true],
    ['jewel', 'ジュエル', true, true],
    ['unknown', 'その他のギフト', true, true],
    ['member_join', 'メンバー加入', false, true],
    ['member_milestone', 'メンバー継続', false, false],
    ['membership_gift', 'メンギフ送信', true, true],
    ['membership_gift_received', 'メンギフ受取', false, false]
  ];
  const eventOptions = [
    ['comments', 'コメントログ'], ['gifts', 'ギフトログ'], ['notice', '通知'], ['color', 'ログの色']
  ];
  const defaultRules = Object.fromEntries(eventTypes.map(([kind, , gifts, notice]) => [
    kind, { comments: true, gifts, notice, color: true }
  ]));
  const presetSlots = [0, 1, 2];
  const baseThemes = ['standard', 'cool', 'cute'];
  const themeColors = ['header', 'chrome', 'surface', 'surface-text', 'frame'];
  const themeFonts = ['base', 'sans', 'round', 'mono'];
  const themeCorners = ['base', 'square', 'soft', 'round'];
  const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  let layout = loadLayout();
  let metaSource = null;
  let metaViewers = '';
  let metaLikes = '';
  let comments = [];
  let gifts = [];
  let selectedImage = -1;
  const pendingNotices = [];
  let noticeTimer;
  let scale = 1;
  let drag;
  let pendingFrame;
  const minimizing = new Set();

  function position(x, y, boxWidth = 640, boxHeight = 440) {
    return {
      x: Math.round(Math.max(0, Math.min(width - boxWidth, x))),
      y: Math.round(Math.max(0, Math.min(height - 66 - boxHeight, y)))
    };
  }

  function windowZoom(value) {
    return Number.isFinite(value) ? Math.min(150, Math.max(50, Math.round(value))) : 100;
  }

  function windowPlacement(saved, boxWidth = 640, boxHeight = 440) {
    const zoom = windowZoom(saved.zoom);
    return {
      ...position(saved.x, saved.y, boxWidth * zoom / 100, boxHeight * zoom / 100),
      open: saved.open,
      minimized: saved.open && saved.minimized === true,
      zoom
    };
  }

  function loadLayout() {
    const restored = {
      ...defaults, gift: { ...giftDefaults }, gallery: { ...galleryDefaults },
      viewer: { ...viewerDefaults }, liveStatus: { ...liveDefaults }, taskbarMeta: true, theme: 'standard', customTheme: loadCustomTheme(), customPresets: presetSlots.map(() => null), liveNumberSize: 44, imageFile: null, giftColors: false, wallpaper: 'teal', eventRules: {}
    };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y) && typeof saved.open === 'boolean') {
        Object.assign(restored, windowPlacement(saved));
        if (Number.isFinite(saved.notice?.x) && Number.isFinite(saved.notice?.y)) {
          restored.notice = { x: saved.notice.x, y: saved.notice.y };
        }
        for (const [key, boxWidth, boxHeight] of [['gift', 640, 440], ['gallery', 640, 440], ['viewer', 900, 660], ['liveStatus', 420, 190]]) {
          const state = saved[key];
          if (Number.isFinite(state?.x) && Number.isFinite(state?.y) && typeof state.open === 'boolean') {
            restored[key] = windowPlacement(state, boxWidth, boxHeight);
          }
        }
        restored.imageFile = typeof saved.imageFile === 'string'
          ? saved.imageFile
          : registeredImages[saved.imageIndex]?.file ?? null;
        for (const [kind] of eventTypes) {
          const savedRule = saved.eventRules?.[kind];
          if (!savedRule) continue;
          restored.eventRules[kind] = Object.fromEntries(eventOptions
            .filter(([key]) => typeof savedRule[key] === 'boolean')
            .map(([key]) => [key, savedRule[key]]));
        }
        if (Number.isFinite(saved.panel?.x) && Number.isFinite(saved.panel?.y)) {
          restored.panel = position(saved.panel.x, saved.panel.y, 800, 540);
        }
        if (saved.theme === 'custom' || baseThemes.includes(saved.theme)) restored.theme = saved.theme;
        restored.customTheme = loadCustomTheme(saved.customTheme);
        if (Array.isArray(saved.customPresets)) {
          restored.customPresets = presetSlots.map(index => {
            const preset = saved.customPresets[index];
            return preset && baseThemes.includes(preset.base) ? loadCustomTheme(preset) : null;
          });
        }
        restored.customThemeStarted = saved.customThemeStarted === true || restored.theme === 'custom';
        if (Number.isFinite(saved.liveNumberSize)) restored.liveNumberSize = liveNumberSize(saved.liveNumberSize);
        restored.taskbarMeta = saved.taskbarMeta !== false;
        restored.giftColors = saved.giftColors === true;
        if (['teal', 'dusk', 'slate', 'transparent'].includes(saved.wallpaper)) {
          restored.wallpaper = saved.wallpaper;
        }
      }
    } catch {
      // 初回起動や保存領域が利用できない環境では初期配置を使う。
    }
    return restored;
  }

  function loadCustomTheme(saved) {
    return {
      base: baseThemes.includes(saved?.base) ? saved.base : 'standard',
      font: themeFonts.includes(saved?.font) ? saved.font : 'base',
      corners: themeCorners.includes(saved?.corners) ? saved.corners : 'base',
      colors: Object.fromEntries(themeColors.filter(key => validHex(saved?.colors?.[key]))
        .map(key => [key, saved.colors[key]]))
    };
  }

  function liveNumberSize(value) {
    return Math.min(56, Math.max(28, Math.round(value)));
  }

  function applyWallpaper() {
    wallpaper.value = layout.wallpaper;
    settingsChoice?.refresh(wallpaper);
    desktop.dataset.wallpaper = layout.wallpaper;
    document.body.classList.toggle('transparent-wallpaper', layout.wallpaper === 'transparent');
  }

  function resize() {
    scale = Math.min(viewport.clientWidth / width, viewport.clientHeight / height);
    desktop.style.transform = `scale(${scale})`;
    desktop.style.left = `${(viewport.clientWidth - width * scale) / 2}px`;
    desktop.style.top = `${(viewport.clientHeight - height * scale) / 2}px`;
  }

  function renderLayout() {
    controls.style.left = layout.panel ? `${layout.panel.x}px` : '';
    controls.style.top = layout.panel ? `${layout.panel.y}px` : '';
    positionColorPicker();
    for (const app of windows) {
      if (app.box !== viewer || galleryReady) renderWindow(app.box, app.task, app.state());
    }
    if (!notice.hidden) {
      const placement = layout.notice && position(layout.notice.x, layout.notice.y, notice.offsetWidth, notice.offsetHeight);
      notice.style.left = placement ? `${placement.x}px` : '';
      notice.style.top = placement ? `${placement.y}px` : '';
      notice.classList.toggle('positioned', !!placement);
    }
  }

  function renderWindow(box, button, placement) {
    const zoom = (placement.zoom ?? 100) / 100;
    const size = box === viewer ? [900, 660] : box === liveStatus ? [420, 190] : [640, 440];
    const point = position(placement.x, placement.y, size[0] * zoom, size[1] * zoom);
    box.style.left = `${point.x}px`;
    box.style.top = `${point.y}px`;
    box.style.scale = String(zoom);
    box.hidden = !placement.open || (placement.minimized === true && !minimizing.has(box));
    box.inert = Boolean(placement.minimized);
    button.classList.toggle('minimized', Boolean(placement.minimized));
    button.hidden = !placement.open;
  }

  function renderComments() {
    renderRows(messages, comments, layout.giftColors);
    renderRows(giftMessages, gifts, true);
  }

  function renderRows(list, entries, showGiftColors) {
    const rows = entries.map(({ name, body, parts, color, kind }) => {
      const row = document.createElement('li');
      const author = document.createElement('strong');
      author.textContent = name;
      row.append(author);
      if (parts) appendMessageParts(row, parts);
      else row.append(document.createTextNode(body));
      if (showGiftColors && color && eventRule(kind).color && applyEventColor(row, color)) {
        row.classList.add('colored');
      }
      return row;
    });
    list.replaceChildren(...rows);
  }

  function messageParts(message, label, announcement, giftImage) {
    const parts = [...message.parts];
    const text = message.text.trim();
    if (!text && announcement) parts.push({ type: 'text', content: announcement });
    if (giftImage && !parts.some(part => part.type === 'emoji' && part.url === giftImage)) {
      parts.push({ type: 'emoji', url: giftImage, isSticker: true, alt: label });
    }
    if (label && (label !== text || !text) && label !== announcement) {
      parts.unshift({ type: 'text', content: parts.length ? `${label} · ` : label });
    }
    return parts;
  }

  function appendMessageParts(row, parts) {
    let remainingText = 100;
    let remainingImages = 8;
    for (const part of parts) {
      if (part.type === 'text' && remainingText > 0) {
        const text = Array.from(part.content).slice(0, remainingText);
        row.append(document.createTextNode(text.join('')));
        remainingText -= text.length;
      } else if (part.type === 'emoji' && remainingImages > 0) {
        remainingImages--;
        const alt = part.alt || (part.isSticker ? 'スタンプ' : '絵文字');
        if (!/^https?:\/\//i.test(part.url)) {
          row.append(document.createTextNode(alt));
          continue;
        }
        const image = document.createElement('img');
        image.className = part.isSticker ? 'log-emoji log-sticker' : 'log-emoji';
        image.alt = alt;
        image.onerror = () => image.replaceWith(document.createTextNode(alt));
        image.src = part.url;
        row.append(image);
      }
    }
  }

  function enqueueNotice(title, detail, color = null) {
    // 通知が集中したときも、表示待ちを最大8件に抑える。
    if (pendingNotices.length >= 8) return;
    pendingNotices.push({ title, detail, color });
    if (notice.hidden) showNextNotice();
  }

  function showNextNotice() {
    const next = pendingNotices.shift();
    if (!next) {
      notice.hidden = true;
      return;
    }
    byId('notice-title').textContent = next.title;
    byId('notice-detail').textContent = next.detail;
    applyEventColor(notice, next.color);
    notice.hidden = false;
    renderLayout();
    scheduleNoticeEnd();
  }

  function applyEventColor(element, color) {
    const channels = color && [color.r, color.g, color.b];
    // VCT SDKは色が未取得の場合に白を返す。
    if (!channels || channels.some(value => !Number.isFinite(value) || value < 0 || value > 255) ||
        channels.every(value => value === 255)) {
      element.style.removeProperty('--event-background');
      element.style.removeProperty('--event-foreground');
      return false;
    }

    element.style.setProperty('--event-background', `rgb(${channels.join(', ')})`);
    element.style.setProperty('--event-foreground', readableText(channels));
    return true;
  }

  function readableText(channels) {
    const [r, g, b] = channels.map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b >= 0.179 ? '#000' : '#fff';
  }

  function scheduleNoticeEnd() {
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(showNextNotice, 4200);
  }

  function commitLayout() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
      saveStatus.textContent = '';
    } catch {
      saveStatus.textContent = '配置を保存できませんでした';
    }
    renderLayout();
  }

  function eventRule(kind) {
    return { ...defaultRules[kind], ...layout.eventRules[kind] };
  }

  function addComments(rows) {
    if (!rows.length) return;
    comments = comments.concat(rows.filter(row => !row.kind || eventRule(row.kind).comments)).slice(-8);
    gifts = gifts.concat(rows.filter(row => row.kind && eventRule(row.kind).gifts)).slice(-8);
    for (const row of rows) {
      if (!row.kind || !eventRule(row.kind).notice) continue;
      const title = row.kind === 'member_join' ? '新しいメンバーが加入しました'
        : ['member_milestone', 'membership_gift_received'].includes(row.kind) ? row.label
        : 'ギフトを受け取りました';
      const detail = row.label && row.label !== title ? `${row.name} · ${row.label.slice(0, 60)}` : row.name;
      enqueueNotice(title, detail, row.color);
    }
    renderComments();
  }

  function enableDrag(handle, box, applyPosition) {
    handle.addEventListener('pointerdown', event => {
      if (drag || event.button !== 0 || !scale || event.target.closest('button')) return;
      handle.setPointerCapture(event.pointerId);
      if (box === notice) clearTimeout(noticeTimer);
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: box.offsetLeft,
        y: box.offsetTop,
        scale
      };
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const next = position(
        drag.x + (event.clientX - drag.startX) / drag.scale,
        drag.y + (event.clientY - drag.startY) / drag.scale,
        box.offsetWidth * Number(box.style.scale || 1),
        box.offsetHeight * Number(box.style.scale || 1)
      );
      applyPosition(next);
      if (pendingFrame !== undefined) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = undefined;
        renderLayout();
      });
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      handle.addEventListener(type, event => {
        if (drag?.id !== event.pointerId) return;
        drag = undefined;
        if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
        pendingFrame = undefined;
        commitLayout();
        if (box === notice) scheduleNoticeEnd();
      });
    }
  }

  function metaCount(value) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value.toLocaleString('ja-JP');
    if (typeof value !== 'string') return '';
    const text = value.trim();
    return /^(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:\.[0-9]+)?(?:[KMBTPE万億])?$/i.test(text) ? text : '';
  }

  function renderMeta() {
    for (const [metric, label, value] of [['viewers', '同接', metaViewers], ['likes', '高評価', metaLikes]]) {
      byId(`live-${metric}`).hidden = !value;
      const number = byId(`live-${metric}-value`);
      number.textContent = value;
      number.style.setProperty('--metric-fit', `${145 / Math.max(1, value.length)}cqi`);
      const field = byId(`taskbar-${metric}`);
      field.hidden = !value || !layout.taskbarMeta;
      field.textContent = value ? `${label} ${value}` : '';
    }
    byId('live-empty').hidden = Boolean(metaViewers || metaLikes);
  }

  function updateMeta(response) {
    const payload = response?.data ?? response;
    const data = payload?.meta ?? payload;
    const source = payload?.service?.id ?? payload?.id ?? '';
    if (!data || (metaSource !== null && source !== metaSource)) return;
    const viewers = metaCount(data.viewer ?? data.viewers);
    const likes = metaCount(data.upVote ?? data.totalLikeCount ?? data.likes ?? data.likeCount ?? data.goodCount);
    if (data.isLive === false || (!viewers && !likes)) {
      if (metaSource === source) clearMeta();
      return;
    }
    metaSource = source;
    metaViewers = viewers;
    metaLikes = likes;
    renderMeta();
  }

  function clearMeta(sourceId) {
    if (typeof sourceId === 'string' && sourceId && metaSource && sourceId !== metaSource) return;
    metaSource = null;
    metaViewers = '';
    metaLikes = '';
    renderMeta();
  }

  async function connectComments() {
    if (!window.OneSDK || !window.VCT_SDK) {
      connection.textContent = 'コメント受信機能を読み込めません・模擬入力可';
      return;
    }
    connection.textContent = 'わんコメ接続待ち';
    const seen = new Set();
    try {
      await OneSDK.setup({ mode: 'diff', permissions: ['comments', 'connected', 'meta', 'meta.clear'] });
      OneSDK.subscribe({
        action: 'connected',
        callback: response => {
          connection.textContent = 'わんコメ接続済み';
          clearMeta();
          if (Array.isArray(response?.services)) {
            for (const service of response.services) {
              if (service.enabled !== false && service.meta) updateMeta(service);
            }
          }
        }
      });
      OneSDK.subscribe({
        action: 'comments',
        callback: response => {
          const batch = Array.isArray(response) ? response : [response];
          const rows = [];
          for (const raw of batch) {
            const data = raw?.data;
            if (!data) continue;
            const { service, user, message, event, style, monetization } = VCT_SDK.normalize(raw);
            const kind = event.kind === 'membership_event' ? 'member_milestone' : event.kind;
            const special = Object.hasOwn(defaultRules, kind);
            const logComment = event.kind === 'normal' && data.meta?.type !== 'system' && (message.text.trim() || message.parts.some(part => part.type === 'emoji'));
            if (!special && !logComment) continue;
            const id = data.id == null ? null : JSON.stringify([service.id, data.liveId, data.id]);
            if (id && seen.has(id)) continue;
            if (id) {
              seen.add(id);
              if (seen.size > 256) seen.delete(seen.values().next().value);
            }
            const name = user.displayName.slice(0, 40);
            const label = special ? event.displayLabel : '';
            const parts = messageParts(message, label, special ? event.announcementText : '', event.isSupport ? monetization.gift.imageUrl : '');
            rows.push({ name, parts, kind: special ? kind : null, label, color: special ? style.color : null });
          }
          connection.textContent = 'わんコメ受信中';
          addComments(rows);
        }
      });
      OneSDK.subscribe({ action: 'meta', callback: updateMeta });
      OneSDK.subscribe({ action: 'meta.clear', callback: clearMeta });
      await OneSDK.ready();
      await OneSDK.connect();
    } catch (error) {
      connection.textContent = 'わんコメ接続に失敗・模擬入力可';
      console.warn('わんコメに接続できませんでした', error);
    }
  }

  function setSettingsOpen(open) {
    controls.hidden = !open;
    if (!open) {
      settingsChoice?.close();
      colorPicker?.close();
    }
    settings.setAttribute('aria-expanded', String(open));
  }

  function setStartOpen(open) {
    startMenu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
  }

  start.onclick = () => setStartOpen(startMenu.hidden);
  byId('start-settings').onclick = () => {
    setStartOpen(false);
    setSettingsOpen(true);
    byId('dismiss').focus();
  };
  settings.onclick = () => setSettingsOpen(controls.hidden);
  byId('dismiss').onclick = () => setSettingsOpen(false);
  window.addEventListener('blur', () => {
    setStartOpen(false);
    setSettingsOpen(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!startMenu.hidden && !startMenu.contains(event.target) && !start.contains(event.target)) {
      setStartOpen(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (!startMenu.hidden) {
      setStartOpen(false);
      start.focus();
    } else if (!controls.hidden) {
      setSettingsOpen(false);
    }
  });

  function focusWindow(box) {
    const index = windows.findIndex(app => app.box === box);
    if (index > 0) {
      const [app] = windows.splice(index, 1);
      windows.unshift(app);
    }
    for (const [depth, app] of windows.entries()) {
      app.box.style.zIndex = windows.length - depth;
      const active = app.box === box;
      app.box.classList.toggle('active', active);
      app.task.setAttribute('aria-pressed', String(active));
    }
  }

  function frontVisibleWindow() {
    return windows.find(app => (app.box !== viewer || galleryReady) && app.state().open && !app.state().minimized)?.box ?? null;
  }

  function enableWindow({ box, task: button, state: placement }, dragHandle, minimize, close, launcher) {
    let animation;

    function stopAnimation() {
      animation?.cancel();
      animation = undefined;
      minimizing.delete(box);
    }

    function animateWindow(hiding) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !scale || typeof box.animate !== 'function') return;
      const from = box.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      const animationScale = scale * (placement().zoom ?? 100) / 100;
      const x = (target.left + target.width / 2 - from.left - from.width * 0.09) / animationScale;
      const y = (target.top + target.height / 2 - from.top - from.height * 0.09) / animationScale;
      const normal = { transform: 'none', opacity: 1 };
      const tucked = { transform: `translate(${x}px, ${y}px) scale(0.18)`, opacity: 0 };
      const current = box.animate(hiding ? [normal, tucked] : [tucked, normal], { duration: 180, easing: 'ease-out' });
      animation = current;
      current.onfinish = () => {
        if (animation !== current) return;
        stopAnimation();
        renderLayout();
      };
    }

    function restore() {
      const state = placement();
      const wasMinimized = state.minimized;
      stopAnimation();
      state.open = true;
      state.minimized = false;
      focusWindow(box);
      commitLayout();
      if (wasMinimized) animateWindow(false);
    }

    box.addEventListener('pointerdown', () => focusWindow(box));
    button.onclick = () => {
      if (placement().minimized) restore();
      else if (box.classList.contains('active')) minimizeWindow();
      else focusWindow(box);
    };
    if (launcher) {
      launcher.onclick = () => {
        restore();
        setStartOpen(false);
        button.focus();
      };
    }
    function minimizeWindow() {
      const state = placement();
      if (!state.open || state.minimized) return;
      stopAnimation();
      animateWindow(true);
      if (animation) minimizing.add(box);
      state.minimized = true;
      if (box.classList.contains('active')) focusWindow(frontVisibleWindow());
      commitLayout();
      button.focus();
    }
    minimize.onclick = minimizeWindow;
    close.onclick = () => {
      stopAnimation();
      const state = placement();
      state.open = false;
      state.minimized = false;
      if (box.classList.contains('active')) focusWindow(frontVisibleWindow());
      commitLayout();
      start.focus();
    };
    enableDrag(dragHandle, box, next => Object.assign(placement(), next));
    return restore;
  }

  enableWindow(windows[0], handle, byId('minimize'), byId('close'), byId('start-comments'));
  enableWindow(windows[1], byId('gift-handle'), byId('gift-minimize'), byId('gift-close'), byId('start-gifts'));
  enableWindow(windows[2], byId('gallery-handle'), byId('gallery-minimize'), byId('gallery-close'), byId('start-gallery'));
  const openViewer = enableWindow(windows[3], byId('viewer-handle'), byId('viewer-minimize'), byId('viewer-close'));

  enableWindow(windows[4], byId('live-handle'), byId('live-minimize'), byId('live-close'), byId('start-live'));

  function imageUrl(entry) {
    return 'gallery/' + encodeURIComponent(entry.file);
  }

  function showImage(index) {
    const entry = images[index];
    if (!entry) return;
    selectedImage = index;
    layout.imageFile = entry.file;
    const title = entry.title || entry.file;
    viewerImage.hidden = false;
    viewerError.hidden = true;
    viewerImage.alt = title;
    viewerImage.src = imageUrl(entry);
    byId('viewer-name').textContent = title;
    byId('viewer-prev').disabled = index === 0;
    byId('viewer-next').disabled = index === images.length - 1;
  }

  viewerImage.onerror = () => {
    viewerImage.hidden = true;
    viewerError.hidden = false;
  };
  byId('viewer-prev').onclick = () => {
    showImage(selectedImage - 1);
    commitLayout();
  };
  byId('viewer-next').onclick = () => {
    showImage(selectedImage + 1);
    commitLayout();
  };
  function probeImage(file) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve({ file });
      image.onerror = () => resolve(null);
      image.src = imageUrl({ file });
    });
  }

  async function loadGallery() {
    const numbered = await Promise.all(Array.from({ length: 10 }, async (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return await probeImage(number + '.jpg') ?? await probeImage(number + '.png');
    }));
    const registeredByFile = new Map(registeredImages.map(entry => [entry.file.toLowerCase(), entry]));
    const found = numbered.filter(Boolean).map(entry => registeredByFile.get(entry.file.toLowerCase()) ?? entry);
    const numberedFiles = new Set(found.map(entry => entry.file.toLowerCase()));
    images = found.concat(registeredImages.filter(entry => !numberedFiles.has(entry.file.toLowerCase())));
    byId('gallery-loading').hidden = true;
    byId('gallery-empty').hidden = images.length > 0;
    for (const [index, entry] of images.entries()) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const thumb = document.createElement('img');
      const title = document.createElement('span');
      button.type = 'button';
      thumb.alt = '';
      thumb.onerror = () => { thumb.hidden = true; };
      thumb.src = imageUrl(entry);
      title.textContent = entry.title || entry.file;
      button.append(thumb, title);
      button.onclick = () => {
        showImage(index);
        openViewer();
        byId('viewer-task').focus();
      };
      item.append(button);
      byId('gallery-files').append(item);
    }
    galleryReady = true;
    if (layout.viewer.open) {
      const index = layout.imageFile === null ? 0 : images.findIndex(entry => entry.file === layout.imageFile);
      if (images[index]) showImage(index);
      else {
        layout.viewer.open = false;
        layout.viewer.minimized = false;
      }
    }
    renderLayout();
    if (!windows.some(app => app.box.classList.contains('active'))) focusWindow(frontVisibleWindow());
  }

  loadGallery();

  focusWindow(frontVisibleWindow());
  const themeSelect = byId('desktop-theme');
  const numberSizeInput = byId('live-number-size');
  const customOptions = byId('custom-theme-options');
  const customBase = byId('custom-theme-base');
  const customFont = byId('custom-theme-font');
  const customCorners = byId('custom-theme-corners');
  const pickerMount = byId('appearance-picker');
  const colorPicker = window.VCTInlineColorPicker?.create({ mount: pickerMount });
  const colorInputs = [...byId('appearance-colors').querySelectorAll('[data-color]')];

  function positionColorPicker() {
    if (!colorPicker || colorPicker.panel.hidden || controls.hidden) return;
    const gap = 12;
    const panelLeft = controls.offsetLeft;
    const panelRight = panelLeft + controls.offsetWidth;
    const pickerWidth = pickerMount.offsetWidth;
    const x = panelRight + gap + pickerWidth <= width
      ? panelRight + gap
      : panelLeft - gap - pickerWidth;
    const point = position(x, controls.offsetTop, pickerWidth, pickerMount.offsetHeight);
    pickerMount.style.left = `${point.x}px`;
    pickerMount.style.top = `${point.y}px`;
  }

  if (colorPicker) {
    new MutationObserver(() => {
      if (colorPicker.panel.hidden) {
        for (const input of colorInputs) input.classList.remove('active-color');
      }
    }).observe(colorPicker.panel, { attributes: true, attributeFilter: ['hidden'] });
  }

  function applyTheme() {
    const custom = layout.theme === 'custom';
    const { base, font, corners, colors } = layout.customTheme;
    desktop.dataset.theme = custom ? base : layout.theme;
    desktop.dataset.themeFont = custom ? font : 'base';
    desktop.dataset.themeCorners = custom ? corners : 'base';
    for (const key of themeColors) {
      const property = `--ui-${key}`;
      if (custom && colors[key]) desktop.style.setProperty(property, colors[key]);
      else desktop.style.removeProperty(property);
    }
    for (const key of ['header', 'chrome']) {
      const property = `--ui-${key}-text`;
      if (custom && colors[key]) {
        const channels = [1, 3, 5].map(index => parseInt(colors[key].slice(index, index + 2), 16));
        desktop.style.setProperty(property, readableText(channels));
      } else desktop.style.removeProperty(property);
    }
    desktop.classList.toggle('custom-chrome', custom && Boolean(colors.chrome));
  }

  function refreshThemeControls() {
    themeSelect.value = layout.theme;
    customOptions.hidden = layout.theme !== 'custom';
    customBase.value = layout.customTheme.base;
    customFont.value = layout.customTheme.font;
    customCorners.value = layout.customTheme.corners;
    settingsChoice?.refresh();
    const computed = getComputedStyle(desktop);
    for (const input of colorInputs) {
      input.value = computed.getPropertyValue(`--ui-${input.dataset.color}`).trim();
    }
    colorPicker?.refresh();
  }

  for (const input of colorInputs) {
    colorPicker?.attach(input, { label: `調整中：${input.closest('label').firstChild.textContent.trim()}` });
    if (colorPicker) {
      const markActiveColor = () => {
        if (colorPicker.panel.hidden) return;
        for (const field of colorInputs) field.classList.toggle('active-color', field === input);
        positionColorPicker();
      };
      input.addEventListener('focus', markActiveColor);
      input.addEventListener('click', markActiveColor);
    }
    input.addEventListener('input', () => {
      if (!validHex(input.value)) return;
      layout.customTheme.colors[input.dataset.color] = input.value;
      applyTheme();
      commitLayout();
    });
    input.addEventListener('blur', () => {
      if (!validHex(input.value)) refreshThemeControls();
    });
  }

  themeSelect.onchange = () => {
    if (themeSelect.value === 'custom' && layout.theme !== 'custom' && !layout.customThemeStarted) {
      layout.customTheme.base = layout.theme;
      layout.customThemeStarted = true;
    }
    layout.theme = themeSelect.value;
    colorPicker?.close();
    applyTheme();
    refreshThemeControls();
    commitLayout();
  };
  for (const [input, key] of [[customBase, 'base'], [customFont, 'font'], [customCorners, 'corners']]) {
    input.onchange = () => {
      layout.customTheme[key] = input.value;
      applyTheme();
      refreshThemeControls();
      commitLayout();
    };
  }
  const presetSelect = byId('custom-preset-slot');
  const loadPreset = byId('load-custom-preset');
  const savePreset = byId('save-custom-preset');

  function refreshPresets() {
    for (const index of presetSlots) {
      const saved = Boolean(layout.customPresets[index]);
      presetSelect.options[index].textContent = `プリセット ${index + 1}（${saved ? '保存済み' : '空き'}）`;
    }
    const saved = Boolean(layout.customPresets[Number(presetSelect.value)]);
    settingsChoice?.refresh(presetSelect);
    loadPreset.disabled = !saved;
    savePreset.textContent = saved ? '上書き保存' : '保存';
  }

  presetSelect.onchange = refreshPresets;
  savePreset.onclick = () => {
    const slot = Number(presetSelect.value);
    layout.customPresets[slot] = loadCustomTheme(layout.customTheme);
    commitLayout();
    refreshPresets();
    if (!saveStatus.textContent) saveStatus.textContent = `プリセット ${slot + 1} に保存しました`;
  };
  loadPreset.onclick = () => {
    const slot = Number(presetSelect.value);
    const preset = layout.customPresets[slot];
    if (!preset) return;
    layout.customTheme = loadCustomTheme(preset);
    colorPicker?.close();
    applyTheme();
    refreshThemeControls();
    commitLayout();
    if (!saveStatus.textContent) saveStatus.textContent = `プリセット ${slot + 1} を呼び出しました`;
  };
  refreshPresets();

  byId('reset-custom-theme').onclick = () => {
    layout.customTheme = loadCustomTheme({ base: layout.customTheme.base });
    colorPicker?.close();
    applyTheme();
    refreshThemeControls();
    commitLayout();
  };
  applyTheme();
  refreshThemeControls();
  function applyLiveNumberSize() {
    numberSizeInput.value = layout.liveNumberSize;
    liveStatus.style.setProperty('--live-number-size', `${layout.liveNumberSize}px`);
  }
  applyLiveNumberSize();
  numberSizeInput.onchange = () => {
    if (Number.isFinite(numberSizeInput.valueAsNumber)) {
      layout.liveNumberSize = liveNumberSize(numberSizeInput.valueAsNumber);
    }
    applyLiveNumberSize();
    commitLayout();
  };

  const taskbarMeta = byId('taskbar-meta');
  taskbarMeta.checked = layout.taskbarMeta;
  taskbarMeta.onchange = () => {
    layout.taskbarMeta = taskbarMeta.checked;
    renderMeta();
    commitLayout();
  };
  renderMeta();
  applyWallpaper();
  wallpaper.onchange = () => {
    layout.wallpaper = wallpaper.value;
    applyWallpaper();
    commitLayout();
  };
  if (settingsChoice) {
    for (const [id, label] of [
      ['wallpaper', 'デスクトップ背景'],
      ['desktop-theme', 'デスクトップテーマ'],
      ['custom-theme-base', '土台'],
      ['custom-theme-font', '書体'],
      ['custom-theme-corners', '角'],
      ['custom-preset-slot', 'プリセットの保存先']
    ]) {
      const select = byId(id);
      const trigger = settingsChoice.attach(select, { label });
      select.hidden = true;
      trigger.title = label;
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.addEventListener('click', () => colorPicker?.close());
    }
  }
  const panelTabs = [
    [byId('panel-general-tab'), byId('panel-general')],
    [byId('panel-events-tab'), byId('panel-events')],
    [byId('panel-windows-tab'), byId('panel-windows')],
    [byId('panel-appearance-tab'), byId('panel-appearance')]
  ];
  for (const [tab] of panelTabs) {
    tab.onclick = () => {
      colorPicker?.close();
      for (const [button, section] of panelTabs) {
        section.hidden = button !== tab;
        button.setAttribute('aria-pressed', String(button === tab));
      }
    };
  }
  for (const [id, zoomHandle, state, boxWidth, boxHeight] of [
    ['log-zoom', handle, () => layout, 640, 440],
    ['gift-zoom', byId('gift-handle'), () => layout.gift, 640, 440],
    ['gallery-zoom', byId('gallery-handle'), () => layout.gallery, 640, 440],
    ['viewer-zoom', byId('viewer-handle'), () => layout.viewer, 900, 660]
  ]) {
    const input = byId(id);
    input.value = state().zoom ?? 100;

    function setZoom(value) {
      const placement = state();
      const current = placement.zoom ?? 100;
      const zoom = Number.isFinite(value) ? windowZoom(value) : current;
      input.value = zoom;
      if (zoom === current) return;
      placement.zoom = zoom;
      Object.assign(placement, position(placement.x, placement.y, boxWidth * zoom / 100, boxHeight * zoom / 100));
      commitLayout();
    }

    input.onchange = () => setZoom(input.valueAsNumber);
    zoomHandle.addEventListener('wheel', event => {
      if (!event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      if (drag) return;
      const step = event.deltaY < 0 ? 5 : -5;
      setZoom((state().zoom ?? 100) + step);
    }, { passive: false });
  }
  for (const [kind, label] of eventTypes) {
    const row = document.createElement('tr');
    const title = document.createElement('th');
    title.scope = 'row';
    title.textContent = label;
    row.append(title);
    for (const [key, optionLabel] of eventOptions) {
      const cell = document.createElement('td');
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = eventRule(kind)[key];
      toggle.setAttribute('aria-label', `${label}の${optionLabel}`);
      toggle.onchange = () => {
        layout.eventRules[kind] ??= {};
        layout.eventRules[kind][key] = toggle.checked;
        commitLayout();
        if (key === 'color') renderComments();
      };
      cell.append(toggle);
      row.append(cell);
    }
    byId('event-rules').append(row);
  }
  enableDrag(byId('panel-handle'), controls, next => { layout.panel = next; });
  logColors.checked = layout.giftColors;
  logColors.onchange = () => {
    layout.giftColors = logColors.checked;
    commitLayout();
    renderComments();
  };
  byId('reset').onclick = () => {
    layout = {
      ...defaults,
      minimized: layout.minimized,
      zoom: layout.zoom,
      gift: { ...giftDefaults, open: layout.gift.open, minimized: layout.gift.minimized, zoom: layout.gift.zoom },
      gallery: { ...layout.gallery, x: galleryDefaults.x, y: galleryDefaults.y },
      viewer: { ...layout.viewer, x: viewerDefaults.x, y: viewerDefaults.y },
      liveStatus: { ...layout.liveStatus, x: liveDefaults.x, y: liveDefaults.y },
      taskbarMeta: layout.taskbarMeta,
      theme: layout.theme,
      customTheme: layout.customTheme,
      customPresets: layout.customPresets,
      customThemeStarted: layout.customThemeStarted,
      liveNumberSize: layout.liveNumberSize,
      imageFile: layout.imageFile,
      giftColors: layout.giftColors,
      wallpaper: layout.wallpaper,
      eventRules: layout.eventRules
    };
    if (!windows.some(app => app.box.classList.contains('active'))) focusWindow(frontVisibleWindow());
    commitLayout();
  };
  byId('sample').onclick = () => addComments([{ name: 'リスナー', body: 'こんばんは！' }]);
  byId('gift').onclick = () => {
    const color = { r: 241, g: 177, b: 65 };
    addComments([{ name: 'リスナー', body: '模擬ギフト', kind: 'unknown', label: '模擬ギフト', color }]);
  };
  enableDrag(noticeHandle, notice, next => { layout.notice = next; });
  connectComments();

  function renderClock() {
    byId('clock').textContent = clockFormat.format(new Date());
  }

  renderLayout();
  new ResizeObserver(resize).observe(viewport);
  renderClock();
  setInterval(renderClock, 1000);
})();
