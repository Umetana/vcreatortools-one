# VCT Core Technical Spec v0.5.0-dev

## 1. 概要

VCT Core は、わんコメ `OneSDK` から取得したコメントを解析し、VCT 共通 IndexedDB に `users` と `supports` を保存する常駐基盤テンプレートです。

v0.5.0 では、Core runtimeをVCT SDK 2.0へ移行し、SDK 1系の解析・Legacy経路を実行系から外しました。

## 2. バージョン系統

- VCT Core `v0.5.0-dev`: runtime / ui / logger / DBレコード変換を含む Coreテンプレート全体の版
- VCT SDK 2.0 `v2.0.4-dev`: Core runtimeが利用する `vct_sdk.js` の版
- VCT SDK 1系 `v1.2.7-dev`: 既存テンプレート向けに残す凍結版。Core runtimeでは読み込まない
- VCT_IDB wrapper `v0.5.0` 系: IndexedDB facade の仕様版

VCT Core 本体版と VCT_IDB wrapper 仕様版は別系統です。

## 3. モジュール構成

### `main.js`

起動専用エントリです。

- `VCT_LOGGER` 初期化
- `VCT_RUNTIME` 初期化
- `VCT_UI` 初期化
- `runtime.start()` 呼び出し

業務ロジック、DOM描画、OneSDK callback、レコード生成は持ちません。

### `js/vct_logger.js`

ログ責務を担当します。

- `info()`, `warn()`, `error()`
- 最大保持件数の制御
- `debug` 設定に応じた console 出力
- `subscribe()` によるUI通知

公開名は `window.VCT_LOGGER` です。

### `js/vct_sdk.js`

SDK 2.0の正本です。`window.VCT_SDK.normalize(raw, options)` を唯一の正規化入口として提供します。CoreはRAW保存が必要なため、1コメントにつき1回だけ `{ includeRaw: true }` で呼び出します。

### `js/vct_core_records.js`

SDK 2.0の正規化結果を既存の `users` / `supports` 保存形式へ変換します。SDKへIndexedDB固有の責務を持ち込まないためのCore専用モジュールです。

- `VCT_CORE_RECORDS.buildUserProfile(normalized, options)`
- `VCT_CORE_RECORDS.buildSupport(normalized, options)`

通貨建て支援は `event.isSupport === true` かつ `monetization.money.available === true` の場合に生成します。メンギフ送信は `membership.isGiftSender === true` かつ `membership.giftCount > 0` の場合に、`amount` を件数、`currency` を `SPONSORGIFT` として既存形式で保存します。ジュエル数は `supports.amount` へ保存しません。

### `js/vct_runtime.js`

Core runtime を担当します。

- OneSDK setup / subscribe / ready / connect
- `streamId` 解決
- コメント受信時の normalize / event判定 / record build / DB保存
- DB stats 更新
- 削除操作の実行
- runtime status の通知
- コメント受信バッチの逐次処理
- 実行中の処理済みコメントIDによる反復通知の抑制

公開名は `window.VCT_RUNTIME` です。

主なAPI:

- `init(config, options)`
- `start()`
- `getStatus()`
- `getStreamId()`
- `refreshDbStats(options)`
- `clearSupportsByCurrentStream()`
- `clearAllSupports()`
- `clearAllUsers()`
- `on(eventName, handler)`

### `js/vct_ui.js`

監視UIを担当します。

- DOM参照
- status描画
- log描画
- danger panel
- ボタンイベント登録

UIは runtime の状態を描画し、削除などの実処理は runtime API を呼びます。

公開名は `window.VCT_UI` です。

### `js/vct_idb*.js`

IndexedDB facade と内部実装です。

公開Facade `window.VCT_IDB` は維持します。

主な維持API:

- `initDB()`
- `getDefaultStreamId()`
- `saveSupport(data)`
- `getSupports(options)`
- `deleteSupport(eventKey)`
- `clearSupports(options)`
- `buildUserKey(data)`
- `saveUserProfile(data)`
- `getUserProfile(userKey)`
- `getUsers(options)`
- `clearUsers()`
- state系API

## 4. streamId

v0.3.0 では runtime が保存前に `streamId` を確定します。

優先順位:

1. `runtime.init({ runtimeStreamId })` などで渡された明示値
2. `config.js` の `streamId`
3. `VCT_IDB.getDefaultStreamId()`
4. runtime 内の最終 fallback

互換性維持のため、`VCT_IDB.normalizeSupport()` 側の fallback は残します。
運用上は runtime が `streamId` を入れてから保存する前提です。

User 保存時も runtime が同じ `streamId` を注入します。
`VCT_IDB.saveUserProfile()` は `lastSeenStreamId` と `recentStreamIds` を更新し、同一配信内の重複を除いた直近5件を保持します。

## 5. 保存フロー

1. OneSDK の `all` モードで `comments` の配列を受信
2. 受信バッチ内および実行中に処理済みのコメントIDを除外
3. バッチを1件ずつ逐次処理
4. `VCT_SDK.normalize(rawComment, { includeRaw: true })` を1回実行
5. `VCT_CORE_RECORDS.buildUserProfile(normalized, options)`
6. `VCT_IDB.saveUserProfile(userRecord)`
7. 通貨建て支援またはメンギフ送信の場合に `VCT_CORE_RECORDS.buildSupport(normalized, options)`
8. `VCT_IDB.saveSupport(supportRecord)`
9. バッチ終了後に runtime status と DB stats を1回更新

処理済みコメントIDはメモリ上に直近500件を保持します。Core再起動後の再通知については、`users` の時系列マージと `supports.eventKey` の一意性を最終的な重複・巻き戻り対策とします。

## 6. 収集範囲と保証

VCT Core は、わんコメおよび OneSDK から通知された範囲のコメント・支援イベントをベストエフォートで保存します。すべてのイベントの取得および保存は保証しません。

以下は対象外です。

- わんコメまたは配信サービスが取得できなかったイベント
- OneSDK から通知されなかったイベント
- 削除済みコメント
- わんコメ本体の保存ログを遡る一括インポート

## 7. UI

`index.html` は監視UI付きエントリとして維持します。
CSS は `style.css` に分離済みです。

## 8. 互換性

以下は維持します。

- `window.VCT_IDB` と既存Facade
- `supports` / `users` の保存構造
- VCT Core内部処理では `VCT_SDK.normalize()` の `event` / `monetization.money` を判定基準として使う
- legacy migration
- 監視UIの基本見た目

## 9. 変更履歴

- **v0.5.0-dev / SDK v2.0.3-dev**: Core runtimeを `VCT_SDK.normalize()` へ移行。DBレコード生成を `vct_core_records.js` へ分離し、1コメント1正規化へ統一。メンギフ件数は `SPONSORGIFT` として既存互換保存し、ジュエル数は通貨建て支援から除外。メンバーシップ通知の案内文を `event.announcementText` として本文から分離。
- **v0.4.0-dev**: OneSDK の既定モードを `all` に変更。コメントIDによる実行中の反復通知抑制、受信バッチの逐次処理、DB stats のバッチ単位更新を追加。Userの時刻マージをイベント時刻基準へ変更。
- **v0.3.1-dev / SDK v1.2.4-dev**: `VCT.parse().text` への `paidText` 補完を廃止。判定用途は `parseStructured().message` / `event` / `monetization` を優先する方針を明記。
- **v0.3.1-dev**: users に `lastSeenStreamId` / `recentStreamIds` を追加。runtime から User レコードへ `streamId` を注入。VCT SDK v1.2.0 の `parseCore().event` を保存判定の基準に変更。
- **v0.3.0**: runtime / ui / logger を分離。`main.js` を boot 専用化。User / Support レコード生成を `VCT` 側へ移動。`style.css` を分離。
- **v0.2**: Core監視UIとDB保守操作を追加。
- **v0.1**: `vct_common_data` 形成基盤を構築。
