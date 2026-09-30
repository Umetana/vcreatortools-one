// 設定ファイルを実行せず、コメント付きのリテラル代入だけを読み込む。
(function () {
  'use strict';
  window.VCT_PARSE_CONFIG = function (source) {
    const text = String(source); let pos = 0;
    const fail = () => { throw new Error('設定ファイルには window.CONFIG と文字列・数値・真偽値などの値だけを指定してください。'); };
    function skip() {
      for (;;) {
        const match = /^(?:\s+|\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)/.exec(text.slice(pos));
        if (!match) return; pos += match[0].length;
      }
    }
    function take(token) { skip(); if (!text.startsWith(token, pos)) return false; pos += token.length; return true; }
    function string() {
      skip(); const quote = text[pos++]; let out = '';
      while (pos < text.length) {
        let ch = text[pos++];
        if (ch === quote) return out;
        if (quote.charCodeAt(0) === 96 && ch.charCodeAt(0) === 36 && text[pos] === '{') fail();
        if (ch === '\n' || ch === '\r') fail();
        if (ch === '\\') {
          ch = text[pos++];
          const escapes = { n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', '/':'/', '\\':'\\', '"':'"', "'":"'" };
          if (ch === 'u') { const hex = text.slice(pos, pos + 4); if (!/^[0-9a-f]{4}$/i.test(hex)) fail(); out += String.fromCharCode(parseInt(hex,16)); pos += 4; }
          else { if (!Object.hasOwn(escapes,ch)) fail(); out += escapes[ch]; }
        } else out += ch;
      }
      fail();
    }
    function value(depth = 0) {
      if (depth > 30) fail(); skip();
      if (text[pos] === '"' || text[pos] === "'" || text.charCodeAt(pos) === 96) return string();
      if (take('{')) {
        const result = {}; if (take('}')) return result;
        do {
          skip(); let key;
          if (text[pos] === '"' || text[pos] === "'") key = string();
          else { const m = /^[A-Za-z_$][\w$]*/.exec(text.slice(pos)); if (!m) fail(); key = m[0]; pos += key.length; }
          if (['__proto__','constructor','prototype'].includes(key) || !take(':')) fail();
          result[key] = value(depth + 1);
          if (take('}')) return result;
          if (!take(',')) fail();
          if (take('}')) return result;
        } while (true);
      }
      if (take('[')) { const result=[]; if(take(']')) return result; do { result.push(value(depth+1)); if(take(']')) return result; if(!take(',')) fail(); if(take(']')) return result; } while(true); }
      skip(); const m = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
      if (!m) fail(); pos += m[0].length; const result=JSON.parse(m[0]); if(typeof result==='number' && !Number.isFinite(result)) fail(); return result;
    }
    skip(); const assignment = /^window\.(?:CONFIG_FILE|CONFIG)\s*=/.exec(text.slice(pos));
    if (!assignment) fail(); pos += assignment[0].length;
    const result = value(); take(';'); skip();
    if (pos !== text.length || !result || Array.isArray(result) || typeof result !== 'object') fail();
    return result;
  };
})();