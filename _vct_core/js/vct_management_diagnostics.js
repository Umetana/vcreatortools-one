// 管理UI共通の読取専用診断。個別レコードやローカルパスは表示しない。
(function (global) {
  'use strict';
  const group = document.currentScript?.dataset.storage || '';
  const targets = { vct_common_data: ['users', 'supports'] };
  if (group === 'rismon') {
    targets.vct_rismon_data = ['rismon_profiles'];
    targets.vct_rismon_backup = ['snapshots'];
  } else if (group === 'casino') {
    targets.vct_casino_data = ['casino_profiles'];
    targets.vct_casino_settings = ['casino_settings'];
    targets.vct_casino_backup = ['casino_profile_snapshots'];
  }

  function withTimeout(promise) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), 10000);
    })]).finally(() => clearTimeout(timer));
  }

  function countExisting(name, stores) {
    return new Promise((resolve) => {
      let done = false;
      let absent = false;
      const finish = (text) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(`${name}: ${text}`);
      };
      const timer = setTimeout(() => finish('読取タイムアウト'), 10000);
      const request = indexedDB.open(name);
      // 列挙後にDBが消えても新規作成しない。スキーマ更新も中止する。
      request.onupgradeneeded = () => { absent = true; request.transaction.abort(); };
      request.onerror = () => finish(absent ? 'DBなし' : '読取失敗');
      request.onblocked = () => finish('DB接続待ち（blocked）');
      request.onsuccess = () => {
        const db = request.result;
        if (done) { db.close(); return; }
        const existing = stores.filter((store) => db.objectStoreNames.contains(store));
        if (!existing.length) { db.close(); finish('対象ストアなし'); return; }
        try {
          const tx = db.transaction(existing, 'readonly');
          const counts = {};
          for (const store of existing) {
            const count = tx.objectStore(store).count();
            count.onsuccess = () => { counts[store] = count.result; };
          }
          tx.oncomplete = () => {
            db.close();
            finish(`v${db.version}\n  ${stores.map((store) => `${store}=${counts[store] ?? 'ストアなし'}`).join('\n  ')}`);
          };
          tx.onabort = () => { db.close(); finish('件数取得失敗'); };
        } catch {
          db.close();
          finish('件数取得失敗');
        }
      };
    });
  }

  function mount() {
    const host = document.createElement('div');
    host.id = 'vct-management-diagnostics';
    host.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;max-width:calc(100vw - 16px);';
    // 既存UIのCSSや起動時の操作ロックから診断を分離する。
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host{font:14px sans-serif;color:#eef5ff;text-align:left}
      details{box-sizing:border-box;max-width:430px;max-height:55vh;overflow:auto;background:#17212b;border:1px solid #7794af;border-radius:6px;padding:10px}
      summary{cursor:pointer;font-weight:bold}button{margin-top:10px;padding:7px 12px;background:#24577a;border:1px solid #7794af;border-radius:4px;color:#fff;cursor:pointer;font:inherit}
      button:disabled{opacity:.5;cursor:wait}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px monospace;line-height:1.5;margin:10px 0 0}p{font-size:12px;margin:10px 0 0;color:#bcccdc}
    </style><details><summary>接続・保存領域の診断</summary><button type="button">診断を更新</button><p>読取専用。個別データ・フルパスは表示しません。</p><pre aria-live="polite">「診断を更新」で状態とDBの生件数を取得します。</pre></details>`;
    const button = shadow.querySelector('button');
    const output = shadow.querySelector('pre');
    button.addEventListener('click', async () => {
      button.disabled = true;
      const lines = [
        `オリジン: ${location.origin}`,
        `セキュアコンテキスト: ${isSecureContext ? 'はい' : 'いいえ'}`,
        `SDK読込: ${global.OneSDK ? 'あり' : 'なし'}`,
        `起動時確認: ${global.VCT_MANAGEMENT_CONNECTION?.getStatus() || '状態不明'}`,
        `SDK接続: ${global.OneSDK?.connected === true ? '接続中' : '未接続'}`,
        `確認時刻: ${new Date().toLocaleString('ja-JP')}`
      ];
      output.textContent = lines.join('\n') + '\nDB件数を読取中…';
      try {
        if (typeof global.indexedDB?.databases !== 'function') {
          lines.push('DB列挙に未対応のため件数取得を省略');
        } else {
          const databases = await withTimeout(indexedDB.databases());
          for (const [name, stores] of Object.entries(targets)) {
            lines.push(databases.some((db) => db.name === name) ? await countExisting(name, stores) : `${name}: DBなし`);
          }
        }
      } catch {
        lines.push('DB診断に失敗しました（利用不可またはタイムアウト）');
      } finally {
        output.textContent = lines.join('\n');
        button.disabled = false;
      }
    });
    document.body.append(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})(window);
