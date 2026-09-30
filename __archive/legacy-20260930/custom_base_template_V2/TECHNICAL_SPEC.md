# Custom Base Template V2 Technical Spec

本ドキュメントは、`custom_base_template_V2` の内部構造と、新しいわんコメカスタムテンプレートへフォークする際の技術メモです。

## 1. システム構成

- UI Framework: Vue.js 3 (Composition API)
- SDK: OneSDK / VCT SDK (`vct_one_core.js`) v1.2.1
- Styling: Vanilla CSS + CSS Variables

## 2. フォルダ構成

- `index.html`: エントリポイント。Vueテンプレートとライブラリ読み込みを定義。
- `main.js`: OneSDK購読、VCT解析、表示用データ整形、コメント追加/削除を担当。
- `style.css`: コメントレイアウト、ギフト/メンバー/固定コメントの見た目、入退場アニメーションを定義。
- `config.js`: 実際に読み込まれる設定。
- `config_default.js`: 設定エディタのデフォルト復元用設定。
- `config_editor.html`: 設定変更用UI。
- `lib/vct_one_core.js`: VCT SDK v1.2.1。
- `lib/VCT_SDK_SPEC.md`: 同梱SDKの仕様メモ。

## 3. データ処理

`main.js` の `parseComment()` は、利用可能であれば `VCT.parseStructured(raw)` を使います。

主な表示データ:

- ユーザー: `parsed.user.displayName` / `parsed.user.profileImage` / `parsed.user.badges` / `parsed.user.isOwner` / `parsed.user.isModerator`
- 本文: `parsed.message.parts`
- イベント: `parsed.event.kind` / `parsed.event.displayLabel` / `parsed.event.isSupport` / `parsed.event.isMembership`
- 固定コメント: `parsed.system.isSticky`
- 強調色: `parsed.style.colorStr`

OWNER/MOD は `buildUserFlags()` で表示用データに変換します。`isOwner` が true の場合は OWNER を優先し、MOD は同時表示しません。

`VCT.parseStructured()` が無い環境では、旧 `VCT.parse(raw)` を使って最低限の表示にフォールバックします。

## 4. イベント本文フィルター

`SHOW_EVENT_MESSAGES` と `SHOW_EVENT_MESSAGE_*` で、イベント本文の表示を制御します。

- `SHOW_EVENT_MESSAGE_SUPERCHAT`
- `SHOW_EVENT_MESSAGE_SUPERSTICKER`
- `SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT`
- `SHOW_EVENT_MESSAGE_MEMBER_JOIN`
- `SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT`
- `SHOW_EVENT_MESSAGE_GIFT_RECEIVED`

イベント本文を非表示にしても、メタラベルは表示されます。

## 5. フォーク時の変更ポイント

- `template.json` のテンプレート名と説明
- `index.html` のタイトル、DOM構造、追加レイヤー
- `main.js` の `normalizeComment()` 後の表示用データ加工
- `style.css` の配色、レイアウト、アニメーション
- `config.js` / `config_default.js` / `config_editor.html` の設定項目

演出を追加する場合は、コメントオブジェクトに追加データを持たせ、`index.html` で描画し、`style.css` でアニメーションを定義する構成が扱いやすいです。
