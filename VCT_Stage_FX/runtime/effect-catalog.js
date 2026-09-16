// 明示されたローカルPluginだけを読み込む。フォルダ探索は行わない。
(function () {
  'use strict';
  const api = window.VCTStage, runtime = window.VCT_CONFIG_RUNTIME;
  const key = runtime.effectsStorageKey;
  const valid = id => typeof id === 'string' && /^[a-z][a-z0-9_-]{0,63}$/i.test(id);
  const standard = [...new Set(['sample_effect', ...(Array.isArray(window.VCT_EFFECTS_LIST) ? window.VCT_EFFECTS_LIST.filter(valid) : [])])];
  let state = { added: [], disabled: [] }, busy = false;
  const styles = new Map(), cache = new Map(), errors = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) state = { added: [...new Set((Array.isArray(saved.added) ? saved.added : []).filter(valid))].slice(0, 32),
      disabled: (Array.isArray(saved.disabled) ? saved.disabled : []).filter(id => valid(id) && id !== 'sample_effect') };
  } catch (_) { errors.set('保存一覧', '保存一覧を読み込めませんでした'); }
  const loadElement = (tag, id) => new Promise((resolve, reject) => {
    const element = document.createElement(tag);
    const path = `./effects/${id}/${tag === 'script' ? 'main.js' : 'style.css'}`;
    let timer;
    const finish = error => {
      clearTimeout(timer); element.onload = element.onerror = null;
      if (error) { element.dataset.expired = 'true'; element.remove(); reject(new Error(`${path} の読み込みに失敗しました`)); }
      else resolve(element);
    };
    if (tag === 'script') { element.src = path; element.dataset.effectId = id; }
    else { element.rel = 'stylesheet'; element.href = path; }
    element.onload = () => finish(false); element.onerror = () => finish(true);
    timer = setTimeout(() => finish(true), 8000);
    document.head.appendChild(element);
  });
  async function load(id) {
    if (cache.has(id)) { api.registry.effects.set(id, cache.get(id)); styles.get(id).disabled = false; return; }
    let style;
    try {
      style = await loadElement('link', id);
      const script = await loadElement('script', id);
      if (script.effectError) throw script.effectError;
      const Effect = api.registry.get(id);
      if (!Effect) throw new Error(`PluginがID「${id}」を登録しませんでした`);
      for (const [name, field] of Object.entries(Effect.manifest.settings || {})) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(name) || !field || !['checkbox', 'select', 'text', 'color', 'range', 'range-number', 'number'].includes(field.type) ||
            typeof field.label !== 'string' || !['string', 'number', 'boolean'].includes(typeof field.default) ||
            (field.type === 'select' && (!Array.isArray(field.options) || !field.options.length || !field.options.every(value => typeof value === 'string')))) throw new Error(`設定定義が不正です: ${name}`);
        if (Object.hasOwn(runtime.defaults, name)) throw new Error(`設定キーが重複しています: ${name}`);
      }
      for (const [name, field] of Object.entries(Effect.manifest.settings || {})) {
        runtime.defaults[name] = field.default;
        runtime.baseline[name] = runtime.fileConfig[name] ?? field.default;
        runtime.effective[name] = runtime.localOverrides[name] ?? runtime.baseline[name];
      }
      cache.set(id, Effect); styles.set(id, style);
    } catch (error) { api.registry.effects.delete(id); style?.remove(); throw error; }
  }
  async function change(id, enabled) {
    if (busy) throw new Error('演出の読み込み中です');
    if (!valid(id)) throw new Error('IDは英字で始まる英数字・_・-の64文字以内です');
    if (!enabled && id === 'sample_effect') throw new Error('サークルは標準の復帰先です');
    if (enabled && api.registry.get(id)) throw new Error('登録済みの演出です');
    if (enabled && !standard.includes(id) && !state.added.includes(id) && state.added.length >= 32) throw new Error('追加上限は32件です');
    busy = true;
    try {
      if (enabled) await load(id);
      const next = { added: state.added.filter(value => value !== id), disabled: state.disabled.filter(value => value !== id) };
      if (enabled && !standard.includes(id)) next.added.push(id);
      if (!enabled && standard.includes(id)) next.disabled.push(id);
      try { localStorage.setItem(key, JSON.stringify(next)); }
      catch (_) { if (enabled) { api.registry.effects.delete(id); if (styles.has(id)) styles.get(id).disabled = true; } throw new Error('保存できませんでした。登録一覧は変更していません'); }
      state = next;
      if (!enabled) { api.registry.effects.delete(id); if (styles.has(id)) styles.get(id).disabled = true; }
      errors.delete(id);
      window.dispatchEvent(new CustomEvent('vct-effects-changed'));
    } catch (error) { errors.set(id, error.message); throw error; }
    finally { busy = false; }
  }
  api.catalog = {
    change, errors,
    entries: () => [...new Set([...standard, ...state.added])].map(id => ({ id, standard: standard.includes(id), enabled: !!api.registry.get(id), name: cache.get(id)?.manifest.name || id })),
    async start() {
      await Promise.all([...new Set([...standard, ...state.added])].map(async id => {
        if (state.disabled.includes(id)) return;
        try { await load(id); } catch (error) { errors.set(id, error.message); }
      }));
    }
  };
  api.effectsReady = api.catalog.start();
})();
