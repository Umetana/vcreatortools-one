# VCT SB V1 UI

`VCT_Core` が形成した IndexedDB と、`VCT_SB_V1` の localStorage 設定を参照する管理用テンプレートです。

## できること
- `supports` の一覧表示
- `users` の一覧表示
- `ranking` の一覧表示
- 検索 / 絞り込み
- 通貨別集計
- ランキングプリセットによる傾向確認
- 支援詳細 / ユーザー詳細のカード表示
- Users一覧で来訪stream数 / 最終来訪stream の簡易表示
- ユーザー詳細で来訪stream履歴の表示
- ユーザー詳細で最新支援履歴の表示
- `supports` / `users` の削除
- `VCT_SB_V1` 設定の読込 / 保存 / 初期化
- 本体表示の保存前プレビュー

## 依存
- `../_vct_core/lib/idb/idb.min.js`
- `../_vct_core/js/vct_one_core.js`
- `../_vct_core/js/vct_idb_core.js`
- `../_vct_core/js/vct_idb_common.js`
- `../_vct_core/js/vct_idb.js`
- `../VCT_SB_V1/config.js`

## ビュー構成
- `Supports`: 支援履歴
- `Users`: ユーザー一覧
- `Ranking`: ランキング確認
- `Settings`: 本体設定管理
- `State`: 未実装プレースホルダ

## Supports
主な絞り込み:
- ユーザー名
- `userKey`
- `streamId`
- `platform`
- 日付範囲
- 金額範囲
- 並び順

## Users
主な絞り込み:
- ユーザー名
- `userKey`
- `streamId`
- `platform`
- 日付範囲
- 並び順

`Users` ビューでは金額範囲は使いません。
支援関連の数値は `supports` から再集計して表示します。
`users.recentStreamIds` が保存されている場合は、来訪stream数と最終来訪streamも確認できます。

利用できる並び順:
- 新しい順 / 古い順
- ユーザー名昇順 / 降順
- 支援回数が多い順 / 少ない順
- メンギフ件数が多い順 / 少ない順

## Ranking
`Users` の集計基盤を使ったランキング確認ビューです。

主な指定項目:
- ランキング表示プリセット
- `streamId`
- 日付範囲

初期プリセット:
- 支援回数ランキング
- メンギフ件数ランキング
- 最新支援者順
- ユーザー名順
- 主要通貨金額ランキング

`主要通貨金額ランキング` では:
- 現在条件に一致する `supports` から通貨候補を自動抽出します
- 空値 / `UNKNOWN` / `SPONSORGIFT` は候補に含めません
- 選択した通貨の累計が 0 のユーザーはランキング対象外です

ユーザー詳細では以下を表示します。
- 権限フラグ
- 通貨別累計支援額
- 最終観測 / 最終支援
- 最終来訪stream / 来訪stream履歴
- 最新支援履歴

## Settings
本体設定の解決順と同じく、
1. `localStorage`
2. `config.js`

を使って現在値を表示します。

保存すると `localStorage` に書き込みます。
本体へは再読み込みで反映します。

主な設定補助:
- `startX` / `startY` / `endX` の調整
- `cardColorMode` の切替
- `cardBackgroundOpacity` の調整
- 1920x1080 想定の保存前プレビュー
- 数値入力とスライダーの併用

## 運用メモ
- OBS 内部ブラウザを想定し、詳細確認は画面内パネルで行います
- 危険操作は画面内モーダルで確認とロック解除を行います

## ライセンス
- このフォルダ内の自作コードは **MIT License** です
- ライセンス本文は `LICENSE` を参照してください
- 同梱して利用している `../_vct_core/lib/idb/idb.min.js` は外部ライブラリです
- `idb` のライセンスは `../_vct_core/lib/idb/LICENSE_idb.txt` を参照してください
- 本テンプレートは **わんコメ（OneComme）** を利用して動作します
- 使用にあたっては **わんコメの利用規約に準拠してください**
