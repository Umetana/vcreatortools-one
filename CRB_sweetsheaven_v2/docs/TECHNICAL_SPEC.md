# Sweets Heaven Technical Spec

## 概要

`CRB_sweetsheaven_v2` は、コメントをスイーツ演出へ変換し、累積カロリーを可視化する CommentRaid 系テンプレートです。

責務は大きく次の3層に分かれます。

- `data/config.js`
  ベーステンプレート共通設定
- `data/sweets_config.js`
  Sweets Heaven 固有設定
- `plugins/*`
  UI、ロジック、演出、マスターデータ

## 読み込み構成

`index.html` では以下の順で主要スクリプトを読み込みます。

1. `./data/config.js`
2. `../comment_raid_base_v2/js/core/engine.js`
3. `../_vct_core/js/vct_sdk.js`
4. `../comment_raid_base_v2/js/core/fx.js`
5. `../comment_raid_base_v2/js/core/script.js`

`plugins/sweets_logic.js` は `plugin_manifest.js` 経由で関連ファイルを読み込みます。

## 関連ファイル

- `data/config.js`
  ベース設定。`SAVE_PROGRESS` や `RESET_PROGRESS` もここで管理
- `data/sweets_config.js`
  固有パラメータと `window.CONFIG_RAID` ブリッジ定義
- `plugins/plugin_manifest.js`
  依存する HTML、CSS、データ、演出スクリプトのマニフェスト
- `plugins/ui.html`
  `#ui-top` `#ui-bottom` `#raid-stamp` を提供
- `plugins/style.css`
  専用UIスタイル
- `plugins/sweets_logic.js`
  状態更新、ログ、カロリー計算、ギフト補正、UI表示モード制御
- `plugins/sweets_fx.js`
  独自オーバーレイによるスイーツ落下と kcal ポップアップ
- `plugins/data/sweets_master.js`
  スイーツマスターデータ

## 状態モデル

`sweets_logic.js` で保持する主要 state は以下です。

```js
{
  level: number,
  totalCalories: number,
  displayCalories: number,
  rainbowUntil: number,
  lastRainbowMilestone: number,
  uiDisplayMode: string,
  ui: {
    status: {
      title: string,
      label: string,
      progress: number,
      text: string,
      color: null
    }
  }
}
```

`level` は互換性のため残っていますが、実質的な進行は `totalCalories` ベースです。

## 永続化

- 保存キー: `comment_sweets_totalCalories`
- `window.CONFIG.SAVE_PROGRESS !== false` のときのみ保存
- `window.CONFIG.RESET_PROGRESS === true` のとき初期化

保存タイミングは `afterComment` です。

## イベントモデル

`afterCalculateDamage` で生成する Sweets Heaven 独自イベントは次の形です。

```js
{
  type: "sweets",
  motion: "sweets_fall",
  userName: string,
  sweetId: string,
  sweetName: string,
  emoji: string,
  imageSrc: string,
  kcal: number,
  isGift: boolean,
  giftAmount: number,
  spawnCount: number,
  totalGain: number,
  log?: string
}
```

このイベントが FX とログの共通入力になります。

## ロジック仕様

### スイーツ抽選

- マスターデータは `window.SWEETS_MASTER`
- `spawnWeight` を基準に重み付き抽選
- 現状は `meatfestival` よりシンプルで、文字数による抽選補正は入れていません

### カロリー計算

- `baseKcal` と `variance` からランダムレンジを計算
- コメント文字数ボーナスを最大120kcalまで加算
- 最終値は整数化し、最低1kcal

### ギフト補正

- `commentData.event.isSupport` を利用し、メンギフ受取はギフト補正対象外
- 価格は `ENGINE.extractGiftPrice(commentData)` または `commentData.monetization.money.amount` を使用
- 金額帯に応じて `normal` `small` `medium` `large` `premium` を決定
- 各 tier は `GIFT_TIERS` の `multiplierMin` `multiplierMax` `spawnMin` `spawnMax` を使用

### ログ生成

`LOG_FORMAT === "battle_1line"` のとき、現在は以下の形式です。

- 通常:
  `ユーザー のコメントが スイーツ名 に変化！`
- ギフト:
  `ユーザー のコメントが スイーツ名 に変化！ GIFT_LOG_SUFFIX`

`GIFT_LOG_SUFFIX` が空なら追加文言は付きません。

### ゲージ更新

- ゲージ進捗は `totalCalories % GAUGE_CYCLE_CALORIES`
- ちょうど区切り値のときは進捗1として扱う
- `GAUGE_PHASE_COLORS` を周回インデックスで参照して色相を切り替える

### 虹演出

- `RAINBOW_MILESTONE_CALORIES` を跨いだとき `rainbowUntil` を更新
- 指定時間中は `#boss-panel` に `sweets-rainbow` クラスを付与

## UI表示モード

`sweets_logic.js` が `#ui-top` と `#ui-bottom` の `display` を直接制御します。

対応モード:

- `full`
- `top_only`
- `bottom_only`
- `effect_only`

`UI_TOGGLE_KEY` が設定されている場合、`window.addEventListener("keydown", ...)` でトグルを受け付けます。

注意点:

- 比較は `event.key` ベース
- `"F8"` はファンクションキー `F8`
- 入力欄や `contentEditable` では反応しない
- 巡回順は `UI_TOGGLE_SEQUENCE`

## FX仕様

### オーバーレイ

`sweets_fx.js` は `#sweets-fx-layer` を `body` 直下に動的生成します。

主な特性:

- `position: fixed`
- `inset: 0`
- `pointer-events: none`
- `z-index: 9500`

### スイーツインスタンス

各イベントは `spawnCount` 回だけスイーツインスタンスを生成します。

通常パラメータ:

- 生成位置は画面上部のランダム範囲
- 下降先は `DESPAWN_FLOOR_RATIO`
- 横揺れは `SWAY_AMOUNT`
- 落下距離は `FALL_DISTANCE_MIN/MAX`
- サイズは `SWEET_BASE_SIZE` と scale から計算

ギフト差分:

- `GIFT_SWEET_SCALE_MIN/MAX` を使用
- `spawnCount` が増える

### 画像対応

`SWEET_DISPLAY_MODE` が `image` の場合は、`event.imageSrc` を使って `<img>` を描画します。
`SWEET_DISPLAY_MODE` が `emoji` の場合は、`event.emoji` を使って文字描画します。

`resolveSweetImageSrc()` のルール:

- `http://` `https://` `./` `../` `/` で始まる場合はそのまま使用
- それ以外は `./assets/food/${file}` に解決

設計上の整理:

- 通常運用は `image` モードを想定
- 画像が存在しない、または破損している場合は描画失敗時の事故を避ける方向で扱う
- 実行環境によっては絵文字フォールバックの見え方に差が出る可能性がある
- OBS などブラウザソース差分が気になる場合は、明示的に `emoji` モードへ切り替えて運用する

### ポップアップ

スイーツが終端に達すると `+xxx kcal` ポップアップを生成します。

- フォントサイズは `KCAL_POPUP_FONT_SIZE`
- 約0.95秒で上昇しながらフェード

## 既知の設計意図

- 攻略性よりも配信演出を優先
- ギフト差分は「量」「サイズ」「文言」で表現
- UIを消してもロジックとFXは動く設計
- 画像モードと絵文字モードを用途に応じて切り替えられる設計
- 画像欠損時の見え方は実行環境差を考慮する

## 変更履歴メモ

現時点で反映済みの主な追加要素:

- 画像ファイル表示対応
- 画像/絵文字表示モード対応
- kcal ポップアップの文字サイズ設定
- UI表示モードとトグルキー対応
- ギフトログ追加メッセージ対応
- UI状態の初期化ガード追加
