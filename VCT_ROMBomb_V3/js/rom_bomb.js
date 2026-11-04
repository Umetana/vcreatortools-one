// MIT Copyright (c) 2026 Umetana
(function () {
  'use strict';
  const stage = document.getElementById('stage');
  const list = document.getElementById('cards');
  let config = { ...window.CONFIG };
  let appearance = { ...config };
  const engine = new window.RomBombEngine(config);
  const elements = new Map();
  const randomPositions = new Map();
  const sounded = new Set();
  const audio = window.RomBombAudio.create(window.AudioContext || window.webkitAudioContext,
    message => window.dispatchEvent(new CustomEvent('rom-audio-status', { detail: message })));
  const subscriptions = [];
  let disposed = false;
  let demo = null;
  let demoStartedAt = 0;
  let demoDuration = 0;
  let demoTimer = null;
  let lastRows = [];
  let editing = false;
  const editingOverlay = document.createElement('div');
  editingOverlay.id = 'rom-placement-editor';
  editingOverlay.textContent = 'ドラッグで移動・ホイールで倍率';
  editingOverlay.hidden = true;
  document.body.append(editingOverlay);
  let placementEditor;
  const positionKey = row => `${demo ? 'demo' : 'live'}:${row.key}:${row.generation}`;

  const timeText = (elapsed) => {
    const seconds = Math.floor(elapsed / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const displayTime = (row) => {
    if (appearance.TIME_MODE !== 'remaining') return timeText(row.elapsed);
    const limit = (demo ? demo.config.EXPLODE_MIN : config.EXPLODE_MIN) * 60000;
    // 残り1秒未満で先に00:00にならないよう切り上げ、爆発時は0に固定する。
    const remaining = row.status === 'exploding' ? 0 : Math.max(0, limit - row.elapsed);
    return timeText(Math.ceil(remaining / 1000) * 1000);
  };
  const safeImage = (value) => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  };
  const makeCard = () => {
    const shell = document.createElement('div');
    shell.className = 'rom-slot';
    const card = document.createElement('div');
    card.className = 'rom-card';
    const portrait = document.createElement('div');
    portrait.className = 'rom-portrait';
    const fallback = document.createElement('span');
    fallback.className = 'rom-fallback';
    fallback.textContent = '👤';
    const image = document.createElement('img');
    image.className = 'rom-avatar';
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.hidden = true;
    image.addEventListener('error', () => { image.hidden = true; });
    image.addEventListener('load', () => { image.hidden = false; });
    portrait.append(fallback, image);
    const timer = document.createElement('span');
    timer.className = 'rom-time';
    const bomb = document.createElement('span');
    bomb.className = 'rom-bomb';
    bomb.setAttribute('aria-hidden', 'true');
    const symbol = document.createElement('span');
    symbol.className = 'rom-symbol';
    const artwork = document.createElement('img');
    artwork.className = 'rom-artwork';
    artwork.alt = '';
    artwork.hidden = true;
    bomb.append(symbol, artwork);
    const name = document.createElement('div');
    name.className = 'rom-name';
    card.append(portrait, bomb, timer);
    shell.append(card, name);
    list.appendChild(shell);
    return { shell, card, image, timer, bomb, symbol, artwork, name, imageUrl: '', state: '' };
  };
  function layout() {
    // V3.1の固定キャンバス方式を継承。位置は端からのオフセットで指定する。
    const fit = Math.max(.01, Math.min(innerWidth / 1920, innerHeight / 1080));
    stage.style.transform = `translate(-50%, -50%) scale(${fit})`;
    const right = appearance.POSITION.startsWith('right');
    const bottom = appearance.POSITION.endsWith('bottom');
    const random = appearance.ARRANGEMENT === 'random';
    const horizontal = appearance.ARRANGEMENT === 'horizontal';
    const gap = appearance.ITEM_GAP_PX;
    const count = lastRows.length;
    // 名前までを含む固定領域の間隔。成長する爆弾の寸法には左右されない。
    const slotWidth = 132, slotHeight = 82;
    const perLine = appearance.WRAP_COUNT || Math.max(1, count);
    const primary = Math.min(count, perLine);
    const secondary = Math.ceil(count / perLine);
    const columns = horizontal ? primary : secondary;
    const rows = horizontal ? secondary : primary;
    const span = (size, items) => items ? items * size + (items - 1) * gap : 0;
    Object.assign(list.style, {
      left: random ? `${appearance.RANDOM_X}px` : right ? 'auto' : `${appearance.OFFSET_X}px`,
      right: random ? 'auto' : right ? `${appearance.OFFSET_X}px` : 'auto',
      top: random ? `${appearance.RANDOM_Y}px` : bottom ? 'auto' : `${appearance.OFFSET_Y}px`,
      bottom: random ? 'auto' : bottom ? `${appearance.OFFSET_Y}px` : 'auto',
      width: `${random ? appearance.RANDOM_WIDTH : span(slotWidth, columns)}px`,
      height: `${random ? appearance.RANDOM_HEIGHT : span(slotHeight, rows)}px`,
      transform: random ? 'none' : `scale(${appearance.SCALE})`,
      transformOrigin: `${right ? 'right' : 'left'} ${bottom ? 'bottom' : 'top'}`
    });
    lastRows.forEach((row, index) => {
      const element = elements.get(`${row.key}:${row.generation}`);
      const column = horizontal ? index % perLine : Math.floor(index / perLine);
      const rowIndex = horizontal ? Math.floor(index / perLine) : index % perLine;
      if (!element) return;
      element.shell.style.transformOrigin = 'top left';
      if (random) {
        const key = positionKey(row);
        if (!randomPositions.has(key)) randomPositions.set(key, { u: Math.random(), v: Math.random() });
        const point = randomPositions.get(key);
        const x = point.u * appearance.RANDOM_WIDTH - slotWidth * appearance.SCALE / 2;
        const y = point.v * appearance.RANDOM_HEIGHT - slotHeight * appearance.SCALE / 2;
        element.shell.style.transform = `translate(${x}px, ${y}px) scale(${appearance.SCALE})`;
      } else element.shell.style.transform = `translate(${column * (slotWidth + gap)}px, ${rowIndex * (slotHeight + gap)}px)`;
    });
    const width = random ? list.offsetWidth : Math.max(132, list.offsetWidth), height = random ? list.offsetHeight : Math.max(82, list.offsetHeight);
    const rect = list.getBoundingClientRect();
    const scale = fit * (random ? 1 : appearance.SCALE);
    Object.assign(editingOverlay.style, {
      left: `${!random && right ? rect.right - width * scale : rect.left}px`,
      top: `${!random && bottom ? rect.bottom - height * scale : rect.top}px`,
      width: `${width * scale}px`, height: `${height * scale}px`
    });
    editingOverlay.hidden = !editing;
    placementEditor?.setValue({ x: random ? appearance.RANDOM_X : right ? 1920 - appearance.OFFSET_X : appearance.OFFSET_X,
      y: random ? appearance.RANDOM_Y : bottom ? 1080 - appearance.OFFSET_Y : appearance.OFFSET_Y, width, height, scale: appearance.SCALE });
    placementEditor?.setEnabled(editing);
  }
  placementEditor = window.VCTPlacementEditor.create({
    element: editingOverlay, getCanvasRect: () => stage.getBoundingClientRect(), canvasWidth: 1920, canvasHeight: 1080,
    limits: { x: [0,1920,0], y: [0,1080,0], width: [1,16384,132], height: [1,16384,82], scale: [.1,3,1] },
    value: { x: 0, y: 0, width: 132, height: 82, scale: config.SCALE },
    onChange(value, changed) {
      const patch = {};
      const random = appearance.ARRANGEMENT === 'random';
      if (changed.includes('x')) {
        if (random) patch.RANDOM_X = Math.min(value.x, 1920 - appearance.RANDOM_WIDTH);
        else patch.OFFSET_X = appearance.POSITION.startsWith('right') ? 1920 - value.x : value.x;
      }
      if (changed.includes('y')) {
        if (random) patch.RANDOM_Y = Math.min(value.y, 1080 - appearance.RANDOM_HEIGHT);
        else patch.OFFSET_Y = appearance.POSITION.endsWith('bottom') ? 1080 - value.y : value.y;
      }
      if (changed.includes('scale')) patch.SCALE = value.scale;
      window.dispatchEvent(new CustomEvent('rom-placement-change', { detail: patch }));
    }
  });
  function endEditing() {
    editing = false;
    placementEditor.setEnabled(false);
    editingOverlay.hidden = true;
    window.dispatchEvent(new CustomEvent('rom-placement-state', { detail: false }));
  }
  function toggleEditing() {
    if (document.getElementById('vct-settings-root')?.hidden !== false) return;
    editing = !editing;
    placementEditor.end();
    layout();
    window.dispatchEvent(new CustomEvent('rom-placement-state', { detail: editing }));
  }
  function onVisibility() { if (document.hidden) endEditing(); }
  function render(rows) {
    lastRows = rows;
    const keep = new Set();
    rows.forEach((row) => {
      const id = `${row.key}:${row.generation}`;
      keep.add(id);
      let element = elements.get(id);
      if (!element) { element = makeCard(); elements.set(id, element); }
      const state = `${row.stage}:${row.status}`;
      if (element.state !== state) {
        element.shell.dataset.stage = String(row.stage);
        element.shell.dataset.status = row.status;
        element.state = state;
      }
      const shownTime = displayTime(row);
      element.shell.style.setProperty('--explosion-duration', `${row.duration || 2000}ms`);
      element.shell.setAttribute('aria-label', `${row.name} ${appearance.TIME_MODE === 'remaining' ? '残り' : '経過'} ${shownTime}${row.status === 'exploding' ? ' 爆発' : row.status === 'released' ? ' 解除' : ''}`);
      element.timer.textContent = shownTime;
      element.timer.title = appearance.TIME_MODE === 'remaining' ? '爆発までの残り時間' : '爆弾登場からの経過時間';
      element.timer.hidden = !appearance.SHOW_TIME;
      element.name.textContent = row.name;
      element.name.title = row.name;
      element.name.hidden = !appearance.SHOW_NAME;
      window.RomBombEffects.material(element, row, appearance.VISUAL_MODE);
      window.RomBombEffects.shatter(element, row, config.SHATTER_CARDS);
      const soundKey = positionKey(row);
      if (row.status === 'exploding' && !sounded.has(soundKey)) {
        sounded.add(soundKey);
        // 設定変更や確認表示の終了で、既に進行中の爆発を鳴らし直さない。
        if (config.EXPLOSION_SOUND && Date.now() - (row.until - row.duration) < 400) audio.play(config.SOUND_VOLUME, config.SOUND_MODE, config.SOUND_OVERLAP);
      }
      const url = safeImage(row.profileImage);
      if (url !== element.imageUrl) {
        element.imageUrl = url;
        element.image.hidden = true;
        if (url) element.image.src = url;
        else element.image.removeAttribute('src');
      }
    });
    for (const [id, element] of elements) {
      if (!keep.has(id)) { element.shell.remove(); elements.delete(id); }
    }
    layout();
  }
  function tick() {
    if (disposed) return;
    const now = Date.now();
    if (demo && now - demoStartedAt >= demoDuration) stopDemo();
    if (demo) {
      // 確認表示の裏で本番の未登場タイマーを開始しない。受信は継続する。
      render(demo.snapshot(now));
    } else render(engine.snapshot(now));
    // 表示枠から外れても同じ監視サイクルなら座標を保持し、退場済みだけ掃除する。
    const live = new Set();
    for (const [scope, current] of [['live', engine], ['demo', demo]]) {
      if (current) for (const row of [...current.listeners.values(), ...current.effects.values()]) live.add(`${scope}:${row.key}:${row.generation}`);
    }
    for (const key of randomPositions.keys()) if (!live.has(key)) randomPositions.delete(key);
    for (const key of sounded) if (!live.has(key)) sounded.delete(key);
  }
  function receive(raw) {
    if (disposed || !raw || typeof raw !== 'object') return;
    const data = raw.data;
    if (!data || typeof data !== 'object') return;
    const parsed = window.VCT_SDK.normalize(raw);
    // 公開CommentDataのtimestampで起動前の履歴を除外。時刻不明は受け付けない。
    const timestamp = typeof data.timestamp === 'number' ? data.timestamp : Date.parse(data.timestamp);
    const kind = parsed.event?.kind;
    const system = data.meta?.type === 'system' || !['normal', 'superchat', 'member_milestone'].includes(kind);
    const accepted = engine.receive({
      id: data.id,
      service: parsed.service.id,
      userId: parsed.user.id,
      timestamp,
      name: parsed.user.displayName || parsed.user.name,
      profileImage: parsed.user.profileImage,
      owner: parsed.user.roles.owner,
      moderator: parsed.user.roles.moderator,
      system
    }, Date.now());
    if (accepted && !demo) render(engine.snapshot(Date.now()));
  }
  function applyCommitted(event) {
    endEditing();
    const next = window.VCT_TEMPLATE_SETTINGS.validate(event.detail);
    if (next.SOUND_MODE !== config.SOUND_MODE || next.SOUND_OVERLAP !== config.SOUND_OVERLAP) audio.stop();
    engine.configure(next, Date.now());
    config = { ...next };
    appearance = { ...next };
    if (config.EXPLOSION_SOUND && config.SOUND_VOLUME > 0) void audio.unlock();
    else audio.stop();
    stopDemo();
    tick();
  }
  function preview(event) {
    try {
      const next = window.VCT_TEMPLATE_SETTINGS.validate(event.detail);
      if (next.ARRANGEMENT !== appearance.ARRANGEMENT) endEditing();
      appearance = next;
      render(lastRows);
    } catch (_) { /* 入力途中の不正値は表示にも適用しない。 */ }
  }
  function resetPreview() {
    endEditing();
    appearance = { ...config };
    stopDemo();
    tick();
  }
  function stopDemo() {
    if (demo) audio.stop();
    demo = null;
    for (const key of sounded) if (key.startsWith('demo:')) sounded.delete(key);
    for (const key of randomPositions.keys()) if (key.startsWith('demo:')) randomPositions.delete(key);
    if (demoTimer !== null) clearTimeout(demoTimer);
    demoTimer = null;
    const label = document.getElementById('rom-demo-label');
    if (label) label.remove();
  }
  function startDemo() {
    stopDemo();
    demoStartedAt = Date.now();
    demo = new window.RomBombEngine({ ...config, ENABLED: true, START_MIN: .02, WARN_MIN: .04, DANGER_MIN: .06, EXPLODE_MIN: .08, MAX_ITEMS: 3 }, demoStartedAt);
    demoDuration = 6000 + config.EXPLOSION_SECONDS * 1000 + 400;
    for (let index = 0; index < 3; index++) {
      demo.receive({ id: `demo-${index}`, userId: `demo-${index}`, service: 'demo', timestamp: demoStartedAt,
        name: ['表示確認用リスナー', '長い名前のリスナーの表示を確認', 'テスト参加者'][index] }, demoStartedAt);
    }
    const label = document.createElement('div');
    label.id = 'rom-demo-label';
    label.textContent = `表示確認中（本番データとは別・約${Math.ceil(demoDuration / 1000)}秒）`;
    document.body.append(label);
    // 中央のユーザーだけ途中でコメントし、解除と再登録を確認する。
    demoTimer = setTimeout(() => {
      if (!demo) return;
      const now = Date.now();
      demo.receive({ id: 'demo-release', userId: 'demo-1', service: 'demo', timestamp: now, name: '長い名前のリスナーの表示を確認' }, now);
      tick();
    }, 3300);
    tick();
  }
  function testAction(event) {
    if (event.detail === 'demo') startDemo();
    if (event.detail === 'stop') { stopDemo(); tick(); }
  }
  async function testAudio(event) {
    audio.stop();
    const volume = Number(event.detail.volume);
    const mode = event.detail.mode;
    if (volume === 0) {
      window.dispatchEvent(new CustomEvent('rom-audio-status', { detail: '音量が0%のため無音です。' }));
    } else if (await audio.unlock()) audio.play(volume, mode);
  }
  window.addEventListener('resize', layout);
  window.addEventListener('vct-settings-preview', preview);
  window.addEventListener('vct-settings-committed', applyCommitted);
  window.addEventListener('vct-settings-reset-preview', resetPreview);
  window.addEventListener('rom-test', testAction);
  window.addEventListener('rom-audio-test', testAudio);
  window.addEventListener('rom-placement-toggle', toggleEditing);
  document.addEventListener('visibilitychange', onVisibility);
  const interval = setInterval(tick, 200);
  window.addEventListener('pagehide', () => {
    disposed = true;
    clearInterval(interval);
    stopDemo();
    audio.dispose();
    placementEditor.destroy();
    for (const id of subscriptions) window.OneSDK?.unsubscribe(id);
    window.removeEventListener('resize', layout);
    window.removeEventListener('vct-settings-preview', preview);
    window.removeEventListener('vct-settings-committed', applyCommitted);
    window.removeEventListener('vct-settings-reset-preview', resetPreview);
    window.removeEventListener('rom-test', testAction);
    window.removeEventListener('rom-audio-test', testAudio);
    window.removeEventListener('rom-placement-toggle', toggleEditing);
    document.removeEventListener('visibilitychange', onVisibility);
  }, { once: true });
  tick();
  if (!window.OneSDK) { console.error('ROM爆弾: OneSDKを読み込めませんでした。'); return; }
  OneSDK.setup({ mode: 'diff', permissions: ['comments', 'clear'] });
  subscriptions.push(OneSDK.subscribe({ action: 'comments', callback: response => {
    const comments = Array.isArray(response) ? response : [response];
    comments.forEach(receive);
  } }));
  subscriptions.push(OneSDK.subscribe({ action: 'clear', callback: () => {
    engine.clear(); stopDemo(); tick();
  } }));
  OneSDK.ready().then(() => {
    if (!disposed) return OneSDK.connect();
  }).catch(() => console.error('ROM爆弾: わんコメへ接続できませんでした。'));
})();
