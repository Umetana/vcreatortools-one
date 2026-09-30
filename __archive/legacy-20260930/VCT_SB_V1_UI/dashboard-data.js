(function (global) {
  const UI = global.DashboardUI;
  const {
    els,
    state,
    setStatus,
    getFilters,
    filterSupports,
    filterUsers,
    updatePlatformOptions,
    formatAmount,
    formatSupportMetric,
    getSupportMetric,
    formatCurrencyTotals,
    formatEventTime,
    formatStreamVisitSummary,
    escapeHtml,
    getSupportDisplayMessage,
    syncRankingCurrencyOptions,
    setActiveNav,
    setSummaryLabels,
    setTableHeaders,
    showSupportDetail,
    showUserDetail,
    openDangerPanel
  } = UI;

  const SUPPORT_BANNER_DEFAULTS = {
    configVersion: 2,
    storageKey: 'vct_sb_v1.settings.v1',
    title: '本日の支援者',
    startX: 0,
    startY: 0,
    endX: 1920,
    streamId: null,
    limit: 20,
    displayOrder: 'oldest_first',
    maxMessageLength: 50,
    showIcon: true,
    titleVisible: true,
    titleHeight: 40,
    amountVisible: true,
    messageVisible: true,
    viewportHeight: 140,
    cardWidth: 280,
    cardGap: 12,
    scrollSpeed: 110,
    cardColorMode: 'soft',
    cardBackgroundOpacity: 0.18,
    emptyStateText: 'まだ支援はありません',
    resetStreamOnLoad: false,
    resetAllOnLoad: false
  };
  const USER_DETAIL_HISTORY_LIMIT = 20;
  const PREVIEW_CANVAS_WIDTH = 1920;
  const PREVIEW_CANVAS_HEIGHT = 1080;

  function getUserDisplayName(user) {
    return String(user?.displayName || user?.userName || user?.screenName || '').trim();
  }

  function getUserSortTime(user, aggregated) {
    return Number(aggregated?.lastAt || user?.lastSeenAt || user?.updatedAt) || 0;
  }

  function getSponsorGiftCount(aggregated) {
    return Number(aggregated?.currencyTotals?.SPONSORGIFT) || 0;
  }

  function getCurrencyTotal(aggregated, currencyKey) {
    const key = String(currencyKey || '').trim();
    if (!key || key === 'SPONSORGIFT') {
      return 0;
    }
    return Number(aggregated?.currencyTotals?.[key]) || 0;
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'ja');
  }

  function compareUsersByMode(left, right, mode) {
    const leftName = getUserDisplayName(left.user);
    const rightName = getUserDisplayName(right.user);
    const leftTime = getUserSortTime(left.user, left.aggregated);
    const rightTime = getUserSortTime(right.user, right.aggregated);
    const leftCount = Number(left.aggregated?.count) || 0;
    const rightCount = Number(right.aggregated?.count) || 0;
    const leftSponsorGift = getSponsorGiftCount(left.aggregated);
    const rightSponsorGift = getSponsorGiftCount(right.aggregated);
    const selectedCurrency = String(left.sortOptions?.rankingCurrency || right.sortOptions?.rankingCurrency || '').trim();
    const leftCurrencyAmount = getCurrencyTotal(left.aggregated, selectedCurrency);
    const rightCurrencyAmount = getCurrencyTotal(right.aggregated, selectedCurrency);

    switch (mode) {
      case 'asc':
        if (leftTime !== rightTime) return leftTime - rightTime;
        break;
      case 'name_asc':
        {
          const diff = compareText(leftName, rightName);
          if (diff !== 0) return diff;
        }
        break;
      case 'name_desc':
        {
          const diff = compareText(leftName, rightName);
          if (diff !== 0) return -diff;
        }
        break;
      case 'support_count_desc':
        if (rightCount !== leftCount) return rightCount - leftCount;
        break;
      case 'support_count_asc':
        if (leftCount !== rightCount) return leftCount - rightCount;
        break;
      case 'sponsorgift_desc':
        if (rightSponsorGift !== leftSponsorGift) return rightSponsorGift - leftSponsorGift;
        break;
      case 'sponsorgift_asc':
        if (leftSponsorGift !== rightSponsorGift) return leftSponsorGift - rightSponsorGift;
        break;
      case 'currency_amount_desc':
        if (rightCurrencyAmount !== leftCurrencyAmount) return rightCurrencyAmount - leftCurrencyAmount;
        break;
      case 'desc':
      default:
        if (rightTime !== leftTime) return rightTime - leftTime;
        break;
    }

    const nameDiff = compareText(leftName, rightName);
    if (nameDiff !== 0) return nameDiff;
    return compareText(left.user?.userKey, right.user?.userKey);
  }

  function sortUsersByMode(rows, mode) {
    return [...rows].sort((left, right) => compareUsersByMode(left, right, mode));
  }

  function extractAvailableCurrencies(records) {
    const values = new Set();
    records.forEach((support) => {
      const currency = String(support?.currency || '').trim();
      if (!currency || currency === 'UNKNOWN' || currency === 'SPONSORGIFT') {
        return;
      }
      values.add(currency);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  function hasSupportScopedUserFilter(filters) {
    return Boolean(filters?.streamId || filters?.dateFrom || filters?.dateTo);
  }

  function getUserAggregateViewConfig(viewMode, filters) {
    const presetMeta = {
      support_count: '支援回数ランキング',
      sponsorgift: 'メンギフ件数ランキング',
      recent: '最新支援者順',
      name: 'ユーザー名順',
      primary_currency: '主要通貨金額ランキング'
    };
    if (viewMode === 'ranking') {
      const rankingCurrencyLabel = filters?.rankingPreset === 'primary_currency' && filters?.rankingCurrency
        ? `${filters.rankingCurrency} 金額ランキング`
        : (presetMeta[filters?.rankingPreset] || 'ランキング');
      return {
        summaryTotalLabel: '表示中ランキング人数',
        summaryCountLabel: '対象期間の累計支援額',
        loadingMessage: 'IndexedDB からランキング集計を読み込んでいます...',
        emptyMessage: filters?.rankingPreset === 'primary_currency' && !filters?.rankingCurrency
          ? '主要通貨を選択してください'
          : '条件に一致するランキングデータがありません',
        viewLabel: rankingCurrencyLabel,
        statusPrefix: rankingCurrencyLabel,
        tableHeaders: {
          col1: '順位',
          col2: 'PF',
          col3: 'ユーザー名',
          col4: filters?.rankingPreset === 'primary_currency' && filters?.rankingCurrency
            ? `${filters.rankingCurrency} 累計`
            : '累計支援',
          col5: '集計',
          col6: '操作'
        }
      };
    }
    return {
      summaryTotalLabel: '表示中ユーザー数',
      summaryCountLabel: '累計支援額',
      loadingMessage: 'IndexedDB からユーザー一覧を読み込んでいます...',
      emptyMessage: '条件に一致するユーザーデータがありません',
      viewLabel: 'ユーザー一覧',
      statusPrefix: 'ユーザー一覧',
      tableHeaders: {
        col1: '時刻',
        col2: 'PF',
        col3: 'ユーザー名',
        col4: '金額/量',
        col5: 'メッセージ',
        col6: '操作'
      }
    };
  }

  async function loadUserAggregateView(viewMode = 'users') {
    setActiveNav(viewMode);
    const filters = getFilters();
    const viewConfig = getUserAggregateViewConfig(viewMode, filters);
    setSummaryLabels(viewConfig.summaryTotalLabel, viewConfig.summaryCountLabel);
    setTableHeaders(viewConfig.tableHeaders);
    els.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">読み込み中...</td></tr>';
    setStatus(viewConfig.loadingMessage);

    try {
      const [rawUsers, rawSupports] = await Promise.all([
        getUsers(),
        getSupports({ order: 'desc' })
      ]);

      updatePlatformOptions(rawSupports, rawUsers);
      const users = filterUsers(rawUsers, filters);
      const supports = filterSupports(rawSupports, {
        ...filters,
        amountMin: null,
        amountMax: null
      });
      syncRankingCurrencyOptions(extractAvailableCurrencies(supports));
      const effectiveFilters = {
        ...filters,
        rankingCurrency: state.rankingCurrency || null
      };
      const effectiveViewConfig = getUserAggregateViewConfig(viewMode, effectiveFilters);
      setSummaryLabels(effectiveViewConfig.summaryTotalLabel, effectiveViewConfig.summaryCountLabel);
      setTableHeaders(effectiveViewConfig.tableHeaders);

      if (viewMode === 'ranking' && effectiveFilters.rankingPreset === 'primary_currency' && !effectiveFilters.rankingCurrency) {
        els.summaryTotal.textContent = '0 人';
        els.summaryCount.textContent = formatCurrencyTotals({});
        els.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${escapeHtml(effectiveViewConfig.emptyMessage)}</td></tr>`;
        setStatus('主要通貨を選択すると金額ランキングを表示できます', 'error');
        return;
      }

      const supportMap = new Map();
      supports.forEach((support) => {
        const key = support.userKey || `${support.platform || ''}:${support.userId || ''}`;
        if (!key || key === ':') {
          return;
        }

        const bucket = supportMap.get(key) || { total: 0, count: 0, lastAt: 0, currencyTotals: {}, recentSupports: [] };
        const metric = getSupportMetric(support);
        bucket.total += metric.value;
        bucket.count += 1;
        bucket.lastAt = Math.max(bucket.lastAt, Number(support.eventAt) || 0);
        bucket.currencyTotals[metric.key] = (bucket.currencyTotals[metric.key] || 0) + metric.value;
        if (bucket.recentSupports.length < USER_DETAIL_HISTORY_LIMIT) {
          bucket.recentSupports.push(support);
        }
        supportMap.set(key, bucket);
      });

      const totalCurrencyTotals = {};
      supports.forEach((support) => {
        const metric = getSupportMetric(support);
        totalCurrencyTotals[metric.key] = (totalCurrencyTotals[metric.key] || 0) + metric.value;
      });
      const shouldLimitToScopedSupports = hasSupportScopedUserFilter(effectiveFilters) || viewMode === 'ranking';

      const userRows = users.map((user) => {
        const userLookupKey = user.userKey || `${user.platform || ''}:${user.userId || ''}`;
        const aggregated = supportMap.get(userLookupKey) || { total: 0, count: 0, lastAt: user.lastSeenAt || 0, currencyTotals: {}, recentSupports: [] };
        return { user, aggregated, sortOptions: { rankingCurrency: effectiveFilters.rankingCurrency } };
      });
      let visibleUserRows = shouldLimitToScopedSupports
        ? userRows.filter(({ user }) => {
          const userLookupKey = user.userKey || `${user.platform || ''}:${user.userId || ''}`;
          return supportMap.has(userLookupKey);
        })
        : userRows;
      if (viewMode === 'ranking' && effectiveFilters.rankingPreset === 'primary_currency') {
        visibleUserRows = visibleUserRows.filter(({ aggregated }) => getCurrencyTotal(aggregated, effectiveFilters.rankingCurrency) > 0);
      }
      if (viewMode === 'ranking' && effectiveFilters.rankingPreset === 'sponsorgift') {
        visibleUserRows = visibleUserRows.filter(({ aggregated }) => getSponsorGiftCount(aggregated) > 0);
      }
      const scopeLabel = effectiveFilters.streamId ? `streamId=${effectiveFilters.streamId}` : '全stream';

      els.summaryTotal.textContent = `${visibleUserRows.length} 人`;
      els.summaryCount.textContent = formatCurrencyTotals(totalCurrencyTotals);
      setStatus(`${scopeLabel} の${effectiveViewConfig.statusPrefix}を ${visibleUserRows.length} 件表示中`, 'ok');

      els.tableBody.innerHTML = '';
      if (visibleUserRows.length === 0) {
        els.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${escapeHtml(effectiveViewConfig.emptyMessage)}</td></tr>`;
        return;
      }

      const sortedUserRows = sortUsersByMode(visibleUserRows, effectiveFilters.order);

      sortedUserRows.forEach(({ user, aggregated }, index) => {
        const leadText = viewMode === 'ranking'
          ? `#${index + 1}<br><span class="mono">${escapeHtml(user.userKey || '-')}</span>`
          : `${escapeHtml(formatEventTime(user.lastSeenAt || user.updatedAt))}<br><span class="mono">${escapeHtml(user.userKey || '-')}</span>`;
        const subText = viewMode === 'ranking'
          ? (effectiveFilters.rankingPreset === 'primary_currency' && effectiveFilters.rankingCurrency
            ? `${escapeHtml(effectiveFilters.rankingCurrency)} 累計: ${escapeHtml(Number(getCurrencyTotal(aggregated, effectiveFilters.rankingCurrency)).toLocaleString())}<br>最終支援: ${escapeHtml(formatEventTime(aggregated.lastAt))}`
            : `支援回数: ${escapeHtml(String(aggregated.count))}<br>最終支援: ${escapeHtml(formatEventTime(aggregated.lastAt))}`)
          : `支援回数: ${escapeHtml(String(aggregated.count))}<br>最終支援: ${escapeHtml(formatEventTime(aggregated.lastAt))}<br>${escapeHtml(formatStreamVisitSummary(user))}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${leadText}</td>
          <td>${escapeHtml(user.platform || '-')}</td>
          <td>${escapeHtml(user.displayName || user.userName || '-')}</td>
          <td style="color: var(--accent-2); font-weight: bold;">${escapeHtml(formatCurrencyTotals(aggregated.currencyTotals))}</td>
          <td>${subText}</td>
          <td>
            <button class="btn-subtle" type="button">Profile 詳細</button>
          </td>
        `;

        const profileButton = tr.querySelector('.btn-subtle');
        profileButton.addEventListener('click', () => showUserDetail(user, aggregated));
        els.tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      els.tableBody.innerHTML = '<tr><td colspan="6" style="color:#ff9090;">ユーザー一覧の読み込みに失敗しました</td></tr>';
      setStatus(`読み込み失敗: ${err.message || err}`, 'error');
    }
  }

  function getSupportBannerBaseConfig() {
    return Object.assign({}, SUPPORT_BANNER_DEFAULTS, global.CONFIG || {});
  }

  function getSupportBannerStorageKey(config = null) {
    const source = config || getSupportBannerBaseConfig();
    const candidate = String(source.storageKey || '').trim();
    return candidate || SUPPORT_BANNER_DEFAULTS.storageKey;
  }

  function loadStoredBannerConfig(storageKey) {
    if (!global.localStorage) {
      return null;
    }

    try {
      const raw = global.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
      console.warn('[Dashboard] failed to read localStorage config:', err);
      return null;
    }
  }

  function getResolvedBannerConfig() {
    const baseConfig = getSupportBannerBaseConfig();
    const storageKey = getSupportBannerStorageKey(baseConfig);
    const storedConfig = loadStoredBannerConfig(storageKey);
    const resolvedConfig = Object.assign({}, baseConfig, storedConfig || {});

    return {
      baseConfig,
      storageKey,
      storedConfig,
      resolvedConfig
    };
  }

  function persistBannerConfig(storageKey, config) {
    if (!global.localStorage) {
      throw new Error('localStorage が利用できません');
    }

    global.localStorage.setItem(storageKey, JSON.stringify(config));
  }

  function clearBannerConfig(storageKey) {
    if (!global.localStorage) {
      throw new Error('localStorage が利用できません');
    }

    global.localStorage.removeItem(storageKey);
  }

  function createSliderField({
    id,
    name,
    label,
    value,
    min,
    max,
    step = 1,
    hint = '',
    format = 'number'
  }) {
    const normalizedValue = format === 'percent'
      ? Number(value).toFixed(2)
      : String(value);

    return `
      <div class="settings-field">
        <label for="${id}">${label}</label>
        <div class="settings-input-pair">
          <input
            id="${id}"
            name="${name}"
            type="number"
            min="${min}"
            max="${max}"
            step="${step}"
            value="${escapeHtml(normalizedValue)}"
            data-sync-group="${name}">
          <input
            id="${id}-range"
            type="range"
            min="${min}"
            max="${max}"
            step="${step}"
            value="${escapeHtml(normalizedValue)}"
            data-sync-group="${name}">
        </div>
        ${hint ? `<div class="settings-hint">${hint}</div>` : ''}
      </div>
    `;
  }

  function renderSettingsView() {
    const { baseConfig, storageKey, storedConfig, resolvedConfig } = getResolvedBannerConfig();
    const hasStoredConfig = !!storedConfig;

    els.settingsPanel.innerHTML = `
      <p class="settings-panel__intro">
        VCT_SB_V1 本体が使う表示設定をここで管理します。保存すると localStorage に反映され、本体を再読み込みすると新しい設定が使われます。
      </p>
      <form id="settings-form" class="settings-form">
        <div class="settings-form-column">
          <section class="settings-section">
            <h3>保存状態</h3>
            <div class="settings-meta">
              <div class="settings-meta-card">
                <span class="label">保存先キー</span>
                <span class="value">${escapeHtml(storageKey)}</span>
              </div>
              <div class="settings-meta-card">
                <span class="label">現在の状態</span>
                <span class="value">${hasStoredConfig ? '保存済み設定を使用中' : 'config.js の初期値を使用中'}</span>
              </div>
            </div>
          </section>

        <section class="settings-section">
          <h3>表示内容</h3>
          <p class="settings-hint">カードは表示領域の右端から入り、左方向へ流れます。</p>
          <div class="settings-grid">
            <div class="settings-field">
              <label for="settings-title">タイトル</label>
              <input id="settings-title" name="title" type="text" value="${escapeHtml(resolvedConfig.title || '')}">
            </div>
            ${createSliderField({
              id: 'settings-start-x',
              name: 'startX',
              label: '表示領域 左端X(px)',
              value: resolvedConfig.startX ?? 0,
              min: 0,
              max: PREVIEW_CANVAS_WIDTH,
              step: 1
            })}
            ${createSliderField({
              id: 'settings-start-y',
              name: 'startY',
              label: '表示領域 上端Y(px)',
              value: resolvedConfig.startY ?? 0,
              min: 0,
              max: PREVIEW_CANVAS_HEIGHT,
              step: 1
            })}
            ${createSliderField({
              id: 'settings-end-x',
              name: 'endX',
              label: '表示領域 右端X(px)',
              value: resolvedConfig.endX ?? 1920,
              min: 240,
              max: PREVIEW_CANVAS_WIDTH,
              step: 1,
              hint: '表示範囲の右端です。幅は 右端X - 左端X で決まります。'
            })}
            <div class="settings-field">
              <label for="settings-stream-id">streamId</label>
              <input id="settings-stream-id" name="streamId" type="text" value="${escapeHtml(resolvedConfig.streamId || '')}" placeholder="未入力なら当日">
              <div class="settings-hint">未入力なら本体側で当日の YYYYMMDD を使います。</div>
            </div>
            <div class="settings-field">
              <label for="settings-limit">最大件数</label>
              <input id="settings-limit" name="limit" type="number" min="1" step="1" value="${escapeHtml(String(resolvedConfig.limit ?? 20))}">
            </div>
            <div class="settings-field">
              <label for="settings-display-order">表示順</label>
              <select id="settings-display-order" name="displayOrder">
                <option value="oldest_first"${resolvedConfig.displayOrder === 'oldest_first' ? ' selected' : ''}>古い順</option>
                <option value="newest_first"${resolvedConfig.displayOrder === 'newest_first' ? ' selected' : ''}>新しい順</option>
              </select>
            </div>
            <div class="settings-field">
              <label for="settings-max-message-length">コメント最大文字数</label>
              <input id="settings-max-message-length" name="maxMessageLength" type="number" min="1" step="1" value="${escapeHtml(String(resolvedConfig.maxMessageLength ?? 50))}">
            </div>
            <div class="settings-field settings-field--full">
              <label for="settings-empty-state-text">空表示メッセージ</label>
              <textarea id="settings-empty-state-text" name="emptyStateText">${escapeHtml(resolvedConfig.emptyStateText || '')}</textarea>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>レイアウト</h3>
          <div class="settings-grid">
            ${createSliderField({
              id: 'settings-title-height',
              name: 'titleHeight',
              label: 'タイトル高さ(px)',
              value: resolvedConfig.titleHeight ?? 40,
              min: 0,
              max: 200,
              step: 1
            })}
            ${createSliderField({
              id: 'settings-viewport-height',
              name: 'viewportHeight',
              label: '表示エリア高さ(px)',
              value: resolvedConfig.viewportHeight ?? 140,
              min: 40,
              max: 400,
              step: 1
            })}
            ${createSliderField({
              id: 'settings-card-width',
              name: 'cardWidth',
              label: 'カード幅(px)',
              value: resolvedConfig.cardWidth ?? 280,
              min: 120,
              max: 640,
              step: 1
            })}
            ${createSliderField({
              id: 'settings-card-gap',
              name: 'cardGap',
              label: 'カード間隔(px)',
              value: resolvedConfig.cardGap ?? 12,
              min: 0,
              max: 80,
              step: 1
            })}
            ${createSliderField({
              id: 'settings-scroll-speed',
              name: 'scrollSpeed',
              label: 'スクロール速度(px/秒)',
              value: resolvedConfig.scrollSpeed ?? 110,
              min: 1,
              max: 400,
              step: 1
            })}
            <div class="settings-field">
              <label>カード色モード</label>
              <div class="settings-radio-group">
                <label class="settings-toggle settings-toggle--compact">
                  <input name="cardColorMode" type="radio" value="soft"${(resolvedConfig.cardColorMode || 'soft') !== 'contrast' ? ' checked' : ''}>
                  ソフト
                </label>
                <label class="settings-toggle settings-toggle--compact">
                  <input name="cardColorMode" type="radio" value="contrast"${resolvedConfig.cardColorMode === 'contrast' ? ' checked' : ''}>
                  コントラスト
                </label>
              </div>
              <div class="settings-hint">ソフトは背景になじみやすく、コントラストは見出し感が強く出ます。</div>
            </div>
            ${createSliderField({
              id: 'settings-card-bg-opacity',
              name: 'cardBackgroundOpacity',
              label: 'カード色の不透明度',
              value: resolvedConfig.cardBackgroundOpacity ?? 0.18,
              min: 0,
              max: 1,
              step: 0.01,
              hint: '0 に近いほど背景になじみ、1 に近いほどギフト色がはっきり出ます。',
              format: 'percent'
            })}
          </div>
        </section>

        <section class="settings-section">
          <h3>表示オン/オフ</h3>
          <div class="settings-grid">
            <label class="settings-toggle"><input name="showIcon" type="checkbox"${resolvedConfig.showIcon ? ' checked' : ''}> アイコンを表示する</label>
            <label class="settings-toggle"><input name="titleVisible" type="checkbox"${resolvedConfig.titleVisible ? ' checked' : ''}> タイトル帯を表示する</label>
            <label class="settings-toggle"><input name="amountVisible" type="checkbox"${resolvedConfig.amountVisible ? ' checked' : ''}> 金額欄を表示する</label>
            <label class="settings-toggle"><input name="messageVisible" type="checkbox"${resolvedConfig.messageVisible ? ' checked' : ''}> コメント欄を表示する</label>
          </div>
        </section>
        </div>

        <aside class="settings-preview-column" aria-label="設定プレビュー">
          <section class="settings-section settings-section--preview">
            <h3>位置プレビュー</h3>
            <p class="settings-hint">1920x1080 の OBS ソース想定で、保存前の位置と表示幅を確認できます。</p>
            <div class="settings-preview">
              <div class="settings-preview__canvas">
                <div id="settings-preview-stage" class="settings-preview__stage">
                  <div id="settings-preview-banner" class="settings-preview__banner">
                    <div id="settings-preview-title" class="settings-preview__title">本日の支援者</div>
                    <div id="settings-preview-viewport" class="settings-preview__viewport">
                      <div class="settings-preview__track">
                        <div id="settings-preview-cards" class="settings-preview__cards"></div>
                      </div>
                    </div>
                  </div>
                  <div id="settings-preview-end-marker" class="settings-preview__end-marker" aria-hidden="true"></div>
                </div>
              </div>
              <div id="settings-preview-summary" class="settings-preview__summary"></div>
            </div>
          </section>

          <div class="settings-actions">
            <button type="submit">設定を保存</button>
            <button type="button" class="secondary" onclick="loadSettingsView()">再読込</button>
            <button type="button" class="danger" onclick="resetBannerSettings()">保存設定を初期化</button>
          </div>
        </aside>
      </form>
    `;

    const form = document.getElementById('settings-form');
    form.addEventListener('submit', handleSaveSettings);
    form.addEventListener('input', handleSettingsPreviewInput);
    form.addEventListener('change', handleSettingsPreviewInput);
    updateSettingsPreview();
  }

  function parseSettingsNumber(formData, key, fallback) {
    const raw = String(formData.get(key) || '').trim();
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readSettingsFormValues() {
    const form = document.getElementById('settings-form');
    if (!form) {
      throw new Error('設定フォームが見つかりません');
    }

    const formData = new FormData(form);
    const { baseConfig, storageKey } = getResolvedBannerConfig();

    const rawConfig = {
      configVersion: baseConfig.configVersion,
      storageKey,
      title: String(formData.get('title') || '').trim() || baseConfig.title,
      startX: parseSettingsNumber(formData, 'startX', baseConfig.startX),
      startY: parseSettingsNumber(formData, 'startY', baseConfig.startY),
      endX: parseSettingsNumber(formData, 'endX', baseConfig.endX),
      streamId: String(formData.get('streamId') || '').trim() || null,
      limit: parseSettingsNumber(formData, 'limit', baseConfig.limit),
      displayOrder: formData.get('displayOrder') === 'newest_first' ? 'newest_first' : 'oldest_first',
      maxMessageLength: parseSettingsNumber(formData, 'maxMessageLength', baseConfig.maxMessageLength),
      showIcon: formData.has('showIcon'),
      titleVisible: formData.has('titleVisible'),
      titleHeight: parseSettingsNumber(formData, 'titleHeight', baseConfig.titleHeight),
      amountVisible: formData.has('amountVisible'),
      messageVisible: formData.has('messageVisible'),
      viewportHeight: parseSettingsNumber(formData, 'viewportHeight', baseConfig.viewportHeight),
      cardWidth: parseSettingsNumber(formData, 'cardWidth', baseConfig.cardWidth),
      cardGap: parseSettingsNumber(formData, 'cardGap', baseConfig.cardGap),
      scrollSpeed: parseSettingsNumber(formData, 'scrollSpeed', baseConfig.scrollSpeed),
      cardColorMode: formData.get('cardColorMode') === 'contrast' ? 'contrast' : 'soft',
      cardBackgroundOpacity: parseSettingsNumber(formData, 'cardBackgroundOpacity', baseConfig.cardBackgroundOpacity),
      emptyStateText: String(formData.get('emptyStateText') || '').trim() || baseConfig.emptyStateText,
      resetStreamOnLoad: false,
      resetAllOnLoad: false
    };

    const normalizedLayout = normalizePreviewConfig(rawConfig);
    return {
      ...rawConfig,
      startX: normalizedLayout.startX,
      startY: normalizedLayout.startY,
      endX: normalizedLayout.endX
    };
  }

  function normalizePreviewConfig(config) {
    const startX = Math.max(0, Number(config.startX) || 0);
    const startY = Math.max(0, Number(config.startY) || 0);
    const cardWidth = Math.max(120, Number(config.cardWidth) || SUPPORT_BANNER_DEFAULTS.cardWidth);
    const viewportHeight = Math.max(40, Number(config.viewportHeight) || SUPPORT_BANNER_DEFAULTS.viewportHeight);
    const titleHeight = Math.max(0, Number(config.titleHeight) || 0);
    const requestedEndX = Number(config.endX);
    const minimumWidth = Math.max(cardWidth + 32, 240);
    const safeEndX = Number.isFinite(requestedEndX) ? requestedEndX : PREVIEW_CANVAS_WIDTH;
    const endX = Math.min(PREVIEW_CANVAS_WIDTH, Math.max(startX + minimumWidth, safeEndX));

    return {
      ...config,
      startX,
      startY: Math.min(startY, PREVIEW_CANVAS_HEIGHT - Math.max(titleHeight + viewportHeight, viewportHeight)),
      endX,
      width: endX - startX,
      cardWidth,
      viewportHeight,
      titleHeight,
      cardGap: Math.max(0, Number(config.cardGap) || 0),
      cardColorMode: config.cardColorMode === 'contrast' ? 'contrast' : 'soft',
      cardBackgroundOpacity: Math.min(1, Math.max(0, Number(config.cardBackgroundOpacity) || 0)),
      title: String(config.title || '').trim() || SUPPORT_BANNER_DEFAULTS.title,
      showIcon: !!config.showIcon,
      titleVisible: !!config.titleVisible,
      amountVisible: !!config.amountVisible,
      messageVisible: !!config.messageVisible
    };
  }

  function getPreviewCardsMarkup(config) {
    const cards = [
      {
        userName: 'Viewer A',
        amountText: '¥1,000',
        message: 'いつも配信ありがとう！',
        accent: ['255', '138', '91']
      },
      {
        userName: 'Member B',
        amountText: '5 件',
        message: 'メンバーギフトです',
        accent: ['67', '206', '162']
      },
      {
        userName: 'Supporter C',
        amountText: '$10',
        message: '次回も楽しみにしています',
        accent: ['127', '127', '213']
      }
    ];

    return cards.map((card) => `
      <article class="settings-preview__card" style="width:${config.cardWidth}px; min-width:${config.cardWidth}px; background:${getPreviewCardBackground(card.accent, config)};">
        <div class="settings-preview__card-head">
          ${config.showIcon ? '<div class="settings-preview__icon"></div>' : ''}
          <div class="settings-preview__name">${escapeHtml(card.userName)}</div>
        </div>
        ${config.amountVisible ? `<div class="settings-preview__amount">${escapeHtml(card.amountText)}</div>` : ''}
        ${config.messageVisible ? `<div class="settings-preview__message">${escapeHtml(card.message)}</div>` : ''}
      </article>
    `).join('');
  }

  function getPreviewCardBackground(rgbParts, config) {
    const alpha = config.cardBackgroundOpacity;
    const accent = `rgba(${rgbParts.join(', ')}, ${Math.min(1, alpha * 0.72 + 0.08)})`;
    const base = `rgba(${rgbParts.join(', ')}, ${alpha})`;

    if (config.cardColorMode === 'contrast') {
      const strong = `rgba(${rgbParts.join(', ')}, ${Math.min(1, alpha * 0.9 + 0.08)})`;
      const shadow = `rgba(8, 12, 20, ${Math.min(0.82, alpha * 0.68 + 0.12)})`;
      return `linear-gradient(135deg, ${strong}, ${shadow})`;
    }

    return `linear-gradient(135deg, ${accent}, ${base})`;
  }

  function updateSettingsPreview() {
    const form = document.getElementById('settings-form');
    const previewBanner = document.getElementById('settings-preview-banner');
    const previewStage = document.getElementById('settings-preview-stage');
    const previewTitle = document.getElementById('settings-preview-title');
    const previewViewport = document.getElementById('settings-preview-viewport');
    const previewCards = document.getElementById('settings-preview-cards');
    const previewSummary = document.getElementById('settings-preview-summary');
    const previewEndMarker = document.getElementById('settings-preview-end-marker');

    if (!form || !previewBanner || !previewStage || !previewTitle || !previewViewport || !previewCards || !previewSummary || !previewEndMarker) {
      return;
    }

    const config = normalizePreviewConfig(readSettingsFormValues());
    const canvas = previewStage.parentElement;
    const scale = canvas ? canvas.clientWidth / PREVIEW_CANVAS_WIDTH : 1;
    previewStage.style.transform = `scale(${scale || 1})`;
    previewBanner.style.left = `${config.startX}px`;
    previewBanner.style.top = `${config.startY}px`;
    previewBanner.style.width = `${config.width}px`;
    previewBanner.style.setProperty('--preview-title-height', `${config.titleHeight}px`);
    previewBanner.style.setProperty('--preview-viewport-height', `${config.viewportHeight}px`);
    previewBanner.style.setProperty('--preview-card-gap', `${config.cardGap}px`);
    previewBanner.style.setProperty('--preview-card-color-opacity', String(config.cardBackgroundOpacity));
    previewTitle.textContent = config.title;
    previewTitle.style.display = config.titleVisible ? '' : 'none';
    previewViewport.style.height = `${config.viewportHeight}px`;
    previewCards.style.gap = `${config.cardGap}px`;
    previewCards.innerHTML = getPreviewCardsMarkup(config);
    previewEndMarker.style.left = `${config.endX}px`;
    previewSummary.textContent = `開始 (${config.startX}, ${config.startY}) / 終端X ${config.endX} / 表示幅 ${config.width}px`;
  }

  function handleSettingsPreviewInput(event) {
    try {
      const target = event?.target;
      if (target && target.dataset && target.dataset.syncGroup) {
        const syncValue = target.value;
        const group = target.dataset.syncGroup;
        document.querySelectorAll(`[data-sync-group="${group}"]`).forEach((input) => {
          if (input !== target) {
            input.value = syncValue;
          }
        });
      }
      updateSettingsPreview();
    } catch (err) {
      console.warn('[Dashboard] preview update skipped:', err);
    }
  }

  async function ensureDBReady() {
    if (!global.idb) {
      throw new Error('idb ライブラリが読み込まれていません');
    }
    if (!global.VCT_IDB || typeof global.VCT_IDB.initDB !== 'function') {
      throw new Error('VCT_IDB が読み込まれていません');
    }
    await global.VCT_IDB.initDB();
  }

  async function getSupports(options = null) {
    await ensureDBReady();
    return await global.VCT_IDB.getSupports(options || getFilters());
  }

  async function getUsers() {
    await ensureDBReady();
    const filters = getFilters();
    const dbOrder = filters.order === 'asc' ? 'asc' : 'desc';
    return await global.VCT_IDB.getUsers({
      platform: filters.platform,
      order: dbOrder
    });
  }

  async function deleteSupport(eventKey) {
    await ensureDBReady();
    if (typeof global.VCT_IDB.deleteSupport !== 'function') {
      throw new Error('deleteSupport API が未実装です');
    }
    return await global.VCT_IDB.deleteSupport(eventKey);
  }

  async function clearSupports(options = {}) {
    await ensureDBReady();
    if (!global.VCT_IDB || typeof global.VCT_IDB.clearSupports !== 'function') {
      throw new Error('clearSupports API が未実装です');
    }
    return await global.VCT_IDB.clearSupports(options);
  }

  async function clearUsers() {
    await ensureDBReady();
    if (!global.VCT_IDB || typeof global.VCT_IDB.clearUsers !== 'function') {
      throw new Error('clearUsers API が未実装です');
    }
    return await global.VCT_IDB.clearUsers();
  }

  function useTodayStream() {
    if (global.VCT_IDB && typeof global.VCT_IDB.getDefaultStreamId === 'function') {
      const todayStreamId = global.VCT_IDB.getDefaultStreamId();
      if (state.activeView === 'users') {
        state.usersStreamId = todayStreamId;
      } else if (state.activeView === 'ranking') {
        state.rankingStreamId = todayStreamId;
      } else {
        state.supportsStreamId = todayStreamId;
      }
      if (state.activeView === 'supports' || state.activeView === 'users' || state.activeView === 'ranking') {
        els.streamIdInput.value = todayStreamId;
      }
    }
  }

  function reloadActiveView() {
    if (state.activeView === 'users') {
      loadUsersView();
      return;
    }
    if (state.activeView === 'ranking') {
      loadRankingView();
      return;
    }
    if (state.activeView === 'settings') {
      loadSettingsView();
      return;
    }
    loadSupportsView();
  }

  async function handleClearCurrentStream() {
    const streamId = String(els.streamIdInput.value || '').trim();
    if (!streamId) {
      setStatus('streamId が指定されていません', 'error');
      return;
    }

    openDangerPanel({
      title: 'このStreamの supports を削除',
      subtitle: '指定中の streamId に紐づく supports を削除します。',
      message: `streamId=${streamId} の supports を削除します。この操作は元に戻せません。`,
      confirmLabel: 'このStreamを削除',
      onConfirm: async () => {
        try {
          await clearSupports({ streamId });
          setStatus(`streamId=${streamId} の supports を削除しました`, 'ok');
          reloadActiveView();
        } catch (err) {
          console.error(err);
          setStatus(`削除失敗: ${err.message || err}`, 'error');
        }
      }
    });
  }

  async function handleClearAllSupports() {
    openDangerPanel({
      title: 'supports を全削除',
      subtitle: '保存済みの支援履歴をすべて削除します。',
      message: 'supports を全削除します。この操作は元に戻せません。',
      confirmLabel: 'supports を全削除',
      onConfirm: async () => {
        try {
          await clearSupports();
          setStatus('supports を全削除しました', 'ok');
          reloadActiveView();
        } catch (err) {
          console.error(err);
          setStatus(`削除失敗: ${err.message || err}`, 'error');
        }
      }
    });
  }

  async function handleClearAllUsers() {
    openDangerPanel({
      title: 'users を全削除',
      subtitle: '保存済みのユーザー現在値をすべて削除します。',
      message: 'users を全削除します。supports は削除されません。この操作は元に戻せません。',
      confirmLabel: 'users を全削除',
      onConfirm: async () => {
        try {
          await clearUsers();
          setStatus('users を全削除しました', 'ok');
          reloadActiveView();
        } catch (err) {
          console.error(err);
          setStatus(`削除失敗: ${err.message || err}`, 'error');
        }
      }
    });
  }

  function showStateViewPlaceholder() {
    setActiveNav('state');
    setSummaryLabels('未実装', '未実装');
    setTableHeaders();
    els.summaryTotal.textContent = '-';
    els.summaryCount.textContent = '-';
    els.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">内部状態ビューは未実装です</td></tr>';
    setStatus('内部状態 (State) ビューは未実装です。OBS 内部ブラウザ向けにポップアップは使わず画面内で案内しています。', 'error');
  }

  function loadSettingsView() {
    setActiveNav('settings');
    setSummaryLabels('設定バージョン', '保存先');
    setTableHeaders();
    const { resolvedConfig, storageKey, storedConfig } = getResolvedBannerConfig();
    els.summaryTotal.textContent = `v${resolvedConfig.configVersion || 1}`;
    els.summaryCount.textContent = storedConfig ? 'localStorage' : 'config.js';
    renderSettingsView();
    setStatus(`設定タブを表示中: ${storageKey}`, 'ok');
  }

  async function loadSupportsView() {
    setActiveNav('supports');
    setSummaryLabels('表示中の支援総額', '表示中の支援件数');
    setTableHeaders();
    els.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">読み込み中...</td></tr>';
    setStatus('IndexedDB から支援履歴を読み込んでいます...');

    try {
      const rawSupports = await getSupports();
      const filters = getFilters();
      const supports = filterSupports(rawSupports, filters);
      updatePlatformOptions(rawSupports, []);

      const totalCurrencyTotals = {};
      supports.forEach((support) => {
        const metric = getSupportMetric(support);
        totalCurrencyTotals[metric.key] = (totalCurrencyTotals[metric.key] || 0) + metric.value;
      });

      els.summaryTotal.textContent = formatCurrencyTotals(totalCurrencyTotals);
      els.summaryCount.textContent = `${supports.length} 件`;

      const scopeLabel = filters.streamId ? `streamId=${filters.streamId}` : '全stream';
      setStatus(`${scopeLabel} の支援履歴を ${supports.length} 件表示中`, 'ok');

      els.tableBody.innerHTML = '';
      if (supports.length === 0) {
        els.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">データがありません</td></tr>';
        return;
      }

      supports.forEach((support) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(formatEventTime(support.eventAt))}<br><span class="mono">${escapeHtml(support.eventKey || '-')}</span></td>
          <td>${escapeHtml(support.platform || '-')}</td>
          <td>${escapeHtml(support.userName || '-')}</td>
          <td style="color: var(--accent-2); font-weight: bold;">${escapeHtml(formatSupportMetric(support))}</td>
          <td>
            ${escapeHtml(getSupportDisplayMessage(support) || '-')}
            <br>
            <button class="btn-subtle" type="button">Raw 詳細</button>
          </td>
          <td>
            <button class="btn-danger" type="button">削除</button>
          </td>
        `;

        const rawButton = tr.querySelector('.btn-subtle');
        const deleteButton = tr.querySelector('.btn-danger');
        rawButton.addEventListener('click', () => showSupportDetail(support));
        deleteButton.addEventListener('click', () => handleDelete(support.eventKey));
        els.tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      els.tableBody.innerHTML = '<tr><td colspan="6" style="color:#ff9090;">データの読み込みに失敗しました</td></tr>';
      setStatus(`読み込み失敗: ${err.message || err}`, 'error');
    }
  }

  async function loadUsersView() {
    await loadUserAggregateView('users');
  }

  async function loadRankingView() {
    await loadUserAggregateView('ranking');
  }

  async function handleDelete(eventKey) {
    if (!eventKey) {
      setStatus('eventKey が無いため削除できません', 'error');
      return;
    }

    openDangerPanel({
      title: '支援履歴を削除',
      subtitle: '選択した supports レコードを削除します。',
      message: `eventKey=${eventKey} を削除します。集計からも除外され、この操作は元に戻せません。`,
      confirmLabel: '履歴を削除',
      onConfirm: async () => {
        try {
          const deleted = await deleteSupport(eventKey);
          if (!deleted) {
            setStatus(`削除対象が見つかりませんでした: ${eventKey}`, 'error');
            return;
          }
          await loadSupportsView();
        } catch (err) {
          console.error(err);
          setStatus(`削除失敗: ${err.message || err}`, 'error');
        }
      }
    });
  }

  function handleSaveSettings(event) {
    event.preventDefault();

    try {
      const config = readSettingsFormValues();
      const storageKey = getSupportBannerStorageKey(config);
      persistBannerConfig(storageKey, config);
      setStatus('設定を保存しました。本体を再読み込みすると反映されます。', 'ok');
      loadSettingsView();
    } catch (err) {
      console.error(err);
      setStatus(`設定保存に失敗しました: ${err.message || err}`, 'error');
    }
  }

  function resetBannerSettings() {
    const { storageKey } = getResolvedBannerConfig();
    openDangerPanel({
      title: '保存済み設定を初期化',
      subtitle: 'localStorage の保存済み設定を削除します。',
      message: '保存済み設定を初期化します。config.js の初期値に戻り、この操作は元に戻せません。',
      confirmLabel: '設定を初期化',
      onConfirm: async () => {
        try {
          clearBannerConfig(storageKey);
          setStatus('保存済み設定を初期化しました。config.js の初期値に戻ります。', 'ok');
          loadSettingsView();
        } catch (err) {
          console.error(err);
          setStatus(`初期化に失敗しました: ${err.message || err}`, 'error');
        }
      }
    });
  }

  function initDashboard() {
    try {
      useTodayStream();
    } catch (err) {
      console.warn(err);
    }
    global.addEventListener('resize', handleSettingsPreviewInput);
    loadSupportsView();
  }

  global.useTodayStream = useTodayStream;
  global.reloadActiveView = reloadActiveView;
  global.handleClearCurrentStream = handleClearCurrentStream;
  global.handleClearAllSupports = handleClearAllSupports;
  global.handleClearAllUsers = handleClearAllUsers;
  global.loadSupportsView = loadSupportsView;
  global.loadUsersView = loadUsersView;
  global.loadRankingView = loadRankingView;
  global.loadSettingsView = loadSettingsView;
  global.resetBannerSettings = resetBannerSettings;
  global.showStateViewPlaceholder = showStateViewPlaceholder;
  global.initDashboard = initDashboard;
})(window);
