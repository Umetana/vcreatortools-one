# VCT SB V1(旧VCT Support Banner)

投げ銭付きコメントを横スクロールカードで表示する OBS 向けテンプレートです。

## 概要
- わんコメから届くコメントを受け取り、支援イベントだけをカード表示します
- データ保存は `VCT_Core` が担当し、本体は `vct_common_data.supports` を読んで表示します
- 起動中に届いた支援イベントは表示へ即時追加しますが、本体からDB保存は行いません
- 表示設定は `config.js` を初期値とし、保存済み設定があれば `localStorage` を優先します
- OBS ソース内での表示位置と表示幅を調整できます

## 依存
- OneSDK
- `../_vct_core/js/vct_one_core.js`
- `../_vct_core/lib/idb/idb.min.js`
- `../_vct_core/js/vct_idb_core.js`
- `../_vct_core/js/vct_idb_common.js`
- `../_vct_core/js/vct_idb.js`

## 設定
設定の初期値は `config.js` にあります。

本体は以下の順で設定を解決します。
1. `localStorage`
2. `config.js`
3. `main.js` 内のデフォルト値

保存キーは通常 `vct_sb_v1.settings.v1` です。

## 主な設定項目
- `title`: タイトル帯の文言
- `startX` / `startY` / `endX`: 表示領域の左端・上端・右端
- `streamId`: 対象配信 ID。未入力なら当日 `YYYYMMDD`
- `limit`: 表示件数
- `displayOrder`: `oldest_first` / `newest_first`
- `showIcon`
- `titleVisible`
- `amountVisible`
- `messageVisible`
- `maxMessageLength`
- `titleHeight`
- `viewportHeight`
- `cardWidth`
- `cardGap`
- `scrollSpeed`
- `cardColorMode`: `soft` / `contrast`
- `cardBackgroundOpacity`: カード色の不透明度
- `emptyStateText`
- `resetStreamOnLoad` / `resetAllOnLoad` は互換用に残っていますが、V1本体では削除操作に使いません

## 表示仕様メモ
- カードは表示領域の右端から入り、左方向へループします
- `startX` / `startY` / `endX` は「移動開始点」ではなく「表示領域」を決める設定です
- `cardColorMode`
  - `soft`: ギフト色ベースで背景になじみやすい見え方
  - `contrast`: ギフト色と暗色寄りの二色で強めグラデーション、見出し感を出しやすい見え方
- `cardBackgroundOpacity` はカード色そのものの不透明度です

## 支援種別
- `sponsorgift` は金額ではなく「件数」として表示します

## データ保存
`VCT_SB_V1` 本体はDB保存を担当しません。

- `supports`: `VCT_Core` が形成した支援イベント履歴を表示用に読む
- `users`: 本体では直接使わない。管理UIやランキング側で利用する
- 起動中に届いたコメントは `VCT.parseCore` / `event.isSupport` / `VCT.buildSupportRecord` で支援レコード化し、即時表示だけ行います
- 支援履歴の永続化は保存担当テンプレート / Core Runtime 側で行います
- 本体を再読み込みした後に表示されるのは、同じブラウザ環境の `vct_common_data.supports` に保存済みの履歴です

OBS と Chrome は IndexedDB が別管理です。Chromeで本体とUIを確認する場合は、Chrome側でも保存担当の `VCT_Core` を開いておく必要があります。

IndexedDB の共通仕様は `../_vct_core/js/VCT_IDB_SPEC.md` を参照してください。

## 運用メモ
- OBS では本体をブラウザソースとして追加するだけで使う想定です
- 設定変更は `VCT_SB_V1_UI` 側から行い、本体は再読み込みで反映する運用を前提にしています

## ライセンス
- このフォルダ内の自作コードは **MIT License** です
- ライセンス本文は `LICENSE` を参照してください
- 同梱して利用している `../_vct_core/lib/idb/idb.min.js` は外部ライブラリです
- `idb` のライセンスは `../_vct_core/lib/idb/LICENSE_idb.txt` を参照してください
- 本テンプレートは **わんコメ（OneComme）** を利用して動作します
- 使用にあたっては **わんコメの利用規約に準拠してください**
