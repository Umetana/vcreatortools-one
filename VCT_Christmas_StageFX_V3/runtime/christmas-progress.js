// クリスマス版専用。表示・SDK購読から成長計算と保存を分離する。
(function (root) {
  'use strict';
  const normalizeGoal = value => Math.min(1000000, Math.max(10, Math.round(Number(value) || 500)));
  const normalizeStages = value => [10, 20, 30].includes(Number(value)) ? Number(value) : 10;
  function snapshot(count, goal, stages = 10) {
    const target = normalizeGoal(goal);
    const total = Number.isSafeInteger(count) && count >= 0 ? count : 0;
    const steps = normalizeStages(stages), stage = Math.min(steps, Math.floor(total * steps / target));
    return { count: total, goal: target, stages: steps, stage, ornaments: Math.floor(stage * 30 / steps), lights: Math.floor(stage * 20 / steps),
      celebrations: Math.max(0, Math.floor((total - target) * 10 / target)), completed: total >= target };
  }
  function eligible(parsed, includeSupport) {
    if (!parsed || parsed.system?.sticky || parsed.event?.shouldShowMessage === false) return false;
    if (!includeSupport && (parsed.event?.isSupport || parsed.event?.isMembership)) return false;
    return !!String(parsed.message?.text || '').trim() || (parsed.message?.parts || []).some(part =>
      part.type === 'text' ? !!String(part.content || '').trim() : ['emoji', 'emote', 'image'].includes(part.type));
  }
  const normalizeSupportBase = value => Math.min(1000, Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : 5)));
  const normalizeGiftLimit = value => Math.min(120, Math.max(1, Math.round(Number(value) || 30)));
  const mix = value => { let n = value >>> 0; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return n >>> 0; };
  const seedFor = text => { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0) || 1; };
  const newSeed = () => (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
  function stageKind(seed, index) {
    const bag = ['red', 'gold', 'ribbon'];
    let state = mix((seed >>> 0) ^ Math.imul(Math.floor(index / 3) + 1, 2654435761));
    for (let i = 2; i > 0; i--) { state = mix(state || 1); const j = state % (i + 1); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    return bag[index % 3];
  }
  function stagePositions(seed) {
    const anchors = [
      [49,20],[43,30],[57,32],[36,39],[51,41],[65,43],[30,48],[44,51],[59,52],[71,55],
      [23,59],[36,61],[51,63],[65,65],[78,67],[19,70],[31,73],[44,75],[58,77],[72,79],
      [84,81],[13,82],[25,85],[38,87],[51,88],[64,89],[77,90],[35,55],[60,24],[46,68]
    ];
    let state = mix((seed >>> 0) ^ 0x71ab942d) || 1;
    const random = () => { state = mix(state); return state / 4294967296; };
    const points = [];
    for (const [x,y] of anchors) {
      let best = [x,y], distance = -1;
      // 小さい揺らぎの範囲で、既に置いた飾りとの近接を避ける。
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = [x + (random() * 2 - 1) * 1.2, y + (random() * 2 - 1) * .8];
        const nearest = Math.min(Infinity, ...points.map(p => Math.hypot(candidate[0]-p[0], (candidate[1]-p[1])*1.5)));
        if (nearest > distance) { best = candidate; distance = nearest; }
        if (nearest >= 7.5) break;
      }
      points.push(best);
    }
    // 追加順は座標と別に抽選し、育ち途中から上下左右へ散らす。
    for (let i = points.length - 1; i > 0; i--) { const j = Math.floor(random() * (i+1)); [points[i],points[j]] = [points[j],points[i]]; }
    return points;
  }
  function addGift(gifts, id, seed, limit, rank = 'standard') {
    const cap = normalizeGiftLimit(limit);
    const kept = cap > 1 ? gifts.slice(-(cap - 1)) : [];
    const used = new Set(kept.map(gift => gift.slot));
    const offset = mix((seed >>> 0) ^ Math.imul(id, 2246822519)) % 120;
    let slot = offset; while (used.has(slot)) slot = (slot + 1) % 120;
    return [...kept, { id, slot, kind: mix((seed >>> 0) ^ Math.imul(id, 3266489917)) % 2 ? 'bell' : 'present',
      rank: ['small','standard','large','extra'].includes(rank) ? rank : 'standard' }];
  }
  const isGiftSupport = parsed => !!parsed && !parsed.system?.sticky && !parsed.membership?.isGiftReceiver && parsed.event?.kind !== 'membership_gift_received' && parsed.event?.isSupport === true;
  function pointsFor(parsed, supportBase, classify) {
    // 贈り手と受取通知を重ねて加算しない。固定コメントも対象外。
    if (!parsed || parsed.system?.sticky || parsed.membership?.isGiftReceiver || parsed.event?.kind === 'membership_gift_received') return 0;
    const comment = eligible(parsed, true) ? 1 : 0;
    if (!isGiftSupport(parsed)) return comment;
    const factor = ({ small: 1, standard: 2, large: 3, extra: 5 })[classify(parsed)] || 2;
    return comment + normalizeSupportBase(supportBase) * factor;
  }
  class Progress {
    constructor({ storage, key, onChange = () => {}, onError = () => {} }) {
      Object.assign(this, { storage, key, onChange, onError });
      this.count = 0; this.seen = new Set(); this.timer = null; this.dirty = false;
      this.seed = newSeed(); this.gifts = []; this.giftSerial = 0;
      try {
        const saved = JSON.parse(storage.getItem(key) || 'null');
        if (saved && [1,2].includes(saved.version) && Number.isSafeInteger(saved.count) && saved.count >= 0 && Array.isArray(saved.seen)) {
          this.count = saved.count;
          this.seen = new Set(saved.seen.filter(id => typeof id === 'string' && id.length <= 2048).slice(-2000));
          this.seed = Number.isInteger(saved.seed) && saved.seed > 0 && saved.seed <= 0xffffffff ? saved.seed : seedFor(key);
          const ids = new Set(), slots = new Set();
          for (const gift of (Array.isArray(saved.gifts) ? saved.gifts : []).slice(-120)) {
            if (!gift || !Number.isSafeInteger(gift.id) || gift.id < 1 || !Number.isInteger(gift.slot) || gift.slot < 0 || gift.slot >= 120 || !['bell','present'].includes(gift.kind) || ids.has(gift.id) || slots.has(gift.slot)) continue;
            ids.add(gift.id); slots.add(gift.slot);
            this.gifts.push({ id: gift.id, slot: gift.slot, kind: gift.kind, rank: ['small','standard','large','extra'].includes(gift.rank) ? gift.rank : 'standard' });
          }
          this.giftSerial = Math.max(Number.isSafeInteger(saved.giftSerial) && saved.giftSerial >= 0 ? saved.giftSerial : 0, ...this.gifts.map(gift => gift.id));
        } else if (saved !== null) onError('保存されたツリーの成長データを読み込めませんでした。');
      } catch (_) { onError('ツリーの成長データを読み込めませんでした。'); }
    }
    accept(key, points = 1, { gift = false, limit = 30, rank = 'standard' } = {}) {
      if (typeof key !== 'string' || !key || key.length > 2048 || this.seen.has(key) || !Number.isSafeInteger(points) || points < 0 || (points === 0 && !gift) || (this.count >= Number.MAX_SAFE_INTEGER && !gift)) return false;
      this.seen.add(key); if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value);
      this.count = Math.min(Number.MAX_SAFE_INTEGER, this.count + points);
      if (gift && this.giftSerial < Number.MAX_SAFE_INTEGER) this.gifts = addGift(this.gifts, ++this.giftSerial, this.seed, limit, rank);
      this.changed(); return true;
    }
    changed() {
      this.dirty = true; this.onChange();
      if (this.timer === null) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 250);
    }
    trimGifts(limit) { const cap = normalizeGiftLimit(limit); if (this.gifts.length > cap) { this.gifts = this.gifts.slice(-cap); this.changed(); } }
    reset() { this.count = 0; this.gifts = []; this.giftSerial = 0; this.seed = newSeed(); this.changed(); this.flush(); }
    flush() {
      if (!this.dirty) return;
      try {
        this.storage.setItem(this.key, JSON.stringify({ version: 2, count: this.count, seen: [...this.seen], seed: this.seed, gifts: this.gifts, giftSerial: this.giftSerial }));
        this.dirty = false;
      } catch (_) { this.onError('ツリーの成長を保存できません。現在の画面では進行を続けます。'); }
    }
    destroy() { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; this.flush(); }
  }
  const api = { normalizeGoal, normalizeStages, snapshot, eligible, normalizeSupportBase, normalizeGiftLimit, stageKind, stagePositions, addGift, isGiftSupport, pointsFor, Progress };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VCTChristmasProgress = api;
})(typeof window === 'object' ? window : globalThis);
