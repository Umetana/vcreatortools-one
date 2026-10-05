// 配信中に配置しているカードの復元用。設定保存・他ソースとの同期とは独立。
(function () {
  'use strict';
  const runtime = window.VCT_CONFIG_RUNTIME;
  const key = 'vct.view-comment-v3.board.' + JSON.stringify([runtime.templateId, runtime.profileId]);
  const fields = ['id','eventKind','name','profileImage','badges','userFlags','parts','translationParts','hasTranslation','hasGift','isSupport','isMembership','isSticky','isSpecial','colorStr','metaLabels','popupSeed','displayOrder','displayStartedAt','effectSeeds','starSeeds','flashMode','giftColor','timestamp'];
  let state = { version: 1, cards: [], positions: {} }, error = '', last = '';
  const report = message => { error = message; window.dispatchEvent(new CustomEvent('vct-board-storage-status', { detail: message })); };
  const validCard = c => c && typeof c === 'object' && Number.isSafeInteger(c.displayOrder) && c.displayOrder > 0 && typeof c.name === 'string' && Array.isArray(c.effectSeeds) && Array.isArray(c.starSeeds?.particles) && ['parts','translationParts','badges','userFlags','metaLabels'].every(k => Array.isArray(c[k]) && c[k].every(v => v && typeof v === 'object'));
  const pick = c => Object.fromEntries(fields.filter(k => Object.prototype.hasOwnProperty.call(c,k)).map(k => [k,c[k]]));
  try {
    const text = localStorage.getItem(key);
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.version !== 1 || !Array.isArray(parsed.cards) || !parsed.cards.every(validCard) || new Set(parsed.cards.map(c=>c.displayOrder)).size !== parsed.cards.length) throw Error('format');
      state.cards = parsed.cards.map(pick);
      for (const c of state.cards) {
        const p = parsed.positions?.[c.displayOrder];
        if (p && ['x','y','z'].every(k => Number.isFinite(p[k]) && p[k]>=0)) state.positions[c.displayOrder] = {x:p.x,y:p.y,z:p.z};
      }
    }
  } catch (_) { error = 'ギフトカードの保存データを読み込めませんでした。保存領域・データをご確認ください。'; }
  const save = () => {
    try {
      const text = JSON.stringify(state);
      if (text !== last) { localStorage.setItem(key,text); last = text; }
      if (error) report('');
      return true;
    } catch (_) { report('ギフトカードを保存できません。再読み込み前に保存容量・ブラウザ設定をご確認ください。'); return false; }
  };
  window.VCT_BOARD_STORE = {
    key, get error() { return error; },
    read: () => JSON.parse(JSON.stringify(state)),
    setCards(cards) {
      state.cards = cards.map(pick);
      const ids = new Set(cards.map(c=>String(c.displayOrder)));
      for(const id of Object.keys(state.positions)) if(!ids.has(id)) delete state.positions[id];
      return save();
    },
    setPositions(positions) {
      state.positions = Object.fromEntries(state.cards.filter(c=>positions[c.displayOrder]).map(c=>[c.displayOrder,{...positions[c.displayOrder]}]));
      return save();
    },
    clear() {
      // 消去に失敗した場合は画面も残し、再読み込みでの意図しない復活を避ける。
      try { localStorage.removeItem(key); state = {version:1,cards:[],positions:{}};last='';report('');return true; }
      catch (_) { report('保存済みギフトカードを全消去できませんでした。');return false; }
    }
  };
})();
