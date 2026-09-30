# V-Telop System V1 Technical Spec

本ドキュメントは、`V_Telop_SYSTEM_V1` の現行実装である `v1.0.7-dev` の技術仕様です。

## 1. システム構成

- **Runtime**: Browser / OBS Browser Source / わんコメカスタムテンプレート
- **SDK**: OneSDK (`../__origin/js/onesdk.js`) / VCT SDK (`../_vct_core/js/vct_one_core.js`)
- **Optional Parser**: `window.VCT.parse()` が存在する場合はコメント正規化に利用。新仕様対応時は `parseStructured()` 系への移行を検討する。
- **Styling**: Tailwind CDN + Vanilla CSS
- **State Sync**: `localStorage` + `BroadcastChannel`

## 2. ファイル構成

- `index.html`: 本体。ポータル、ジェネレーター、設定、操作パネル、表示モード、OneSDK adapter、ギフト割り込みを含む。
- `v_telop_display_v1.html`: 補助表示専用。保存済み状態と BroadcastChannel を読んで通常テロップ/ギフト表示を描画する。
- `v_telop_system_v1.html`: v1.0.6 系の一体型HTML。互換・参照用。
- `css/vtelop-common.css`: `.telop-container`、`.telop-text`、`.gift-card` などの共通表示スタイル。
- `frames/*.png`: `news`、`news2`、`pop`、`pop2`、`pop3` のフレーム素材。

## 3. 主要状態

`index.html` は単一の `state` オブジェクトを中心に動作します。

```javascript
{
  presets: [
    { data: [], config: {} },
    { data: [], config: {} },
    { data: [], config: {} }
  ],
  activeIndex: 0,
  editingIndex: 0,
  index: 0,
  visible: true,
  autoRotate: {
    enabled: false,
    intervalSec: 8,
    loop: true
  },
  giftInterrupt: {}
}
```

`state.data` と `state.config` は、現在の `activeIndex` に対応するプリセットへの getter として扱われます。

## 4. 保存キー

| Key | 内容 |
| --- | --- |
| `vt_telop_presets` | 3プリセット分のテロップデータと表示設定 |
| `vt_telop_active_slot` | On-Air 中のプリセット番号 |
| `vt_telop_index` | 現在表示中のテロップ番号 |
| `vt_telop_visible` | 表示ON/OFF |
| `vt_telop_auto_rotate` | Auto Rotation 設定 |
| `vt_telop_gift_interrupt` | ギフト割り込み設定 |
| `vt_telop_gift_runtime` | 現在再生中のギフト割り込み状態 |
| `vt_telop_runtime_view_mode` | `portal` / `display` の表示モード |
| `vt_telop_data` | 旧形式の単一テロップ配列。移行用 |
| `vt_telop_config` | 旧形式の単一設定。移行用 |

## 5. BroadcastChannel

通常同期には `vtuber_telop_channel` を使います。

| Type | 用途 |
| --- | --- |
| `UPDATE_SLOT` | プリセットのテキスト/設定更新 |
| `SWITCH_ACTIVE_SLOT` | On-Air プリセット切り替え |
| `UPDATE_DATA` | 旧形式互換のテロップデータ更新 |
| `UPDATE_INDEX` | 現在番号更新 |
| `TOGGLE_VISIBILITY` | 表示ON/OFF |
| `LIVE_CONFIG` | 表示設定の即時反映 |
| `AUTO_ROTATE_SETTINGS` | 自動送り設定の同期 |
| `GIFT_INTERRUPT_STATE` | ギフト割り込み中の表示状態同期 |

外部カウンター連携には `obs_counter_sync` を使います。設定内の `remoteId` と一致するカウンター値が増減したとき、テロップを進める/戻す処理を行います。

## 6. 表示設定

初期設定は `DEFAULT_CONFIG` で定義されます。

主な項目:

- `font`, `size`, `color`, `colorAlpha`
- `bgBase`, `bgAlpha`
- `border`, `borderAlpha`
- `outlineColor`, `outlineWidth`, `outlineAlpha`
- `posX`, `posY`
- `framePreset`, `frameScale`
- `textOffsetX`, `textOffsetY`
- `giftCardScale`
- `remoteId`
- `fullWidth`

`framePreset` は `none`、`news`、`news2`、`pop`、`pop2`、`pop3` を受け付けます。

## 7. ギフト割り込み仕様

ギフト割り込み設定は `DEFAULT_GIFT_RULES` を基準に正規化されます。

```javascript
{
  enabled: true,
  triggerMode: 'command_only',
  queueLimit: 5,
  ranks: [
    { id: 'low', minAmount: 1, durationSec: 8 },
    { id: 'mid', minAmount: 1000, durationSec: 12 },
    { id: 'high', minAmount: 5000, durationSec: 18 }
  ]
}
```

### 7.1 発動条件

- `enabled` が `false` の場合は発動しない。
- `event.type` が `gift` の場合のみ対象。
- `triggerMode` が `all` の場合は検出されたギフトをすべて対象にする。
- `triggerMode` が `command_only` の場合は VCT コマンド名が `jack`、`sponsor`、`支援`、`スポンサー` のいずれかに一致した場合のみ対象にする。

### 7.2 キュー

- FIFO で処理する。
- `queueLimit` 以上になった場合、新規イベントは追加しない。
- 再生中のギフトは `current` に保持する。
- `expiresAt` に終了予定時刻を持つ。
- 表示状態は `vt_telop_gift_runtime` と `GIFT_INTERRUPT_STATE` で補助表示へ伝搬する。

### 7.3 ランク

`resolveGiftRank()` は `minAmount` の昇順でランクを評価し、金額以上の最後のランクを採用します。

金額は `toGiftRankAmount()` で一部通貨をJPY相当に簡易換算します。初期対応通貨は `JPY`、`YEN`、`USD`、`US$`、`TWD`、`NTD`、`HKD`、`KRW`、`EUR`、`GBP`、`AUD`、`CAD`、`SGD` です。

### 7.4 表示

ギフト割り込み中は通常テロップを `.telop-hidden-for-gift` で退避し、`.gift-card` を表示します。

ギフトカードは以下を表示します。

- ヘッダーラベル
- 投稿者名
- 金額
- 本文
- `bodyParts` がある場合の mixed content

## 8. OneSDK Adapter

`initOneCommeAdapter()` は OneSDK を初期化し、`comments` を購読します。コメント正規化には現状 `window.VCT.parse()` 互換APIを使用します。

処理フロー:

1. `OneSDK.ready()`
2. 必要なら `OneSDK.usePermission([OneSDK.PERM.COMMENT])`
3. `OneSDK.setup({ mode: 'diff' })`
4. `OneSDK.subscribe({ action: 'comments', callback })`
5. `OneSDK.connect()`
6. `normalizeOnecommeEvent(rawComment)` で共通イベント化
7. ギフトの場合は `enqueueGiftInterrupt(normalized)` へ渡す

共通イベントは概ね以下の形です。

```javascript
{
  type: 'comment' | 'gift',
  author: '',
  text: '',
  amount: 0,
  currency: '',
  rankAmount: 0,
  paidText: '',
  giftName: '',
  memberTier: '',
  bodyParts: [],
  command: null,
  parsed: null,
  raw: {}
}
```

## 9. 表示モード

`index.html` は以下のどちらでも表示専用モードになります。

- `?mode=display`
- UI の `表示専用へ`

表示専用モードでは `body.mode-display` が付与され、グローバルナビを非表示にして背景を透過します。

補助表示の `v_telop_display_v1.html` は、本体と同じ保存キーと BroadcastChannel を参照します。ただし、本体表示モードと完全な見た目一致を保証するものではありません。

## 10. ホットキー

`document.addEventListener('keydown')` で処理します。`input` / `textarea` にフォーカス中は無効です。

- `N`, `Space`, `ArrowRight`, `+`: 次へ
- `P`, `ArrowLeft`, `-`: 前へ
- `V`, `*`: 表示ON/OFF
- `A`: Auto Rotation ON/OFF
- `1` - `9`: 指定番号へジャンプ
- `0`: 10番目へジャンプ
- `Ctrl + Shift + D`: 表示専用モード切り替え
- `Escape`: 表示専用モードから戻る

## 11. 互換性と移行

`vt_telop_presets` が存在しない場合、旧形式の `vt_telop_data` と `vt_telop_config` をプリセット1へ読み込みます。

`v_telop_system_v1.html` は v1.0.6 系の入口として残っています。v1.0.7-dev のわんコメ連携とギフト割り込みを使う場合は `index.html` を基準にしてください。

## 12. 保守上の注意

- 通常テロップの `activeIndex` と `index` をギフト割り込み用に上書きしない。
- OneSDK の raw データ依存は `normalizeOnecommeEvent()` 周辺へ閉じる。
- ギフト表示の現在状態を変更したら `saveGiftRuntimeState()` と `broadcastGiftState()` の同期を確認する。
- `v_telop_display_v1.html` 側にも必要な表示差分がある場合は、`index.html` の描画処理との差を確認する。
- `css/vtelop-common.css` は本体と補助表示の両方へ影響する。
