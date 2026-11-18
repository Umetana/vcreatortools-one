(() => {
  'use strict';

  const width = 1920;
  const height = 1080;
  const defaults = { x: 108, y: 104, open: true };
  const giftDefaults = { x: 790, y: 104, open: false };
  const galleryDefaults = { x: 240, y: 220, open: false };
  const viewerDefaults = { x: 720, y: 150, open: false };
  const liveDefaults = { x: 1120, y: 104, open: false };
  const clockDefaults = { x: 1370, y: 104, open: false };
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
  const wallpaperImage = byId('wallpaper-image');
  const wallpaperPicture = byId('wallpaper-picture');
  const wallpaperImageStatus = byId('wallpaper-image-status');
  const notice = byId('notice');
  const noticeHandle = byId('notice-handle');
  const controls = byId('controls');
  const settings = byId('settings');
  const start = byId('start');
  const startMenu = byId('start-menu');
  const task = byId('task');
  const saveStatus = byId('save-status');
  const connection = byId('connection');
  const gallery = byId('gallery');
  const viewer = byId('viewer');
  const viewerImage = byId('viewer-image');
  const viewerError = byId('viewer-error');
  const registeredImages = (Array.isArray(window.STREAMOS_GALLERY_IMAGES) ? window.STREAMOS_GALLERY_IMAGES : [])
    .filter(entry => typeof entry?.file === 'string' && /^[^/\\:%?#]+\.(png|jpe?g|webp|gif|avif)$/i.test(entry.file));
  let images = registeredImages;
  let galleryReady = false;
  const liveStatus = byId('live-status');
  const windows = [
    { key: null, box: log, task, state: () => layout, size: [640, 440],
      handle, minimize: byId('minimize'), close: byId('close'), launcher: byId('start-comments'), zoomInput: byId('log-zoom') },
    { key: 'gift', box: giftLog, task: giftTask, state: () => layout.gift, size: [640, 440],
      handle: byId('gift-handle'), minimize: byId('gift-minimize'), close: byId('gift-close'), launcher: byId('start-gifts'), zoomInput: byId('gift-zoom') },
    { key: 'gallery', box: gallery, task: byId('gallery-task'), state: () => layout.gallery, size: [640, 440],
      handle: byId('gallery-handle'), minimize: byId('gallery-minimize'), close: byId('gallery-close'), launcher: byId('start-gallery'), zoomInput: byId('gallery-zoom') },
    { key: 'viewer', box: viewer, task: byId('viewer-task'), state: () => layout.viewer, size: [900, 660],
      handle: byId('viewer-handle'), minimize: byId('viewer-minimize'), maximize: byId('viewer-maximize'), close: byId('viewer-close'), onHide: stopSlideshow, zoomInput: byId('viewer-zoom'), ready: () => galleryReady },
    { key: 'liveStatus', box: liveStatus, task: byId('live-task'), state: () => layout.liveStatus, size: [420, 190],
      handle: byId('live-handle'), minimize: byId('live-minimize'), close: byId('live-close'), launcher: byId('start-live') },
    { key: 'clockGadget', box: byId('clock-gadget'), task: byId('clock-gadget-task'), state: () => layout.clockGadget,
      size: [420, 238], handle: byId('clock-gadget-handle'), minimize: byId('clock-gadget-minimize'),
      close: byId('clock-gadget-close'), launcher: byId('start-clock') }
  ];
  const windowManager = window.StreamOSWindowManager.create({
    width, height, windows, getScale: () => scale, renderLayout, commitLayout,
    onLaunch: () => setStartOpen(false), onClose: () => start.focus()
  });
  const { position, windowPlacement } = windowManager;
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

  function logOptions(saved) {
    return {
      fontSize: Number.isFinite(saved?.fontSize) ? Math.min(48, Math.max(16, Math.round(saved.fontSize))) : 26,
      limit: Number.isFinite(saved?.limit) ? Math.min(100, Math.max(1, Math.round(saved.limit))) : 8,
      badges: saved?.badges === true
    };
  }

  function loadLayout() {
    const restored = {
      ...defaults, logs: { comments: logOptions(), gifts: logOptions() }, gift: { ...giftDefaults }, gallery: { ...galleryDefaults },
      viewer: { ...viewerDefaults }, liveStatus: { ...liveDefaults }, clockGadget: { ...clockDefaults },
      clock: window.StreamOSClock.restore(), taskbarMeta: true, showStreamPointer: false, showResizeGuides: true, theme: 'standard', customTheme: loadCustomTheme(), customPresets: presetSlots.map(() => null), liveNumberSize: 44, imageFile: null, slideshowSeconds: 5, giftColors: false, wallpaper: 'teal', wallpaperFile: '', wallpaperFit: 'cover', eventRules: {}
    };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y) && typeof saved.open === 'boolean') {
        for (const { key, size } of windows) {
          const state = key === null ? saved : saved[key];
          if (Number.isFinite(state?.x) && Number.isFinite(state?.y) && typeof state.open === 'boolean') {
            const placement = windowPlacement(state, ...size);
            if (key === null) Object.assign(restored, placement);
            else restored[key] = placement;
          }
        }
        if (Number.isFinite(saved.slideshowSeconds)) {
          restored.slideshowSeconds = slideshowSeconds(saved.slideshowSeconds);
        }
        restored.clock = window.StreamOSClock.restore(saved.clock);
        restored.logs = { comments: logOptions(saved.logs?.comments), gifts: logOptions(saved.logs?.gifts) };
        if (Number.isFinite(saved.notice?.x) && Number.isFinite(saved.notice?.y)) {
          restored.notice = { x: saved.notice.x, y: saved.notice.y };
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
        restored.showStreamPointer = saved.showStreamPointer === true;
        restored.showResizeGuides = saved.showResizeGuides !== false;
        restored.giftColors = saved.giftColors === true;
        if (['teal', 'dusk', 'slate', 'transparent', 'image'].includes(saved.wallpaper)) {
          restored.wallpaper = saved.wallpaper;
        }
        if (typeof saved.wallpaperFile === 'string') restored.wallpaperFile = saved.wallpaperFile;
        if (saved.wallpaperFit === 'contain') restored.wallpaperFit = 'contain';
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

    const useImage = layout.wallpaper === 'image';
    const entry = galleryReady && images.find(item => item.file === layout.wallpaperFile);
    byId('wallpaper-image-setting').hidden = !useImage;
    wallpaperImage.value = entry ? entry.file : '';
    settingsChoice?.refresh(wallpaperImage);
    wallpaperPicture.replaceChildren();
    wallpaperImageStatus.hidden = true;
    if (!useImage || !galleryReady) return;
    if (!entry) {
      wallpaperImageStatus.hidden = !layout.wallpaperFile;
      return;
    }

    const image = document.createElement('img');
    image.alt = '';
    image.hidden = true;
    image.onload = () => { image.hidden = false; };
    image.onerror = () => {
      if (wallpaperPicture.firstChild === image) wallpaperImageStatus.hidden = false;
    };
    wallpaperPicture.append(image);
    image.src = imageUrl(entry);
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
    windowManager.render();
    if (!notice.hidden) {
      const placement = layout.notice && position(layout.notice.x, layout.notice.y, notice.offsetWidth, notice.offsetHeight);
      notice.style.left = placement ? `${placement.x}px` : '';
      notice.style.top = placement ? `${placement.y}px` : '';
      notice.classList.toggle('positioned', !!placement);
    }
  }

  function renderComments() {
    renderRows(messages, comments, layout.giftColors, layout.logs.comments);
    renderRows(giftMessages, gifts, true, layout.logs.gifts);
  }

  function renderRows(list, entries, showGiftColors, options) {
    list.style.fontSize = `${options.fontSize}px`;
    const rows = entries.map(({ name, body, parts, color, kind, badges }) => {
      const row = document.createElement('li');
      const author = document.createElement('strong');
      author.textContent = name;
      if (options.badges) {
        for (const badge of (badges ?? []).slice(0, 8)) {
          if (!/^https?:\/\//i.test(badge.url)) continue;
          const image = document.createElement('img');
          image.className = 'log-badge';
          image.alt = badge.label || 'バッジ';
          image.title = image.alt;
          image.onerror = () => image.remove();
          image.src = badge.url;
          row.append(image);
        }
      }
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
    comments = comments.concat(rows.filter(row => !row.kind || eventRule(row.kind).comments)).slice(-layout.logs.comments.limit);
    gifts = gifts.concat(rows.filter(row => row.kind && eventRule(row.kind).gifts)).slice(-layout.logs.gifts.limit);
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
            rows.push({ name, parts, badges: user.badges, kind: special ? kind : null, label, color: special ? style.color : null });
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
    byId('viewer-play').disabled = images.length < 2;
  }

  viewerImage.onerror = () => {
    viewerImage.hidden = true;
    viewerError.hidden = false;
  };
  byId('viewer-prev').onclick = () => {
    showImage(selectedImage - 1);
    commitLayout();
    if (slideshowTimer !== undefined) scheduleSlideshow();
  };
  byId('viewer-next').onclick = () => {
    showImage(selectedImage + 1);
    commitLayout();
    if (slideshowTimer !== undefined) scheduleSlideshow();
  };
  const slideshowButton = byId('viewer-play');
  const slideshowInterval = byId('viewer-interval');
  let slideshowTimer;
  slideshowInterval.value = layout.slideshowSeconds;

  function slideshowSeconds(value) {
    return Math.min(120, Math.max(1, Math.round(value)));
  }

  function stopSlideshow() {
    clearTimeout(slideshowTimer);
    slideshowTimer = undefined;
    slideshowButton.textContent = 'スライドショー開始';
  }

  function scheduleSlideshow() {
    clearTimeout(slideshowTimer);
    slideshowTimer = setTimeout(() => {
      showImage((selectedImage + 1) % images.length);
      commitLayout();
      scheduleSlideshow();
    }, layout.slideshowSeconds * 1000);
  }

  slideshowButton.onclick = () => {
    if (slideshowTimer !== undefined) {
      stopSlideshow();
    } else if (images.length > 1 && layout.viewer.open && !layout.viewer.minimized) {
      slideshowButton.textContent = 'スライドショー停止';
      scheduleSlideshow();
    }
  };

  slideshowInterval.onchange = () => {
    const value = slideshowInterval.valueAsNumber;
    if (Number.isFinite(value)) layout.slideshowSeconds = slideshowSeconds(value);
    slideshowInterval.value = layout.slideshowSeconds;
    if (slideshowTimer !== undefined) scheduleSlideshow();
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
        if (slideshowTimer !== undefined) scheduleSlideshow();
        windowManager.open(viewer);
        byId('viewer-task').focus();
      };
      item.append(button);
      byId('gallery-files').append(item);
    }
    galleryReady = true;
    wallpaperImage.options[0].textContent = images.length ? '画像を選ぶ' : '登録画像がありません';
    for (const entry of images) {
      const option = document.createElement('option');
      option.value = entry.file;
      option.textContent = entry.title || entry.file;
      wallpaperImage.append(option);
    }
    wallpaperImage.disabled = !images.length;
    applyWallpaper();
    if (layout.viewer.open) {
      const index = layout.imageFile === null ? 0 : images.findIndex(entry => entry.file === layout.imageFile);
      if (images[index]) showImage(index);
      else {
        layout.viewer.open = false;
        layout.viewer.minimized = false;
      }
    }
    renderLayout();
    windowManager.ensureFocus();
  }

  loadGallery();

  windowManager.mount();
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

  const resizeGuideSetting = byId('resize-guides-enabled');
  resizeGuideSetting.checked = layout.showResizeGuides;
  desktop.classList.toggle('show-resize-guides', layout.showResizeGuides);
  resizeGuideSetting.onchange = () => {
    layout.showResizeGuides = resizeGuideSetting.checked;
    desktop.classList.toggle('show-resize-guides', layout.showResizeGuides);
    commitLayout();
  };

  const streamPointer = byId('stream-pointer');
  const pointerSetting = byId('stream-pointer-enabled');
  let pointerTimer;

  function hideStreamPointer() {
    clearTimeout(pointerTimer);
    streamPointer.hidden = true;
  }

  pointerSetting.checked = layout.showStreamPointer;
  pointerSetting.onchange = () => {
    layout.showStreamPointer = pointerSetting.checked;
    hideStreamPointer();
    commitLayout();
  };

  desktop.addEventListener('pointermove', event => {
    if (!layout.showStreamPointer || event.pointerType !== 'mouse' || !scale) return;
    const bounds = desktop.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / scale;
    const y = (event.clientY - bounds.top) / scale;
    // ドラッグ中はポインターが画面外に出てもイベントが届く。
    if (x < 0 || x >= width || y < 0 || y >= height) {
      hideStreamPointer();
      return;
    }
    streamPointer.style.transform = `translate(${x}px, ${y}px)`;
    streamPointer.hidden = false;
    clearTimeout(pointerTimer);
    pointerTimer = setTimeout(hideStreamPointer, 2500);
  });
  desktop.addEventListener('pointerleave', hideStreamPointer);
  desktop.addEventListener('pointercancel', hideStreamPointer);
  window.addEventListener('blur', hideStreamPointer);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideStreamPointer();
  });

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
  const wallpaperFit = byId('wallpaper-fit');
  wallpaperFit.value = layout.wallpaperFit;
  wallpaperPicture.dataset.fit = layout.wallpaperFit;
  wallpaperFit.onchange = () => {
    layout.wallpaperFit = wallpaperFit.value;
    wallpaperPicture.dataset.fit = layout.wallpaperFit;
    commitLayout();
  };
  wallpaperImage.onchange = () => {
    layout.wallpaperFile = wallpaperImage.value;
    applyWallpaper();
    commitLayout();
  };
  if (settingsChoice) {
    for (const [id, label] of [
      ['wallpaper', 'デスクトップ背景'],
      ['wallpaper-image', '壁紙の画像'],
      ['wallpaper-fit', '壁紙の表示方法'],
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
  for (const [key, prefix] of [['comments', 'comment'], ['gifts', 'gift']]) {
    const font = byId(`${prefix}-font-size`);
    const limit = byId(`${prefix}-log-limit`);
    const badges = byId(`${prefix}-badges`);
    const refresh = () => {
      font.value = layout.logs[key].fontSize;
      limit.value = layout.logs[key].limit;
      badges.checked = layout.logs[key].badges;
    };
    refresh();
    const update = () => {
      layout.logs[key] = logOptions({
        fontSize: Number.isFinite(font.valueAsNumber) ? font.valueAsNumber : layout.logs[key].fontSize,
        limit: Number.isFinite(limit.valueAsNumber) ? limit.valueAsNumber : layout.logs[key].limit,
        badges: badges.checked
      });
      comments = comments.slice(-layout.logs.comments.limit);
      gifts = gifts.slice(-layout.logs.gifts.limit);
      refresh();
      renderComments();
      commitLayout();
    };
    font.onchange = update;
    limit.onchange = update;
    badges.onchange = update;
  }
  renderComments();
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
  windowManager.enableDrag(byId('panel-handle'), controls, next => { layout.panel = next; });
  logColors.checked = layout.giftColors;
  logColors.onchange = () => {
    layout.giftColors = logColors.checked;
    commitLayout();
    renderComments();
  };
  byId('reset').onclick = () => {
    layout = {
      ...defaults,
      logs: layout.logs,
      minimized: layout.minimized,
      zoom: layout.zoom,
      width: layout.width, height: layout.height,
      gift: { ...giftDefaults, open: layout.gift.open, minimized: layout.gift.minimized, zoom: layout.gift.zoom, width: layout.gift.width, height: layout.gift.height },
      gallery: { ...layout.gallery, x: galleryDefaults.x, y: galleryDefaults.y },
      viewer: { ...layout.viewer, x: viewerDefaults.x, y: viewerDefaults.y },
      liveStatus: { ...layout.liveStatus, x: liveDefaults.x, y: liveDefaults.y },
      clockGadget: { ...layout.clockGadget, x: clockDefaults.x, y: clockDefaults.y },
      clock: layout.clock,
      taskbarMeta: layout.taskbarMeta,
      showStreamPointer: layout.showStreamPointer,
      showResizeGuides: layout.showResizeGuides,
      theme: layout.theme,
      customTheme: layout.customTheme,
      customPresets: layout.customPresets,
      customThemeStarted: layout.customThemeStarted,
      liveNumberSize: layout.liveNumberSize,
      imageFile: layout.imageFile,
      slideshowSeconds: layout.slideshowSeconds,
      giftColors: layout.giftColors,
      wallpaper: layout.wallpaper,
      wallpaperFile: layout.wallpaperFile,
      wallpaperFit: layout.wallpaperFit,
      eventRules: layout.eventRules
    };
    windowManager.ensureFocus();
    commitLayout();
  };
  byId('sample').onclick = () => addComments([{ name: 'リスナー', body: 'こんばんは！' }]);
  byId('gift').onclick = () => {
    const color = { r: 241, g: 177, b: 65 };
    addComments([{ name: 'リスナー', body: '模擬ギフト', kind: 'unknown', label: '模擬ギフト', color }]);
  };
  windowManager.enableDrag(noticeHandle, notice, next => { layout.notice = next; }, {
    onStart: () => clearTimeout(noticeTimer), onEnd: scheduleNoticeEnd
  });
  connectComments();

  renderLayout();
  new ResizeObserver(resize).observe(viewport);
  window.StreamOSClock.mount({ byId, state: () => layout.clock, commit: commitLayout });
})();
