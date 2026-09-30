# Custom Base Template V2 v2.0.0-dev

VCT SDK (`vct_one_core.js`) v1.2.1 の `parseStructured()` / `event` レイヤーに対応した、わんコメ用カスタムテンプレートのベースです。

V2世代のコメント表示テンプレートを元に、固有演出を外し、コメント表示・イベント分類・設定エディタ・VCT SDK 同梱構成を新規テンプレート開発へ流用しやすい形に整理しています。

## 主な機能

- Vue 3 + OneSDK によるコメント購読
- VCT SDK v1.2.1 の `parseStructured()` 対応
- 通常コメント、スパチャ、Super Sticker、メンバーシップ、メンギフ送信/受取、固定コメントの基本表示
- ユーザー名、アイコン、バッジ、OWNER/MOD、イベントラベル、本文パーツの分離表示
- イベント種別ごとの本文表示フィルター
- `config_editor.html` による `config.js` 編集
- 旧 `VCT.parse()` への最低限のフォールバック

## 使い方

1. `custom_base_template_V2` フォルダをコピーして、新しいテンプレート名に変更します。
2. `template.json` の `name` / `description` を変更します。
3. `index.html` / `main.js` / `style.css` を元に、固有の見た目や演出を追加します。
4. 設定項目を増やす場合は、`config.js` / `config_default.js` / `config_editor.html` の `CONFIG_SCHEMA` を合わせて更新します。

## 開発メモ

- コメント本文は `parsed.message.parts` を優先して表示します。
- 金額、メンバーシップ、固定コメントなどの情報は `parsed.event` / `parsed.system` からメタラベルへ分離します。
- CSS カスタムプロパティは `main.js` の `updateStyle()` で `window.CONFIG` から反映します。
- `lib/vct_one_core.js` はこのテンプレートに同梱しています。共有化する場合は `index.html` の読み込みパスを調整してください。

## 設定エディタについて

`config_editor.html` は設定値の編集と `config.js` の生成に使えます。
わんコメのカスタムテンプレート置き場やブラウザのセキュリティ制限により、直接読み込み・上書き保存が使えない場合があります。
その場合は `config.jsをダウンロード` で生成したファイルを、テンプレートフォルダ内の `config.js` と入れ替えてください。

## ライセンス

MIT LICENSE

本テンプレートは改造・再配布自由です。
