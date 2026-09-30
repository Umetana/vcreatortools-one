# VCT Core

`_vct_core` は、VCT 系テンプレートで共有する IndexedDB を形成・保守する常駐基盤テンプレートです。

## 現在の版

- VCT Core: `v0.5.0-dev`
- VCT SDK 2.0 (`vct_sdk.js`): `v2.0.4-dev`
- VCT_IDB wrapper 仕様: `v0.5.0` 系由来

`VCT_IDB` の仕様版と VCT Core 本体版は別系統です。
`VCT_IDB_SPEC.md` の `v0.5.0` は、旧 `__shared` 側の IndexedDB wrapper 仕様を引き継いだものです。

## 構成

- `index.html`: 監視UI付きエントリ
- `style.css`: 監視UIスタイル
- `config.js`: Core 起動設定
- `main.js`: logger / runtime / ui の boot
- `js/vct_sdk.js`: SDK 2.0の正本。`normalize()` によるコメント正規化
- `js/vct_core_records.js`: SDK 2.0正規化結果からIndexedDB保存レコードを生成
- `js/vct_runtime.js`: OneSDK購読、streamId解決、DB保存フロー
- `js/vct_ui.js`: 監視UI描画、ボタン操作、danger panel
- `js/vct_logger.js`: ログ保持、console出力、UI通知
- `js/vct_idb*.js`: IndexedDB facade と内部実装

## v0.5.0 の要点

- `main.js` を boot 専用へ縮小
- runtime / ui / logger を分離
- SDK 1系 `vct_one_core.js` の読み込みを終了し、SDK 2.0へ一本化
- 1コメントにつき `VCT_SDK.normalize()` を1回だけ実行
- User / Supportレコード生成をCore専用モジュールへ分離
- メンギフ送信数を `SPONSORGIFT` の件数として既存形式で保存
- ジュエル数は通貨建て支援履歴から除外
- `streamId` は runtime で確定し、保存前にレコードへ注入
- `window.VCT_IDB` の既存Facadeは維持
- OneSDK の既定モードを `all` へ変更
- コメントIDによる反復通知抑制と受信バッチの逐次処理を追加
- Userプロフィールをイベント時刻基準でマージし、古い再送による巻き戻りを防止
- DB stats の更新をコメント単位から受信バッチ単位へ変更

## SDK方針

- VCT Core runtime は `vct_sdk.js` の `VCT_SDK.normalize()` のみを使用します。
- `vct_one_core.js` v1.2.7-dev はSDK 1系の凍結版として残しますが、VCT Coreからは読み込みません。
- SDK 2.0の仕様は [js/VCT_SDK_SPEC_2.md](./js/VCT_SDK_SPEC_2.md) を参照してください。
- v1.2.3 のLegacy互換版は `../__archive/vct_sdk/` に退避しています。

## コメント収集方針

- 常駐収集基盤として OneSDK の `all` モードを既定値にします。
- OneSDK から通知されたコメントをベストエフォートで保存し、全イベントの取得・保存は保証しません。
- わんコメ本体の保存ログを遡って一括インポートする機能は対象外です。
- `all` モードの反復通知は実行中の処理済みコメントIDで抑制し、受信バッチを逐次処理します。

詳細は [VCT_CORE_SPEC.md](./VCT_CORE_SPEC.md) を参照してください。
