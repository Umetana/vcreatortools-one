// MIT Copyright (c) 2026 Umetana
(function () {
 'use strict';
 const runtime=window.VCT_CONFIG_RUNTIME, contract=window.VCT_TEMPLATE_SETTINGS;
 if (!runtime.vctLinkEnabled) return;
 const connectionKey=runtime.storageKey+'.vct-connection.v1';
 let connection={url:'http://127.0.0.1:3000',key:'',mode:'local'};
 try { const stored=JSON.parse(localStorage.getItem(connectionKey)||'null'); if(stored) connection={...connection,...stored}; } catch {}
 let snapshot=null,busy=false,message='',mount=null,pendingConfirm=false;
 function status(text) { message=text; if(mount) mount.querySelector('[data-status]').textContent=text; }
 function validateConnection(value) {
  const url=new URL(value.url);
  if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash) throw new Error('VCTのローカルURLを指定してください。');
  if(!/^[a-f0-9]{64}$/.test(value.key)) throw new Error('VCT画面の接続キーを登録してください。');
  return {url:url.origin,key:value.key,mode:value.mode==='vct'?'vct':'local'};
 }
 async function request(options={}) {
  const saved=validateConnection(connection), controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try {
   const response=await fetch(saved.url+'/api/template-settings/v1/state?templateId='+encodeURIComponent(contract.templateId),{...options,mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-VCT-Settings-Key':saved.key}});
   const body=await response.json(); if(!response.ok) throw new Error(body.error||'通信できません。');
   return contract.validateState(body);
  } finally { clearTimeout(timer); }
 }
 function lock(value) {
  busy=value;
  const panel=document.querySelector('.vct-settings-panel');
  panel?.querySelectorAll('button,input,select').forEach(el=>{el.disabled=value;});
 }
 async function run(action) {
  if(busy) return; lock(true);
  try { await action(); } catch(error) { status(error.name==='AbortError'?'VCTへ接続できません。現在の設定を維持します。':error.message); }
  finally { lock(false); }
 }
 async function load(startup=false) {
  const next=await request();
  if(next.payload===null) { snapshot=next; throw new Error('VCTの共有設定は未保存です。現在の設定を維持します。'); }
  const payload=contract.validate(next.payload);
  // 起動通信中に編集が始まった場合、遅れて届いた設定で上書きしない。
  if(startup && window.VCT_SETTINGS_PANEL?.isDirty()) throw new Error('編集中のため起動時読込を見送りました。手動で読み込んでください。');
  runtime.validateShared?.(payload);
  runtime.commitLocal(payload);
  snapshot=next;
  window.VCT_SETTINGS_PANEL?.refreshSaved();
  status('VCTから読み込み、適用・ローカル保存しました。');
 }
 async function save() {
  if (window.VCT_SETTINGS_PANEL?.isDirty()) throw new Error('未保存の変更があります。先に「変更を保存」を押してください。');
  // 先に取得したrevisionを使用し、読み直さずに他画面の更新を上書きしない。
  if(!snapshot) snapshot=await request();
  let overrides={}; const raw=localStorage.getItem(runtime.storageKey); if(raw) overrides=JSON.parse(raw);
  delete overrides.VCT_LINK_ENABLED;
  const payload=contract.validate(Object.fromEntries(Object.keys(contract.defaults).map(key=>[key,({...contract.defaults,...runtime.baseline,...overrides})[key]])));
  snapshot=await request({method:'PUT',body:JSON.stringify({...snapshot,payload})});
  status('ローカル保存済み設定をVCTへ保存しました。');
 }
 function attach(parent) {
  mount=document.createElement('details'); mount.className='vct-settings-section';
  mount.innerHTML='<summary>VCT設定連携（試験）</summary><p>起動時の設定取得と、手動の読込・保存を選べます。</p><label>VCT URL<input data-url type="text"></label><label>接続キー<input data-key type="password" autocomplete="off"></label><fieldset><legend>起動・再読込時</legend><label><input type="radio" name="vct-startup" value="local">ローカル設定で起動</label><label><input type="radio" name="vct-startup" value="vct">VCT設定を読み込んで起動</label></fieldset><button type="button" data-connect>接続設定を保存</button><button type="button" data-load>VCTから読み込む</button><button type="button" data-save>VCTへ保存</button><div data-confirm hidden><p>未保存の変更を破棄してVCTから読み込みますか？</p><button type="button" data-yes>破棄して読み込む</button><button type="button" data-no>取消</button></div><p data-status role="status"></p><p>「VCTへ保存」はローカル保存済みの値を送ります。既存の保存ボタンはローカル保存です。VCT読込起動では再読込時に共有設定を取得します。</p>';
  mount.querySelector('[data-url]').value=connection.url; mount.querySelector('[data-key]').value=connection.key;
  mount.querySelector('[value="'+(connection.mode==='vct'?'vct':'local')+'"]').checked=true;
  mount.querySelector('[data-connect]').onclick=()=>{
   try {
    const value={url:mount.querySelector('[data-url]').value.trim(),key:mount.querySelector('[data-key]').value.trim(),mode:mount.querySelector('input[name="vct-startup"]:checked').value};
    // ローカル起動への切替は未接続でも可能。
    const next=value.mode==='local' && !value.key?{...value,url:connection.url}:validateConnection(value);
    localStorage.setItem(connectionKey,JSON.stringify(next)); connection=next; snapshot=null;
    status('接続設定を保存しました。起動モードは次回起動・再読込から使用します。');
   } catch(e) {status(e.message);}
  };
  const ask=mount.querySelector('[data-confirm]');
  mount.querySelector('[data-load]').onclick=()=>{
   if(busy) return;
   if(window.VCT_SETTINGS_PANEL?.isDirty()) {pendingConfirm=true;ask.hidden=false;return;}
   run(()=>load());
  };
  mount.querySelector('[data-yes]').onclick=()=>{if(!pendingConfirm)return;pendingConfirm=false;ask.hidden=true;run(()=>load());};
  mount.querySelector('[data-no]').onclick=()=>{pendingConfirm=false;ask.hidden=true;};
  mount.querySelector('[data-save]').onclick=()=>run(save);
  parent.append(mount); status(message);
 }
 function boot() { if(connection.mode==='vct') run(()=>load(true)); }
 window.VCT_TEMPLATE_LINK={attach,boot};
})();
