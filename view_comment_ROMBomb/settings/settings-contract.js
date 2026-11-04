// MIT Copyright (c) 2026 Umetana
// UIと通信で共用する設定検証。項目定義はテンプレートから受け取る。
(function(root) {
'use strict';
function create(definition) {
const fields=Object.assign({},...Object.values(definition.sections).map(s=>s.fields));
function validate(value) {
 if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('設定形式が不正です。');
 const result={};
 for(const key of Object.keys(value)) if(!Object.hasOwn(definition.defaults,key)) throw new Error('非対応の設定項目: '+key);
 for(const [key,fallback] of Object.entries(definition.defaults)) {
  const v=value[key],field=fields[key]||{};
  if(typeof v!==typeof fallback || (typeof v==='number' && !Number.isFinite(v))) throw new Error('設定値の型が不正です: '+key);
  if(typeof v==='number' && (v<(field.min??0) || v>(field.max??1000000))) throw new Error('設定値が範囲外です: '+key);
  if(field.options && !field.options.includes(v)) throw new Error('選択値が不正です: '+key);
  if(typeof v==='string' && (v.length>2048 || /url\s*\(|@import/i.test(v))) throw new Error('設定文字列が不正です: '+key);
  result[key]=v;
 }
 const file=result.FX_MATERIAL_FILE;
 if(file && (/[:\\?#%]/.test(file) || file.startsWith('/') || file.split('/').some(x=>!x||x==='.'||x==='..') || !/\.(png|jpe?g|webp|gif)$/i.test(file))) throw new Error('素材はassets内の画像ファイル名を指定してください。');
 return result;
}
function validateState(s) {
 if(!s || s.templateId!==definition.templateId || s.schemaVersion!==definition.schemaVersion || s.templateVersion!==definition.templateVersion || !Number.isSafeInteger(s.revision) || s.revision<0) throw new Error('非対応の共有設定です。');
 if(s.payload!==null) validate(s.payload);
 return s;
}
return {...definition,validate,validateState};
}
const factory={create};
if(typeof module==='object' && module.exports) module.exports=factory;
else root.VCT_SETTINGS_CONTRACT=factory;
})(typeof window==='object'?window:globalThis);
