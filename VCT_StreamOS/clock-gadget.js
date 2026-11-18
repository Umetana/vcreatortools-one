(() => {
  'use strict';

  function restore(saved) {
    return {
      twelveHour: saved?.twelveHour === true,
      showDate: saved?.showDate === true,
      showWeekday: saved?.showWeekday === true,
      showSeconds: saved?.showSeconds === true,
      mode: saved?.mode === 'clock' ? 'clock' : 'elapsed',
      elapsedMs: Number.isSafeInteger(saved?.elapsedMs) && saved.elapsedMs >= 0 ? saved.elapsedMs : 0,
      startedAt: Number.isSafeInteger(saved?.startedAt) && saved.startedAt > 0 ? saved.startedAt : null
    };
  }

  function mount({ byId, state, commit }) {
    const taskClock = byId('clock');
    const gadgetValue = byId('clock-gadget-value');
    const gadgetLabel = byId('clock-gadget-label');
    const modeButton = byId('clock-gadget-mode');
    const timerActions = byId('clock-timer-actions');
    const timerButton = byId('clock-timer-toggle');
    const dateFormat = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' });
    const weekdayFormat = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' });
    let taskFormat;
    let gadgetFormat;

    function updateFormats() {
      const { twelveHour, showSeconds } = state();
      const options = { hour: '2-digit', minute: '2-digit', hourCycle: twelveHour ? 'h12' : 'h23' };
      taskFormat = new Intl.DateTimeFormat('ja-JP', { ...options, second: showSeconds ? '2-digit' : undefined });
      gadgetFormat = new Intl.DateTimeFormat('ja-JP', { ...options, second: '2-digit' });
    }

    function elapsedAt(now) {
      const { startedAt, elapsedMs } = state();
      return elapsedMs + (startedAt === null ? 0 : Math.max(0, now - startedAt));
    }

    function render() {
      const now = new Date();
      const settings = state();
      const date = settings.showDate ? dateFormat.format(now) : '';
      const weekday = settings.showWeekday ? weekdayFormat.format(now) : '';
      const prefix = weekday ? (date ? `${date}（${weekday}）` : weekday) : date;
      const clockText = [prefix, taskFormat.format(now)].filter(Boolean).join(' ');
      if (taskClock.textContent !== clockText) taskClock.textContent = clockText;

      if (settings.mode === 'clock') {
        gadgetValue.textContent = gadgetFormat.format(now);
      } else {
        const seconds = Math.floor(elapsedAt(now.getTime()) / 1000);
        gadgetValue.textContent = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
          .map(value => String(value).padStart(2, '0')).join(':');
      }
    }

    function renderControls() {
      const { mode, startedAt, elapsedMs } = state();
      const showTimer = mode === 'elapsed';
      gadgetLabel.textContent = showTimer ? '配信経過時間' : '現在時刻';
      modeButton.textContent = showTimer ? '現在時刻に切替' : '経過時間に切替';
      timerActions.hidden = !showTimer;
      timerButton.textContent = startedAt !== null ? '一時停止' : elapsedMs ? '再開' : '開始';
    }

    for (const [id, key] of [
      ['clock-twelve-hour', 'twelveHour'],
      ['clock-show-date', 'showDate'],
      ['clock-show-weekday', 'showWeekday'],
      ['clock-show-seconds', 'showSeconds']
    ]) {
      const control = byId(id);
      control.checked = state()[key];
      control.onchange = () => {
        state()[key] = control.checked;
        updateFormats();
        render();
        commit();
      };
    }

    function applyTimerChange() {
      renderControls();
      render();
      commit();
    }

    modeButton.onclick = () => {
      state().mode = state().mode === 'elapsed' ? 'clock' : 'elapsed';
      applyTimerChange();
    };
    timerButton.onclick = () => {
      const settings = state();
      const now = Date.now();
      if (settings.startedAt === null) settings.startedAt = now;
      else {
        settings.elapsedMs = elapsedAt(now);
        settings.startedAt = null;
      }
      applyTimerChange();
    };
    byId('clock-timer-reset').onclick = () => {
      const settings = state();
      settings.startedAt = null;
      settings.elapsedMs = 0;
      applyTimerChange();
    };

    updateFormats();
    renderControls();
    render();
    setInterval(render, 1000);
  }

  window.StreamOSClock = { restore, mount };
})();
