/**
 * VCT Support Thanks: Main Logic
 */

function resolveRankKey(data) {
  const raw = data?.raw || {};
  const payload = raw?.payload || {};
  const source = raw?.data || payload?.data || payload || raw || {};

  const explicitPriceColor =
    source?.priceColor ||
    payload?.priceColor ||
    raw?.priceColor;

  if (explicitPriceColor) {
    return explicitPriceColor;
  }

  const tier = Number(source?.tier);
  if (Number.isFinite(tier)) {
    const tierMap = {
      1: 'blue',
      2: 'cyan',
      3: 'green',
      4: 'yellow',
      5: 'orange',
      6: 'pink',
      7: 'red'
    };
    return tierMap[tier] || 'default';
  }

  return 'default';
}

function resolveSpawnStartY(config) {
  const mode = String(config?.spawnOriginMode || 'offscreen').trim().toLowerCase();
  if (mode === 'top_edge') {
    return 0;
  }

  return -(100 + Math.random() * 300);
}

function initOneSDK() {
  if (!window.OneSDK) {
    console.error('[VCT] OneSDK not found. Check if onesdk.js is loaded correctly.');
    return;
  }

  // 購読設定
  OneSDK.subscribe({
    action: 'comments',
    callback: (comments) => {
      comments.forEach(raw => {
        const data = VCT.parse(raw);
        const config = window.CONFIG;

        const shouldTrigger = 
          config.triggerMode === "all" || 
          (config.triggerMode === "gift_only" && data.hasGift);

        if (shouldTrigger) {
          spawnIcons(data);
        }
      });
    }
  });

  // 起動シーケンス
  OneSDK.ready().then(() => {
    OneSDK.setup({
      mode: "diff",
      permissions: ["comments"],
    });
    OneSDK.connect();
    console.log('[VCT] OneSDK Connected and Ready');
    
    // bodyのhidden解除（CommentFX等に合わせた作法）
    document.body.removeAttribute('hidden');
  }).catch((err) => {
    console.error('[VCT] OneSDK initialization error:', err);
  });
}

/**
 * アイコンの生成とアニメーション実行
 */
function spawnIcons(data) {
  const container = document.getElementById('effect-container');
  const config = window.CONFIG;
  const colorKey = resolveRankKey(data);
  const rank = config.rankSettings[colorKey] || config.rankSettings['default'];
  const auraColor = data.colorStr || config.colorMap[colorKey] || config.colorMap['default'];
  const count = rank.base + Math.floor(Math.random() * rank.range);

  for (let i = 0; i < count; i++) {
    const icon = document.createElement('div');
    icon.className = 'falling-icon';
    icon.style.backgroundImage = `url(${data.profileImage})`;
    icon.style.setProperty('--aura-color', auraColor);
    
    // サイズ設定
    const sizeBase = rank.size;
    const sizeRandom = sizeBase * (0.8 + Math.random() * 0.4);
    icon.style.width = `${sizeRandom}px`;
    icon.style.height = `${sizeRandom}px`;

    // 出現位置のランダム化（画面外から降らせる）
    // 横幅: -10% 〜 110%
    // 高さ: -300px 〜 -100px 相当を変数で渡す
    const startX = -10 + (Math.random() * 120);
    const startY = resolveSpawnStartY(config);
    icon.style.left = `${startX}vw`;
    icon.style.top = `${startY}px`;
    icon.style.setProperty('--spawn-top', `${startY}px`);

    // 揺らぎ用の変数
    const baseDrift = (Math.random() - 0.5) * 90;
    const swayX1 = baseDrift * 0.7;
    const swayX2 = baseDrift * -0.4;
    const swayX3 = baseDrift * 0.9;
    const swayRotate1 = (Math.random() - 0.5) * 50;
    const swayRotate2 = swayRotate1 * -0.8;
    const swayRotate3 = swayRotate1 * 0.6;
    icon.style.setProperty('--sway-x1', `${swayX1}px`);
    icon.style.setProperty('--sway-x2', `${swayX2}px`);
    icon.style.setProperty('--sway-x3', `${swayX3}px`);
    icon.style.setProperty('--rot-1', `${swayRotate1}deg`);
    icon.style.setProperty('--rot-2', `${swayRotate2}deg`);
    icon.style.setProperty('--rot-3', `${swayRotate3}deg`);
    
    // 落下速度と遅延
    const duration = config.durationRange[0] + Math.random() * (config.durationRange[1] - config.durationRange[0]);
    const delay = Math.random() * config.delayMax;
    
    icon.style.animation = `
      fall ${duration}s linear ${delay}s forwards,
      aura-pulse 1.5s ease-in-out infinite
    `;

    container.appendChild(icon);
    icon.addEventListener('animationend', (e) => {
      if (e.animationName === 'fall') icon.remove();
    });
  }
}

// 実行
initOneSDK();
