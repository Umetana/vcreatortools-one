(() => {
  'use strict';

  const stage = document.querySelector('#stage');
  new VCTStage.StageLayout(stage);
  const viewport = stage.querySelector('#stream-content');
  const visibleComments = new Map();
  const pending = [];
  const MAX_PENDING = 8;
  const MAX_WAIT_MS = 6000;
  const eventCodes = {
    superchat: 'SC',
    supersticker: 'STICKER',
    jewel: 'JEWEL',
    membership_gift: 'GIFT',
    membership_gift_received: 'GIFT_RX',
    member_join: 'SUB',
    member_milestone: 'MEMBER',
    membership_event: 'MEMBER'
  };
  let sequence = 0;
  let motion;
  let source;
  let terminal;
  const timeFormat = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });

  function hex(length) {
    return Math.floor(Math.random() * 16 ** length).toString(16).toUpperCase().padStart(length, '0');
  }

  function pseudoLog() {
    const id = hex(4);
    const seq = ++sequence;
    if (terminal) return `[SYS] NODE:${id} ${['SYNC COMPLETE', 'BUFFER READY', 'LINK OK'][seq % 3]}`;
    const samples = [
      `[SYS] NODE:${id}  SYNC COMPLETE  SEQ:${seq}`,
      `{NODE:0x${id}, SEQ:${seq}, STREAM:ACTIVE}`,
      `${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)}   LINK_OK   0x${id}`,
      `[TX] 0x${id}  FRAME:${seq}  ACK:OK`
    ];
    return samples[Math.floor(Math.random() * samples.length)];
  }

  function eventDetails(comment) {
    const event = comment.event;
    if (!event?.isSupport && !event?.isMembership) return null;
    const money = comment.monetization?.money;
    const amount = money?.available
      ? money.displayText || [money.currency, money.amount.toLocaleString('ja-JP')].filter(Boolean).join(' ')
      : '';
    const count = event.kind === 'membership_gift' ? comment.membership?.giftCount : 0;
    const label = event.displayLabel === amount ? '' : event.displayLabel;
    return {
      code: eventCodes[event.kind] || 'GIFT',
      amount,
      count,
      label,
      announcement: event.announcementText?.trim(),
      color: comment.style?.colorString === 'rgb(255, 255, 255)' ? '' : comment.style?.colorString
    };
  }

  function receiveComment(comment) {
    if (source === 'pseudo') return;
    const parts = [...(comment.message?.parts ?? [])];
    const event = eventDetails(comment);
    const gift = comment.monetization?.gift;
    const isSticker = comment.event?.kind === 'supersticker';
    if (isSticker && !parts.some(part => part.type === 'emoji' && (part.isSticker || part.url === gift?.imageUrl))) {
      parts.push({ type: 'emoji', isSticker: true, url: gift?.imageUrl, alt: gift?.label });
    }
    if (!parts.some(part => part.type === 'emoji' || part.content?.trim())) {
      if (!event) return;
      parts.length = 0;
    }
    if (pending.length >= MAX_PENDING) pending.shift();
    pending.push({ name: comment.user?.displayName, parts, event, receivedAt: performance.now(), time: Date.now() });
  }

  function appendImage(row, part) {
    const fallback = part.alt?.trim() || (part.isSticker ? '[スタンプ]' : '[絵文字]');
    let url;
    try {
      if (part.url) url = new URL(part.url, document.baseURI);
    } catch {
      // URLが不正な場合は代替テキストを使う。
    }
    const allowed = url && (url.protocol === 'https:' || url.protocol === 'http:' ||
      /^data:image\/(?:png|gif|webp|jpeg|avif);/i.test(url.href));
    if (!allowed) {
      row.append(fallback);
      return;
    }

    const image = document.createElement('img');
    image.className = part.isSticker ? 'stream-image stream-sticker' : 'stream-image';
    image.alt = fallback;
    image.addEventListener('error', () => image.replaceWith(fallback), { once: true });
    image.src = url.href;
    row.append(image);
  }

  function span(className, text) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function appendParts(row, parts) {
    for (const part of parts) {
      if (part.type === 'text') row.append(part.content.replace(/\s+/gu, ' '));
      if (part.type === 'emoji') appendImage(row, part);
    }
  }

  function appendField(row, key, value) {
    row.append(span('stream-key', key), ':', value);
  }

  function appendJsonComment(row, comment, name) {
    const { event, parts } = comment;
    row.append('{');
    const type = span('stream-event', event?.code || 'RX');
    if (event?.color) type.style.color = event.color;
    appendField(row, 'type', type);
    if (event?.amount) {
      row.append(', ');
      appendField(row, 'amount', JSON.stringify(event.amount));
    }
    if (event?.count > 0) {
      row.append(', ');
      appendField(row, 'count', String(event.count));
    }
    row.append(', ');
    name.textContent = JSON.stringify(name.textContent);
    appendField(row, 'user', name);
    if (event?.announcement || event?.label) {
      row.append(', ');
      appendField(row, 'label', JSON.stringify(event.announcement || event.label));
    }
    if (parts.length) {
      row.append(', ', span('stream-key', 'msg'), ':"');
      appendParts(row, parts);
      row.append('"');
    }
    row.append('}');
  }

  function appendFlowComment(row, comment, name) {
    const { event, parts } = comment;
    const details = event?.amount || (event?.count > 0 ? `×${event.count}` : '');
    const label = span('stream-event', `[${[event?.code || 'RX', details].filter(Boolean).join(' ')}]`);
    if (event?.color) label.style.color = event.color;
    row.append(label, ' ', name);
    if (parts.length) {
      row.append(' > ');
      appendParts(row, parts);
    } else if (event?.announcement || event?.label) {
      row.append(' > ', event.announcement || event.label);
    }
  }

  function fillPseudoRow(row) {
    row.textContent = source === 'comments' ? '\u00a0' : pseudoLog();
    if (terminal && source !== 'comments') {
      row.prepend(span('stream-time', `[${timeFormat.format(Date.now())}] `));
    }
  }

  function makeRow(comment) {
    const row = document.createElement('div');
    row.className = comment ? 'stream-row is-comment' : 'stream-row';
    if (comment) {
      if (terminal) row.append(span('stream-time', `[${timeFormat.format(comment.time)}] `));
      const name = span('stream-name', comment.name?.trim() || 'Anonymous');
      if (stage.dataset.commentFormat === 'json') appendJsonComment(row, comment, name);
      else appendFlowComment(row, comment, name);
      visibleComments.set(row, comment);
    } else {
      fillPseudoRow(row);
    }
    return row;
  }

  stage.addEventListener('commentformatchange', () => {
    for (const [row, comment] of [...visibleComments]) {
      row.replaceWith(makeRow(comment));
      visibleComments.delete(row);
    }
  });

  function removeOldestRow(layer) {
    const row = motion === 'top' ? layer.element.lastElementChild : layer.element.firstElementChild;
    if (!row) return;
    visibleComments.delete(row);
    row.remove();
  }

  const layers = [
    { element: stage.querySelector('.stream-back'), rowHeight: 27, interval: 300, acceptsComments: false },
    { element: stage.querySelector('.stream-front'), interval: 850, acceptsComments: true }
  ];

  function configureStreams() {
    ({ motion, source } = stage.dataset);
    terminal = stage.dataset.visual === 'terminal';
    if (source === 'pseudo') pending.length = 0;
    visibleComments.clear();
    for (const layer of layers) {
      layer.element.replaceChildren();
      layer.element.style.transform = '';
      layer.lastStep = performance.now();
      layer.element.hidden = !layer.acceptsComments && (terminal || source === 'comments');
    }
    layers[1].rowHeight = terminal ? 30 : 42;
    resizeStreams();
  }

  function resizeStreams() {
    const height = viewport.clientHeight;
    for (const layer of layers) {
      if (layer.element.hidden) continue;
      const scroll = motion === 'scroll';
      layer.capacity = Math.ceil(height / layer.rowHeight) + (scroll ? 2 : 0);
      while (layer.element.childElementCount > layer.capacity) removeOldestRow(layer);
      if (scroll) {
        // 新着側を保持し、古い行の側で高さの差分を吸収する。
        while (layer.element.childElementCount < layer.capacity) layer.element.prepend(makeRow());
      }
      layer.baseOffset = layer.capacity * layer.rowHeight - height;
    }
  }

  configureStreams();
  stage.addEventListener('streamsettingschange', configureStreams);
  const resizeObserver = new ResizeObserver(resizeStreams);
  resizeObserver.observe(viewport);

  function draw(now) {
    for (const layer of layers) {
      if (layer.element.hidden) continue;
      if (now - layer.lastStep >= layer.interval) {
        // バックグラウンド復帰時も経過時間分のログをまとめて生成しない。
        layer.lastStep = now;
        if (layer.acceptsComments) {
          while (pending.length && now - pending[0].receivedAt > MAX_WAIT_MS) pending.shift();
        }
        const comment = layer.acceptsComments ? pending.shift() : null;
        if (comment || source !== 'comments' || motion === 'scroll') {
          if (layer.element.childElementCount >= layer.capacity) removeOldestRow(layer);
          const row = makeRow(comment);
          if (motion === 'top') layer.element.prepend(row);
          else layer.element.append(row);
        }
      }
      if (motion === 'scroll') {
        const offset = layer.baseOffset + (now - layer.lastStep) * layer.rowHeight / layer.interval;
        layer.element.style.transform = `translateY(-${offset}px)`;
      }
    }
    requestAnimationFrame(draw);
  }

  const adapter = new VCTStage.OneCommeAdapter({
    onComment: receiveComment,
    onClear: () => {
      pending.length = 0;
      visibleComments.clear();
      for (const row of stage.querySelectorAll('.is-comment')) {
        if (motion === 'scroll') {
          row.classList.remove('is-comment');
          fillPseudoRow(row);
        } else {
          row.remove();
        }
      }
    },
    onStatus: status => console.info('[Terminal Stream FX]', status)
  });

  requestAnimationFrame(draw);
  adapter.start();
})();
