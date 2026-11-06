// DB管理UIの接続入口。コメントは購読せず、保存領域の解決は公式OneSDKに任せる。
(function (global) {
  'use strict';
  let connectionPromise = null;
  let connectionState = '未開始';

  function ready() {
    if (connectionPromise) return connectionPromise;
    connectionState = '接続確認中';
    connectionPromise = new Promise((resolve, reject) => {
      const controls = Array.from(document.querySelectorAll('button, input, select, textarea'))
        .map((element) => ({ element, disabled: element.disabled }));
      controls.forEach(({ element }) => { element.disabled = true; });
      const sdk = global.OneSDK;
      if (!sdk) {
        connectionState = 'SDK未読込';
        reject(new Error('OneSDKが読み込まれていません'));
        return;
      }
      let subscriberId;
      let settled = false;
      const timer = setTimeout(() => {
        connectionState = '接続確認タイムアウト';
        settled = true;
        sdk.unsubscribe(subscriberId);
        reject(new Error('わんコメの接続確認がタイムアウトしました。わんコメ起動後にソースを再読み込みしてください'));
      }, 15000);
      function fail(error) {
        if (settled) return;
        connectionState = '接続確認失敗';
        settled = true;
        clearTimeout(timer);
        if (subscriberId != null) sdk.unsubscribe(subscriberId);
        reject(error);
      }
      (async () => {
        await sdk.setup({ permissions: ['connected'], mode: 'diff' });
        if (settled) return;
        subscriberId = sdk.subscribe({
          action: 'connected',
          callback: () => {
            if (settled) return;
            // 現行SDKは必要な自動転送を接続通知より先に処理する。
            // 転送が必要なOBS環境で通知だけ届いた場合、別領域のDB操作を開始しない。
            const chromeMajor = Number(/\bChrome\/(\d+)/.exec(navigator.userAgent)?.[1] || 0);
            if (global.obsstudio && location.protocol === 'http:' && location.hostname === 'absolute' && chromeMajor >= 142) {
              fail(new Error('保存領域の自動転送が完了していません。わんコメとOneSDKの対応版を確認してください'));
              return;
            }
            clearTimeout(timer);
            sdk.unsubscribe(subscriberId);
            settled = true;
            connectionState = '接続確認済み';
            controls.forEach(({ element, disabled }) => { element.disabled = disabled; });
            resolve();
          }
        });
        await sdk.ready();
        if (settled) return;
        await sdk.connect();
      })().catch(fail);
    });
    return connectionPromise;
  }

  global.VCT_MANAGEMENT_CONNECTION = { ready, getStatus: () => connectionState };
})(window);
