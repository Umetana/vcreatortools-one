// 保存環境を共有する複数画面を再現し、設定と通知の独立性を確認する。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../settings/config-runtime.js'), 'utf8');
function environment() {
  const data = new Map(), channels = [];
  return function open(url) {
    let reloads = 0;
    const location = new URL(url);
    location.reload = () => reloads++;
    const window = { location, CONFIG_DEFAULT: { FONT_SIZE: 24 }, CONFIG: { MAX_ITEMS: 8 },
      localStorage: { getItem: key => data.get(key), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) },
      BroadcastChannel: class {
        constructor(name) { this.name = name; channels.push(this); }
        postMessage(data) { for (const other of channels) if (other !== this && other.name === this.name) other.onmessage({ data }); }
      }
    };
    vm.runInNewContext(code, { window, URLSearchParams, console });
    return { runtime: window.VCT_CONFIG_RUNTIME, reloads: () => reloads };
  };
}
test('標準・プロファイル・日本語フォルダの保存と復元を分離', () => {
  const open = environment();
  const url = 'http://localhost/view_comment_V3/index.html';
  const talk = open(url + '?profile=talk');
  talk.runtime.writeLocal({ FONT_SIZE: 32, MAX_ITEMS: 8 });
  assert.equal(open(url + '?profile=talk').runtime.effective.FONT_SIZE, 32);
  assert.equal(open(url).runtime.effective.FONT_SIZE, 24);
  assert.equal(open(url + '?profile=game').runtime.effective.FONT_SIZE, 24);
  const a = open('file:///C:/custom/雑談/index.html'), b = open('file:///C:/custom/ゲーム/index.html');
  assert.notEqual(a.runtime.storageKey, b.runtime.storageKey);
  a.runtime.writeLocal({ FONT_SIZE: 36 });
  assert.equal(open('file:///C:/custom/雑談/index.html').runtime.effective.FONT_SIZE, 36);
  assert.equal(open('file:///C:/custom/ゲーム/index.html').runtime.effective.FONT_SIZE, 24);
  talk.runtime.clearLocal();
  assert.equal(open(url + '?profile=talk').runtime.effective.FONT_SIZE, 24);
  assert.equal(open('file:///C:/custom/雑談/index.html').runtime.effective.FONT_SIZE, 36);
});
test('更新通知は同一プロファイルだけへ届く', () => {
  const open = environment(), url = 'http://localhost/v3/index.html';
  const a = open(url + '?profile=a'), same = open(url + '?profile=a'), b = open(url + '?profile=b');
  a.runtime.broadcastReload();
  assert.equal(a.reloads(), 0); assert.equal(same.reloads(), 1); assert.equal(b.reloads(), 0);
});
test('fileは標準、不正IDは警告付き標準、境界・大文字を区別', () => {
  const open = environment(), url = 'http://localhost/v3/index.html';
  assert.equal(open('file:///C:/v3/index.html?profile=a').runtime.profileId, 'default');
  for (const id of ['../bad', 'a'.repeat(65), '日本語']) {
    const r = open(url + '?profile=' + encodeURIComponent(id)).runtime;
    assert.equal(r.profileId, 'default'); assert.ok(r.profileWarning);
  }
  assert.equal(open(url + '?profile=' + 'a'.repeat(64)).runtime.profileId.length, 64);
  assert.notEqual(open(url + '?profile=A').runtime.storageKey, open(url + '?profile=a').runtime.storageKey);
});
