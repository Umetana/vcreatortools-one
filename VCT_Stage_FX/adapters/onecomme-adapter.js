// OneSDKの購読とVCT SDKの正規化をこの境界へ集約する。
(function () {
  'use strict';
  class OneCommeAdapter {
    constructor({ onComment, onClear, onStatus = () => {}, sdk = window.OneSDK, normalize = raw => window.VCT_SDK.normalize(raw) }) {
      Object.assign(this, { onComment, onClear, onStatus, sdk, normalize });
      this.seen = new Set(); this.subscriptions = []; this.disposed = false; this.started = false;
    }
    receive(raw) {
      if (this.disposed || document.hidden || !raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      try {
        const parsed = this.normalize(raw);
        if (!parsed || typeof parsed !== 'object') return;
        if (!parsed.message?.text && !parsed.message?.parts?.length && !parsed.event?.isSupport && !parsed.event?.isMembership && !parsed.system?.sticky) return;
        // SDKはID欠落時に一時IDを作るため、発火可否は受信原本で確認する。
        const data = raw.data || raw.payload?.raw?.data || raw.payload?.data || raw.raw?.data || raw.payload || raw;
        const id = data.id || raw.id;
        const hasId = (typeof id === 'string' && id.trim().length > 0) || (typeof id === 'number' && Number.isFinite(id));
        const key = hasId ? JSON.stringify([parsed.service?.id || '', data !== raw && data.id ? raw.id || '' : '', String(id)]) : null;
        if (key && this.seen.has(key)) return;
        if (key) {
          this.seen.add(key);
          if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value);
        }
        this.onComment(parsed, { canTrigger: !!key });
      } catch (error) { this.onStatus('コメントを処理できませんでした'); console.warn('[Stage入力]', error); }
    }
    async start() {
      if (this.started || this.disposed) return;
      this.started = true;
      if (!this.sdk || !window.VCT_SDK?.normalize) { this.onStatus('OneSDK / VCT SDKを読み込めません'); return; }
      try {
        this.sdk.setup({ mode: 'diff', permissions: ['comments', 'clear'] });
        this.subscriptions.push(this.sdk.subscribe({ action: 'comments', callback: values => {
          (Array.isArray(values) ? values : [values]).forEach(raw => this.receive(raw));
        } }));
        this.subscriptions.push(this.sdk.subscribe({ action: 'clear', callback: () => { if (!this.disposed) this.onClear(); } }));
        await this.sdk.ready();
        if (this.disposed) return;
        this.sdk.connect(); this.onStatus('コメント購読を開始しました');
      } catch (error) { this.onStatus('コメント購読を開始できませんでした'); console.warn('[Stage入力]', error); }
    }
    destroy() {
      this.disposed = true;
      this.subscriptions.forEach(id => this.sdk?.unsubscribe?.(id));
      this.subscriptions.length = 0; this.seen.clear();
    }
  }
  window.VCTStage.OneCommeAdapter = OneCommeAdapter;
})();
