(function (global) {
  const els = {
    tableBody: document.getElementById('table-body'),
    statusBar: document.getElementById('status-bar'),
    summaryTotalLabel: document.getElementById('summary-total-label'),
    summaryCountLabel: document.getElementById('summary-count-label'),
    summaryTotal: document.getElementById('summary-total'),
    summaryCount: document.getElementById('summary-count'),
    tableHeadCol1: document.getElementById('table-head-col-1'),
    tableHeadCol2: document.getElementById('table-head-col-2'),
    tableHeadCol3: document.getElementById('table-head-col-3'),
    tableHeadCol4: document.getElementById('table-head-col-4'),
    tableHeadCol5: document.getElementById('table-head-col-5'),
    tableHeadCol6: document.getElementById('table-head-col-6'),
    searchNameInput: document.getElementById('search-name-input'),
    searchNameField: document.getElementById('search-name-field'),
    searchUserKeyInput: document.getElementById('search-userkey-input'),
    searchUserKeyField: document.getElementById('search-userkey-field'),
    streamIdField: document.getElementById('stream-id-field'),
    streamIdInput: document.getElementById('stream-id-input'),
    searchPlatformSelect: document.getElementById('search-platform-select'),
    platformField: document.getElementById('platform-field'),
    dateFromInput: document.getElementById('date-from-input'),
    dateFromField: document.getElementById('date-from-field'),
    dateToInput: document.getElementById('date-to-input'),
    dateToField: document.getElementById('date-to-field'),
    amountMinInput: document.getElementById('amount-min-input'),
    amountMinField: document.getElementById('amount-min-field'),
    amountMaxInput: document.getElementById('amount-max-input'),
    amountMaxField: document.getElementById('amount-max-field'),
    orderSelect: document.getElementById('order-select'),
    orderField: document.getElementById('order-field'),
    rankingPresetField: document.getElementById('ranking-preset-field'),
    rankingPresetSelect: document.getElementById('ranking-preset-select'),
    rankingCurrencyField: document.getElementById('ranking-currency-field'),
    rankingCurrencySelect: document.getElementById('ranking-currency-select'),
    filterLabel: document.getElementById('filter-label'),
    todayStreamButton: document.getElementById('today-stream-button'),
    reloadButton: document.getElementById('reload-button'),
    toolbar: document.querySelector('.toolbar'),
    tableContainer: document.querySelector('.table-container'),
    settingsPanel: document.getElementById('settings-panel'),
    navSupports: document.getElementById('nav-supports'),
    navUsers: document.getElementById('nav-users'),
    navRanking: document.getElementById('nav-ranking'),
    navSettings: document.getElementById('nav-settings'),
    navState: document.getElementById('nav-state'),
    detailOverlay: document.getElementById('detail-overlay'),
    detailTitle: document.getElementById('detail-title'),
    detailSubtitle: document.getElementById('detail-subtitle'),
    detailMetaList: document.getElementById('detail-meta-list'),
    detailRichContent: document.getElementById('detail-rich-content'),
    detailJsonContent: document.getElementById('detail-json-content'),
    dangerOverlay: document.getElementById('danger-overlay'),
    dangerTitle: document.getElementById('danger-title'),
    dangerSubtitle: document.getElementById('danger-subtitle'),
    dangerMessage: document.getElementById('danger-message'),
    dangerUnlock: document.getElementById('danger-unlock'),
    dangerConfirmButton: document.getElementById('danger-confirm-button')
  };

  const state = {
    activeView: 'supports',
    supportsStreamId: '',
    usersStreamId: '',
    rankingStreamId: '',
    dangerAction: null,
    rankingPreset: 'support_count',
    rankingCurrency: '',
    filters: {
      userName: '',
      userKey: '',
      platform: '',
      streamId: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      order: 'desc'
    }
  };
  const ORDER_OPTIONS = {
    supports: [
      { value: 'desc', label: '新しい順' },
      { value: 'asc', label: '古い順' }
    ],
    users: [
      { value: 'desc', label: '新しい順' },
      { value: 'asc', label: '古い順' },
      { value: 'name_asc', label: 'ユーザー名昇順' },
      { value: 'name_desc', label: 'ユーザー名降順' },
      { value: 'support_count_desc', label: '支援回数が多い順' },
      { value: 'support_count_asc', label: '支援回数が少ない順' },
      { value: 'sponsorgift_desc', label: 'メンギフ件数が多い順' },
      { value: 'sponsorgift_asc', label: 'メンギフ件数が少ない順' }
    ],
    ranking: [
      { value: 'support_count_desc', label: '支援回数が多い順' },
      { value: 'sponsorgift_desc', label: 'メンギフ件数が多い順' },
      { value: 'desc', label: '新しい順' },
      { value: 'name_asc', label: 'ユーザー名昇順' }
    ]
  };
  const RANKING_PRESETS = {
    support_count: { order: 'support_count_desc', label: '支援回数ランキング' },
    sponsorgift: { order: 'sponsorgift_desc', label: 'メンギフ件数ランキング' },
    recent: { order: 'desc', label: '最新支援者順' },
    name: { order: 'name_asc', label: 'ユーザー名順' },
    primary_currency: { order: 'currency_amount_desc', label: '主要通貨金額ランキング' }
  };

  function setStatus(message, tone = 'neutral') {
    els.statusBar.textContent = message;
    els.statusBar.className = '';
    if (tone === 'error') {
      els.statusBar.classList.add('is-error');
    }
    if (tone === 'ok') {
      els.statusBar.classList.add('is-ok');
    }
  }

  function getFilters() {
    const inputValue = els.streamIdInput.value.trim();
    const isSupportsView = state.activeView === 'supports';
    const isUserView = state.activeView === 'users';
    const isRankingView = state.activeView === 'ranking';
    const allowedOrders = new Set((ORDER_OPTIONS[state.activeView] || ORDER_OPTIONS.supports).map((option) => option.value));
    const rawOrder = String(els.orderSelect.value || '').trim();
    const selectedPreset = String(els.rankingPresetSelect?.value || state.rankingPreset || 'support_count').trim();
    const rankingPreset = RANKING_PRESETS[selectedPreset] ? selectedPreset : 'support_count';
    const rankingCurrency = String(els.rankingCurrencySelect?.value || state.rankingCurrency || '').trim();
    const order = isRankingView
      ? RANKING_PRESETS[rankingPreset].order
      : (allowedOrders.has(rawOrder) ? rawOrder : 'desc');

    state.filters.userName = isRankingView ? '' : els.searchNameInput.value.trim();
    state.filters.userKey = isRankingView ? '' : els.searchUserKeyInput.value.trim();
    state.filters.platform = isRankingView ? '' : els.searchPlatformSelect.value.trim();
    state.filters.dateFrom = (isSupportsView || isUserView || isRankingView) ? els.dateFromInput.value : '';
    state.filters.dateTo = (isSupportsView || isUserView || isRankingView) ? els.dateToInput.value : '';
    state.filters.amountMin = isSupportsView ? els.amountMinInput.value.trim() : '';
    state.filters.amountMax = isSupportsView ? els.amountMaxInput.value.trim() : '';
    state.filters.order = order;
    state.rankingPreset = rankingPreset;
    state.rankingCurrency = isRankingView ? rankingCurrency : '';

    if (isUserView) {
      state.usersStreamId = inputValue;
    } else if (isRankingView) {
      state.rankingStreamId = inputValue;
    } else {
      state.supportsStreamId = inputValue;
    }

    return {
      userName: state.filters.userName || null,
      userKey: state.filters.userKey || null,
      platform: state.filters.platform || null,
      streamId: inputValue || null,
      dateFrom: state.filters.dateFrom || null,
      dateTo: state.filters.dateTo || null,
      amountMin: state.filters.amountMin || null,
      amountMax: state.filters.amountMax || null,
      order,
      rankingPreset,
      rankingCurrency: state.rankingCurrency || null
    };
  }

  function syncOrderOptions(viewName) {
    const options = ORDER_OPTIONS[viewName] || ORDER_OPTIONS.supports;
    const allowedValues = new Set(options.map((option) => option.value));
    const selectedValue = String(els.orderSelect.value || '').trim();
    const currentValue = allowedValues.has(selectedValue)
      ? selectedValue
      : (allowedValues.has(state.filters.order) ? state.filters.order : options[0].value);
    els.orderSelect.innerHTML = '';
    options.forEach((option) => {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      els.orderSelect.appendChild(element);
    });
    els.orderSelect.value = currentValue;
    state.filters.order = currentValue;
  }

  function syncRankingPresetControl() {
    if (!els.rankingPresetSelect) {
      return;
    }
    const availablePresets = new Set(Object.keys(RANKING_PRESETS));
    const selectedValue = String(els.rankingPresetSelect.value || '').trim();
    const currentValue = availablePresets.has(selectedValue)
      ? selectedValue
      : (availablePresets.has(state.rankingPreset) ? state.rankingPreset : 'support_count');
    els.rankingPresetSelect.value = currentValue;
    state.rankingPreset = currentValue;
  }

  function syncRankingCurrencyOptions(currencies = []) {
    if (!els.rankingCurrencySelect) {
      return;
    }
    const normalizedCurrencies = Array.from(new Set((currencies || []).map((value) => String(value || '').trim()).filter(Boolean)));
    const currentValue = normalizedCurrencies.includes(String(els.rankingCurrencySelect.value || '').trim())
      ? String(els.rankingCurrencySelect.value || '').trim()
      : (normalizedCurrencies.includes(state.rankingCurrency) ? state.rankingCurrency : '');
    els.rankingCurrencySelect.innerHTML = '<option value="">選択してください</option>';
    normalizedCurrencies.forEach((currency) => {
      const option = document.createElement('option');
      option.value = currency;
      option.textContent = currency;
      els.rankingCurrencySelect.appendChild(option);
    });
    els.rankingCurrencySelect.value = currentValue;
    state.rankingCurrency = currentValue;
  }

  function applyRankingPresetVisibility() {
    const preset = String(els.rankingPresetSelect?.value || state.rankingPreset || 'support_count').trim();
    const showCurrencyField = state.activeView === 'ranking' && preset === 'primary_currency';
    els.rankingCurrencyField.classList.toggle('is-hidden', !showCurrencyField);
  }

  function parseNumberInput(value) {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function matchesDateRange(eventAt, fromValue, toValue) {
    if (!fromValue && !toValue) {
      return true;
    }

    const time = Number(eventAt) || 0;
    if (!time) {
      return false;
    }

    if (fromValue) {
      const fromTime = new Date(`${fromValue}T00:00:00`).getTime();
      if (time < fromTime) {
        return false;
      }
    }

    if (toValue) {
      const toTime = new Date(`${toValue}T23:59:59.999`).getTime();
      if (time > toTime) {
        return false;
      }
    }

    return true;
  }

  function filterSupports(records, filters) {
    const userNameQuery = normalizeSearchText(filters.userName);
    const userKeyQuery = String(filters.userKey || '').trim();
    const platformQuery = String(filters.platform || '').trim();
    const streamIdQuery = String(filters.streamId || '').trim();
    const amountMin = parseNumberInput(filters.amountMin);
    const amountMax = parseNumberInput(filters.amountMax);

    return records.filter((support) => {
      if (userNameQuery) {
        const haystack = normalizeSearchText(support.userName);
        if (!haystack.includes(userNameQuery)) {
          return false;
        }
      }

      if (userKeyQuery && String(support.userKey || '') !== userKeyQuery) {
        return false;
      }

      if (platformQuery && String(support.platform || '') !== platformQuery) {
        return false;
      }

      if (streamIdQuery && String(support.streamId || '') !== streamIdQuery) {
        return false;
      }

      if (!matchesDateRange(support.eventAt, filters.dateFrom, filters.dateTo)) {
        return false;
      }

      const amountValue = Number(support.amount) || 0;
      if (amountMin != null && amountValue < amountMin) {
        return false;
      }

      if (amountMax != null && amountValue > amountMax) {
        return false;
      }

      return true;
    });
  }

  function filterUsers(records, filters) {
    const userNameQuery = normalizeSearchText(filters.userName);
    const userKeyQuery = String(filters.userKey || '').trim();
    const platformQuery = String(filters.platform || '').trim();

    return records.filter((user) => {
      if (userNameQuery) {
        const candidates = [user.displayName, user.userName, user.screenName].map(normalizeSearchText);
        if (!candidates.some((value) => value.includes(userNameQuery))) {
          return false;
        }
      }

      if (userKeyQuery && String(user.userKey || '') !== userKeyQuery) {
        return false;
      }

      if (platformQuery && String(user.platform || '') !== platformQuery) {
        return false;
      }

      return true;
    });
  }

  function updatePlatformOptions(supports, users) {
    const values = new Set();
    supports.forEach((support) => {
      if (support.platform) values.add(String(support.platform));
    });
    users.forEach((user) => {
      if (user.platform) values.add(String(user.platform));
    });

    const selected = els.searchPlatformSelect.value;
    els.searchPlatformSelect.innerHTML = '<option value="">すべて</option>';
    Array.from(values).sort().forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      els.searchPlatformSelect.appendChild(option);
    });
    els.searchPlatformSelect.value = values.has(selected) ? selected : '';
    state.filters.platform = els.searchPlatformSelect.value;
  }

  function resetFilters() {
    els.searchNameInput.value = '';
    els.searchUserKeyInput.value = '';
    els.searchPlatformSelect.value = '';
    els.dateFromInput.value = '';
    els.dateToInput.value = '';
    els.amountMinInput.value = '';
    els.amountMaxInput.value = '';

    state.filters.userName = '';
    state.filters.userKey = '';
    state.filters.platform = '';
    state.filters.dateFrom = '';
    state.filters.dateTo = '';
    state.filters.amountMin = '';
    state.filters.amountMax = '';

    if (state.activeView === 'users') {
      els.streamIdInput.value = '';
      state.usersStreamId = '';
    } else if (state.activeView === 'ranking') {
      els.streamIdInput.value = '';
      state.rankingStreamId = '';
      state.rankingPreset = 'support_count';
      state.rankingCurrency = '';
      if (els.rankingPresetSelect) {
        els.rankingPresetSelect.value = 'support_count';
      }
      if (els.rankingCurrencySelect) {
        els.rankingCurrencySelect.value = '';
      }
    } else if (typeof global.useTodayStream === 'function') {
      global.useTodayStream();
    }

    if (typeof global.reloadActiveView === 'function') {
      global.reloadActiveView();
    }
  }

  function clearStreamIdFilter() {
    els.streamIdInput.value = '';
    if (state.activeView === 'users') {
      state.usersStreamId = '';
    } else if (state.activeView === 'ranking') {
      state.rankingStreamId = '';
    } else {
      state.supportsStreamId = '';
    }

    if ((state.activeView === 'supports' || state.activeView === 'users' || state.activeView === 'ranking') && typeof global.reloadActiveView === 'function') {
      global.reloadActiveView();
    }
  }

  function formatAmount(amount, currency) {
    const value = Number(amount) || 0;
    const numberText = value.toLocaleString();
    return currency ? `${numberText} ${currency}` : `¥${numberText}`;
  }

  function getSupportMetric(support) {
    const rawType = String(support?.rawType || '').trim().toLowerCase();
    if (rawType === 'sponsorgift') {
      return {
        kind: 'count',
        label: 'ギフト件数',
        unit: '件',
        value: Number(support?.amount) || 0,
        key: 'SPONSORGIFT'
      };
    }

    const currency = String(support?.currency || '').trim() || 'UNKNOWN';
    return {
      kind: 'currency',
      label: '支援額',
      unit: currency,
      value: Number(support?.amount) || 0,
      key: currency
    };
  }

  function formatSupportMetric(support) {
    const metric = getSupportMetric(support);
    const numberText = Number(metric.value || 0).toLocaleString();
    if (metric.kind === 'count') {
      return `${numberText} ${metric.unit}`;
    }

    if (metric.unit === 'UNKNOWN') {
      return numberText;
    }

    return formatAmount(metric.value, metric.unit);
  }

  function formatCurrencyTotals(currencyTotals) {
    const entries = Object.entries(currencyTotals || {})
      .filter(([, value]) => Number(value) > 0)
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return '-';
    }

    return entries
      .map(([currency, value]) => currency === 'SPONSORGIFT'
        ? `メンギフ ${Number(value).toLocaleString()} 件`
        : `${currency} ${Number(value).toLocaleString()}`)
      .join(' / ');
  }

  function formatEventTime(eventAt) {
    if (!eventAt) return '-';
    const date = new Date(eventAt);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ja-JP');
  }

  function getRecentStreamIds(user) {
    return Array.isArray(user?.recentStreamIds)
      ? user.recentStreamIds.map((streamId) => String(streamId || '').trim()).filter(Boolean)
      : [];
  }

  function parseStreamDate(streamId) {
    const source = String(streamId || '').trim();
    const match = source.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!match) {
      return null;
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) {
      return null;
    }

    return date;
  }

  function formatStreamVisitAge(streamId) {
    const streamDate = parseStreamDate(streamId);
    if (!streamDate) {
      return '';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - streamDate.getTime()) / 86400000);
    if (diffDays < 0) {
      return '';
    }

    if (diffDays === 0) {
      return '今日';
    }

    return `${diffDays}日前`;
  }

  function formatStreamVisitSummary(user) {
    const recentStreamIds = getRecentStreamIds(user);
    const lastSeenStreamId = String(user?.lastSeenStreamId || recentStreamIds[0] || '').trim();
    const streamCount = recentStreamIds.length;

    if (!lastSeenStreamId && streamCount === 0) {
      return '来訪stream: -';
    }

    const lastSeenAge = formatStreamVisitAge(lastSeenStreamId);
    const lastSeenText = lastSeenStreamId
      ? `最終: ${lastSeenStreamId}${lastSeenAge ? ` (${lastSeenAge})` : ''}`
      : '最終: -';

    return `来訪stream: ${streamCount || 1} / ${lastSeenText}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSupportData(support) {
    const raw = support?.raw || {};
    return raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw;
  }

  function extractFirstImageInfo(html) {
    if (!html) return { url: '', alt: '' };

    try {
      const doc = new DOMParser().parseFromString(String(html), 'text/html');
      const img = doc.querySelector('img');
      if (!img) return { url: '', alt: '' };

      return {
        url: img.dataset.src || img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || ''
      };
    } catch (err) {
      return { url: '', alt: '' };
    }
  }

  function getSupportGift(support) {
    if (global.VCT && typeof global.VCT.resolveSupportGift === 'function') {
      return global.VCT.resolveSupportGift(support);
    }

    const data = getSupportData(support);
    const imageInfo = extractFirstImageInfo(data?.comment || data?.message || '');

    return {
      type: String(support?.giftType || support?.rawType || data?.giftType || '').trim(),
      label: String(support?.giftLabel || data?.speechText || imageInfo.alt || '').trim(),
      imageUrl: String(support?.giftImageUrl || imageInfo.url || '').trim(),
      hasImage: !!(support?.giftImageUrl || imageInfo.url)
    };
  }

  function getSupportDisplayMessage(support) {
    const savedMessage = String(support?.message || '').trim();
    if (savedMessage) return savedMessage;

    return getSupportGift(support).label;
  }

  function setActiveNav(viewName) {
    const previousView = state.activeView;
    const isSupportsView = viewName === 'supports';
    const isUsersView = viewName === 'users';
    const isRankingView = viewName === 'ranking';
    state.activeView = viewName;
    syncOrderOptions(viewName);
    els.navSupports.classList.toggle('active', isSupportsView);
    els.navUsers.classList.toggle('active', isUsersView);
    els.navRanking.classList.toggle('active', isRankingView);
    els.navSettings.classList.toggle('active', viewName === 'settings');
    els.navState.classList.toggle('active', viewName === 'state');
    els.toolbar.classList.toggle('is-hidden', viewName === 'settings');
    els.tableContainer.classList.toggle('is-hidden', viewName === 'settings');
    els.settingsPanel.classList.toggle('is-hidden', viewName !== 'settings');
    const help = els.filterLabel.querySelector('.field-help');
    els.filterLabel.textContent = 'streamId';
    if (help) {
      els.filterLabel.appendChild(document.createTextNode(' '));
      els.filterLabel.appendChild(help);
    }
    els.streamIdInput.placeholder = '未入力なら全件';
    if (previousView !== viewName) {
      els.streamIdInput.value = isUsersView
        ? state.usersStreamId
        : (isRankingView ? state.rankingStreamId : state.supportsStreamId);
    }
    if (isRankingView) {
      syncRankingPresetControl();
    }
    const allowScopedFilters = isSupportsView || isUsersView || isRankingView;
    els.streamIdField.classList.toggle('is-hidden', !allowScopedFilters);
    els.todayStreamButton.classList.toggle('is-hidden', !allowScopedFilters);
    els.dateFromInput.disabled = !allowScopedFilters;
    els.dateToInput.disabled = !allowScopedFilters;
    els.amountMinInput.disabled = !isSupportsView;
    els.amountMaxInput.disabled = !isSupportsView;
    els.searchNameField.classList.toggle('is-hidden', isRankingView);
    els.searchUserKeyField.classList.toggle('is-hidden', isRankingView);
    els.platformField.classList.toggle('is-hidden', isRankingView);
    els.amountMinField.classList.toggle('is-hidden', !isSupportsView);
    els.amountMaxField.classList.toggle('is-hidden', !isSupportsView);
    els.orderField.classList.toggle('is-hidden', isRankingView);
    els.rankingPresetField.classList.toggle('is-hidden', !isRankingView);
    applyRankingPresetVisibility();
  }

  function setSummaryLabels(totalLabel, countLabel) {
    els.summaryTotalLabel.textContent = totalLabel;
    els.summaryCountLabel.textContent = countLabel;
  }

  function setTableHeaders(labels = {}) {
    if (els.tableHeadCol1) els.tableHeadCol1.textContent = labels.col1 || '時刻';
    if (els.tableHeadCol2) els.tableHeadCol2.textContent = labels.col2 || 'PF';
    if (els.tableHeadCol3) els.tableHeadCol3.textContent = labels.col3 || 'ユーザー名';
    if (els.tableHeadCol4) els.tableHeadCol4.textContent = labels.col4 || '金額/量';
    if (els.tableHeadCol5) els.tableHeadCol5.textContent = labels.col5 || 'メッセージ';
    if (els.tableHeadCol6) els.tableHeadCol6.textContent = labels.col6 || '操作';
  }

  function createMetaItem(label, value) {
    const item = document.createElement('div');
    item.className = 'detail-meta-item';
    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = value == null || value === '' ? '-' : String(value);
    item.appendChild(labelEl);
    item.appendChild(valueEl);
    return item;
  }

  function openDetailPanel(options = {}) {
    const {
      title = '詳細',
      subtitle = '選択したデータの詳細',
      meta = [],
      payload = null,
      richContent = '',
      showJson = true
    } = options;

    els.detailTitle.textContent = title;
    els.detailSubtitle.textContent = subtitle;
    els.detailMetaList.innerHTML = '';
    meta.forEach((entry) => {
      els.detailMetaList.appendChild(createMetaItem(entry.label, entry.value));
    });
    els.detailRichContent.innerHTML = richContent || '';
    els.detailJsonContent.style.display = showJson ? 'block' : 'none';
    els.detailJsonContent.textContent = JSON.stringify(payload ?? {}, null, 2);
    els.detailOverlay.classList.add('is-open');
    els.detailOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDetailPanel() {
    els.detailOverlay.classList.remove('is-open');
    els.detailOverlay.setAttribute('aria-hidden', 'true');
  }

  function openDangerPanel(options = {}) {
    const {
      title = '危険な操作',
      subtitle = 'この操作は元に戻せません。',
      message = '削除対象を確認してください。',
      onConfirm = null,
      confirmLabel = '削除を実行'
    } = options;

    state.dangerAction = typeof onConfirm === 'function' ? onConfirm : null;
    els.dangerTitle.textContent = title;
    els.dangerSubtitle.textContent = subtitle;
    els.dangerMessage.textContent = message;
    els.dangerUnlock.checked = false;
    els.dangerConfirmButton.textContent = confirmLabel;
    els.dangerConfirmButton.disabled = true;
    els.dangerOverlay.classList.add('is-open');
    els.dangerOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDangerPanel() {
    state.dangerAction = null;
    els.dangerUnlock.checked = false;
    els.dangerConfirmButton.disabled = true;
    els.dangerOverlay.classList.remove('is-open');
    els.dangerOverlay.setAttribute('aria-hidden', 'true');
  }

  function showSupportDetail(support) {
    const messageText = getSupportDisplayMessage(support) || 'メッセージなし';
    const richContent = `
      <section class="detail-section">
        <h4>支援情報</h4>
        <div class="stats-grid">
          <div class="stat-card"><span class="label">${escapeHtml(getSupportMetric(support).label)}</span><span class="value">${escapeHtml(formatSupportMetric(support))}</span></div>
          <div class="stat-card"><span class="label">支援日時</span><span class="value">${escapeHtml(formatEventTime(support.eventAt))}</span></div>
          <div class="stat-card"><span class="label">プラットフォーム</span><span class="value">${escapeHtml(support.platform || '-')}</span></div>
          <div class="stat-card"><span class="label">支援種別</span><span class="value">${escapeHtml(support.rawType || '-')}</span></div>
        </div>
      </section>
      <section class="detail-section">
        <h4>送信者情報</h4>
        <div class="stats-grid">
          <div class="stat-card"><span class="label">ユーザー名</span><span class="value">${escapeHtml(support.userName || '-')}</span></div>
          <div class="stat-card"><span class="label">ユーザーキー</span><span class="value">${escapeHtml(support.userKey || '-')}</span></div>
          <div class="stat-card"><span class="label">ユーザーID</span><span class="value">${escapeHtml(support.userId || '-')}</span></div>
          <div class="stat-card"><span class="label">イベントキー</span><span class="value">${escapeHtml(support.eventKey || '-')}</span></div>
        </div>
      </section>
      <section class="detail-section">
        <h4>メッセージ</h4>
        <div class="inline-note">${escapeHtml(messageText)}</div>
      </section>
      <details class="raw-toggle">
        <summary>詳細データを見る</summary>
        <pre>${escapeHtml(JSON.stringify(support.raw || support, null, 2))}</pre>
      </details>
    `;

    openDetailPanel({
      title: '支援情報カード',
      subtitle: support.eventKey || 'support',
      meta: [
        { label: 'ユーザー名', value: support.userName || '-' },
        { label: getSupportMetric(support).label, value: formatSupportMetric(support) },
        { label: 'Platform', value: support.platform || '-' },
        { label: '支援日時', value: formatEventTime(support.eventAt) },
        { label: 'Event Key', value: support.eventKey || '-' },
        { label: 'User Key', value: support.userKey || '-' }
      ],
      payload: support.raw || support,
      richContent,
      showJson: false
    });
  }

  function showUserDetail(user, aggregated) {
    const iconHtml = user.userIcon
      ? `<img class="profile-card__icon" src="${escapeHtml(user.userIcon)}" alt="${escapeHtml(user.displayName || user.userName || 'user')}" referrerpolicy="no-referrer">`
      : '<div class="profile-card__icon profile-card__fallback">No Icon</div>';
    const recentSupports = Array.isArray(aggregated?.recentSupports) ? aggregated.recentSupports : [];
    const recentStreamIds = getRecentStreamIds(user);
    const lastSeenStreamId = String(user.lastSeenStreamId || recentStreamIds[0] || '').trim();
    const roleChips = [];
    if (user.isMember) roleChips.push('<span class="chip">メンバー</span>');
    if (user.isModerator) roleChips.push('<span class="chip">モデレーター</span>');
    if (user.isOwner) roleChips.push('<span class="chip">配信者</span>');
    if (roleChips.length === 0) roleChips.push('<span class="chip">通常ユーザー</span>');

    const recentSupportItems = recentSupports.length > 0
      ? recentSupports.map((support) => {
        const displayMessage = getSupportDisplayMessage(support);
        const message = displayMessage
          ? escapeHtml(displayMessage)
          : 'メッセージなし';
        return `
          <li class="history-list__item">
            <div class="history-list__head">
              <span class="history-list__time">${escapeHtml(formatEventTime(support.eventAt))}</span>
              <span class="history-list__metric">${escapeHtml(formatSupportMetric(support))}</span>
            </div>
            <div class="history-list__meta">
              <span>${escapeHtml(support.rawType || '-')}</span>
              <span>${escapeHtml(support.platform || '-')}</span>
            </div>
            <div class="history-list__message">${message}</div>
          </li>
        `;
      }).join('')
      : '<div class="inline-note">支援履歴はまだありません。</div>';
    const recentStreamItems = recentStreamIds.length > 0
      ? recentStreamIds.map((streamId, index) => {
        const ageText = formatStreamVisitAge(streamId);
        return `
          <li class="history-list__item">
            <div class="history-list__head">
              <span class="history-list__time">${escapeHtml(streamId)}</span>
              <span class="history-list__metric">${index === 0 ? '最新' : `${index + 1}件前`}</span>
            </div>
            <div class="history-list__meta">
              <span>${escapeHtml(ageText || '日付換算なし')}</span>
            </div>
          </li>
        `;
      }).join('')
      : '<div class="inline-note">来訪stream履歴はまだありません。</div>';

    const richContent = `
      <section class="detail-section">
        <h4>ユーザー情報</h4>
        <div class="profile-card">
          ${iconHtml}
          <div>
            <div class="profile-card__name">${escapeHtml(user.displayName || user.userName || '-')}</div>
            <div class="profile-card__sub">${escapeHtml(user.platform || '-')} / ${escapeHtml(user.userKey || '-')}</div>
            <div class="profile-card__sub">ユーザーID: ${escapeHtml(user.userId || '-')}</div>
            <div class="chip-row">${roleChips.join('')}</div>
          </div>
        </div>
      </section>
      <section class="detail-section">
        <h4>配信での記録</h4>
        <div class="stats-grid">
          <div class="stat-card"><span class="label">支援回数</span><span class="value">${escapeHtml(String(aggregated.count || 0))} 回</span></div>
          <div class="stat-card"><span class="label">通貨別累計支援額</span><span class="value">${escapeHtml(formatCurrencyTotals(aggregated.currencyTotals))}</span></div>
          <div class="stat-card"><span class="label">最終観測</span><span class="value">${escapeHtml(formatEventTime(user.lastSeenAt || user.updatedAt))}</span></div>
          <div class="stat-card"><span class="label">最終支援</span><span class="value">${escapeHtml(formatEventTime(aggregated.lastAt))}</span></div>
          <div class="stat-card"><span class="label">最終来訪stream</span><span class="value">${escapeHtml(lastSeenStreamId || '-')}</span></div>
          <div class="stat-card"><span class="label">来訪stream数</span><span class="value">${escapeHtml(String(recentStreamIds.length || 0))}</span></div>
        </div>
        <p class="inline-note">コメント回数はまだ集計していません。今表示しているのはユーザー現在値と、supports から計算した支援関連の情報です。</p>
      </section>
      <section class="detail-section">
        <h4>来訪stream履歴</h4>
        ${recentStreamIds.length > 0 ? `<ul class="history-list">${recentStreamItems}</ul>` : recentStreamItems}
      </section>
      <section class="detail-section">
        <h4>最新${escapeHtml(String(recentSupports.length || 0))}件の支援履歴</h4>
        ${recentSupports.length > 0 ? `<ul class="history-list">${recentSupportItems}</ul>` : recentSupportItems}
      </section>
      <details class="raw-toggle">
        <summary>詳細データを見る</summary>
        <pre>${escapeHtml(JSON.stringify(user.rawProfile || user, null, 2))}</pre>
      </details>
    `;

    openDetailPanel({
      title: 'ユーザー情報カード',
      subtitle: user.userKey || user.userName || 'user',
      meta: [
        { label: '表示名', value: user.displayName || user.userName || '-' },
        { label: 'Platform', value: user.platform || '-' },
        { label: 'User Key', value: user.userKey || '-' },
        { label: 'User ID', value: user.userId || '-' },
        { label: '最終観測', value: formatEventTime(user.lastSeenAt || user.updatedAt) },
        { label: '最終来訪stream', value: lastSeenStreamId || '-' },
        { label: '来訪stream数', value: recentStreamIds.length || 0 },
        { label: '支援回数', value: `${aggregated.count || 0} 回` }
      ],
      payload: user.rawProfile || user,
      richContent,
      showJson: false
    });
  }

  els.detailOverlay.addEventListener('click', (event) => {
    if (event.target === els.detailOverlay) {
      closeDetailPanel();
    }
  });

  els.dangerOverlay.addEventListener('click', (event) => {
    if (event.target === els.dangerOverlay) {
      closeDangerPanel();
    }
  });

  els.dangerUnlock.addEventListener('change', () => {
    els.dangerConfirmButton.disabled = !els.dangerUnlock.checked;
  });

  if (els.rankingPresetSelect) {
    els.rankingPresetSelect.addEventListener('change', () => {
      state.rankingPreset = String(els.rankingPresetSelect.value || 'support_count').trim() || 'support_count';
      applyRankingPresetVisibility();
    });
  }

  els.dangerConfirmButton.addEventListener('click', async () => {
    if (!state.dangerAction || !els.dangerUnlock.checked) {
      return;
    }

    const action = state.dangerAction;
    closeDangerPanel();
    await action();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.detailOverlay.classList.contains('is-open')) {
      closeDetailPanel();
    }
    if (event.key === 'Escape' && els.dangerOverlay.classList.contains('is-open')) {
      closeDangerPanel();
    }
  });

  global.DashboardUI = {
    els,
    state,
    setStatus,
    getFilters,
    filterSupports,
    filterUsers,
    updatePlatformOptions,
    resetFilters,
    clearStreamIdFilter,
    formatAmount,
    formatSupportMetric,
    getSupportMetric,
    formatCurrencyTotals,
    formatEventTime,
    formatStreamVisitSummary,
    escapeHtml,
    getSupportGift,
    getSupportDisplayMessage,
    syncOrderOptions,
    syncRankingCurrencyOptions,
    setActiveNav,
    setSummaryLabels,
    setTableHeaders,
    showSupportDetail,
    showUserDetail,
    closeDetailPanel,
    openDangerPanel,
    closeDangerPanel
  };

  global.resetFilters = resetFilters;
  global.clearStreamIdFilter = clearStreamIdFilter;
  global.closeDetailPanel = closeDetailPanel;
  global.closeDangerPanel = closeDangerPanel;
})(window);
