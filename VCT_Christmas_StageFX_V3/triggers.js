// テンプレートの発火ルール。SDK入力の取得やPlugin固有表現をRuntimeへ入れない。
(function () {
  const thresholds = {
    JPY: [1000, 5000, 10000], KRW: [10000, 50000, 100000],
    USD: [5, 25, 50], EUR: [5, 25, 50], GBP: [5, 25, 50], CAD: [5, 25, 50], AUD: [5, 25, 50], NZD: [5, 25, 50]
  };
  const classify = (value, limits) => {
    if (!Number.isFinite(Number(value)) || !(Number(value) > 0) || !limits) return 'standard';
    return Number(value) < limits[0] ? 'small' : Number(value) < limits[1] ? 'standard' : Number(value) < limits[2] ? 'large' : 'extra';
  };
  window.VCTStage.intensity = (parsed, mode) => {
    if (mode !== 'value') return 'standard';
    if (parsed.event?.kind === 'membership_gift') return classify(parsed.membership?.giftCount, [3, 10, 20]);
    if (parsed.event?.kind === 'jewel') return classify(parsed.monetization?.jewels?.count, [100, 1000, 10000]);
    const money = parsed.monetization?.money;
    return classify(money?.amount, thresholds[String(money?.currency || '').toUpperCase()]);
  };
  window.VCTStage.isEffectEvent = parsed => !!(parsed.event?.isSupport || parsed.event?.isMembership);
})();
