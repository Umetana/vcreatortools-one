# Custom Base Template V2.7 Technical Spec

本ドキュメントは、`custom_base_template_V2_7_dev` の内部構造と、画面内設定パネルの試験仕様をまとめた技術メモです。

## 1. システム構成

- UI Framework: Vue.js 3 (Composition API)
- SDK: OneSDK / VCT SDK (`vct_one_core.js`) v1.2.6-dev
- Styling: Vanilla CSS + CSS Variables

## 2. フォルダ構成

- `index.html`: エントリポイント。Vueテンプレートとライブラリ読み込みを定義。
- `main.js`: OneSDK購読、VCT解析、表示用データ整形、コメント追加/削除を担当。
- `style.css`: コメントレイアウト、ギフト/メンバー/固定コメントの見た目、入退場アニメーションを定義。
- `config.js`: 実際に読み込まれる設定。
- `config_default.js`: 設定エディタのデフォルト復元用設定。
- `config_editor.html`: 設定変更用UI。
- `settings/config-runtime.js`: default、config.js、localStorageを合成して最終設定を確定。
- `settings/settings-launcher.js`: 右下ギアと設定UIの遅延読み込みを担当。
- `settings/settings-schema.js`: 画面内設定パネルの項目定義。
- `settings/settings-panel.js`: 設定パネルDOM、ファイル読込、localStorage保存を担当。
- `settings/settings-panel.css`: 設定パネル専用スタイル。ギアクリック時に読み込む。
- `lib/vct_one_core.js`: VCT SDK v1.2.6-dev。
- `lib/VCT_SDK_SPEC.md`: 同梱SDKの仕様メモ。

## 3. データ処理

`main.js` の `parseComment()` は、利用可能であれば `VCT.parseStructured(raw)` を使います。

主な表示データ:

- ユーザー: `parsed.user.displayName` / `parsed.user.profileImage` / `parsed.user.badges` / `parsed.user.isOwner` / `parsed.user.isModerator`
- 本文: `parsed.message.parts`
- YouTube自動翻訳: `parsed.translation`
- イベント: `parsed.event.kind` / `parsed.event.displayLabel` / `parsed.event.isSupport` / `parsed.event.isMembership`
- 固定コメント: `parsed.system.isSticky`
- 強調色: `parsed.style.colorStr`

OWNER/MOD は `buildUserFlags()` で表示用データに変換します。`isOwner` が true の場合は OWNER を優先し、MOD は同時表示しません。
`COMMENT_TRANSLATION_MODE` は `original` / `translated` / `both` を受け取り、翻訳が無い場合は元文表示へフォールバックします。

`VCT.parseStructured()` が無い環境では、旧 `VCT.parse(raw)` を使って最低限の表示にフォールバックします。

## 4. 設定ランタイム

`index.html` は以下の順序で設定スクリプトを読み込みます。

1. `config_default.js`
2. `config.js`
3. `settings/config-runtime.js`
4. `main.js`

`config-runtime.js` は次の順序でオブジェクトをマージし、最終結果を `window.CONFIG` に設定します。

```javascript
window.CONFIG = {
  ...window.CONFIG_DEFAULT,
  ...configFileValues,
  ...localStorageOverrides
};
```

localStorageには全設定ではなく、`config_default.js + config.js` の基準値との差分だけを保存します。新しい設定項目が追加された場合も、保存済み差分に含まれなければ新しい基準値へ追従します。

保存キーはテンプレートフォルダ名から自動生成します。

```text
vct.template-settings.<template-folder>.v1
```

フォーク後にフォルダ名を変更すると別の保存領域になるため、他テンプレートの設定と衝突しません。

BroadcastChannel APIが利用できる環境では、同じテンプレートを開いている別画面へ設定更新通知を送ります。チャンネル名もテンプレートフォルダ名から生成します。

```text
vct.template-settings.<template-folder>.channel
```

設定パネルでlocalStorageへ保存した場合は `settings-saved`、localStorage設定を削除した場合は `settings-cleared` を送信します。受信側は送信元IDが自分自身ではない場合に `window.location.reload()` を実行します。BroadcastChannelが利用できない環境では通知だけ無効になり、設定保存と自画面の再読み込みは従来通り動作します。

## 5. 画面内設定パネル

`settings-launcher.js` だけは起動時に読み込みます。ギアをクリックするまでは `settings-schema.js`、`settings-panel.js`、`settings-panel.css` を読み込みません。

URLクエリに `settings=1`、`settings=true`、`settings=open` のいずれかを指定した場合は、起動時にギアクリックと同じ処理を自動実行し、設定パネルを開きます。これはローカルサーバー運用時に、OBSの表示用ブラウザソースとは別にカスタムブラウザドックへ設定用URLを登録する用途を想定しています。

設定の確定反映は、localStorageへ保存後にページを再読み込みして行います。

V2.7試験版では設定パネルから `vct-settings-preview` カスタムイベントを送信し、`main.js` 内のリアクティブ設定へ一時反映します。パネルを閉じると `vct-settings-reset-preview` を送信して起動時設定へ戻します。localStorageへの確定保存とページ再読み込みという基本動作は維持します。

主にCSS変数やVueの表示条件で制御される項目は即時プレビューできます。本文上限、イベント本文フィルター、自動非表示タイマーなど、コメント受信時の正規化・タイマー生成に関わる項目は、新規コメントまたは保存後再読み込みで完全適用されます。

通常の `<input type="file">` を使うため、任意の `config.js` をフォームへ読み込めます。ただしブラウザから元ファイルへ直接上書きは行いません。

### 透明表示

通常コメント枠は以下の設定を使用します。

- `BASE_BORDER_COLOR`
- `BASE_BORDER_OPACITY`
- `BASE_BORDER_WIDTH`
- `SYSTEM_BORDER_OPACITY`

`BG_GLASS` を透明色にし、各背景・枠線濃度を `0`、`SHADOW_SOFT` を `none` にすると、別ソースの画像などを背景として重ねやすい表示になります。設定パネルの `背景・枠を透明` はこの組み合わせを一括でフォームへ読み込みます。

## 6. イベント本文フィルター

`SHOW_EVENT_MESSAGES` と `SHOW_EVENT_MESSAGE_*` で、イベント本文の表示を制御します。

- `SHOW_EVENT_MESSAGE_SUPERCHAT`
- `SHOW_EVENT_MESSAGE_SUPERSTICKER`
- `SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT`
- `SHOW_EVENT_MESSAGE_MEMBER_JOIN`
- `SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT`
- `SHOW_EVENT_MESSAGE_GIFT_RECEIVED`

イベント本文を非表示にしても、メタラベルは表示されます。

## 6.1 強調表示の濃度

ギフト系コメントは `GIFT_BG_OPACITY` / `GIFT_BORDER_OPACITY`、メンバー系コメントは `MEMBER_BG_OPACITY` / `MEMBER_BORDER_OPACITY` で背景と枠線の濃度を個別に調整できます。

## 7. フォーク時の変更ポイント

- `template.json` のテンプレート名と説明
- `index.html` のタイトル、DOM構造、追加レイヤー
- `main.js` の `normalizeComment()` 後の表示用データ加工
- `style.css` の配色、レイアウト、アニメーション
- `config.js` / `config_default.js` / `config_editor.html` / `settings/settings-schema.js` の設定項目

演出を追加する場合は、コメントオブジェクトに追加データを持たせ、`index.html` で描画し、`style.css` でアニメーションを定義する構成が扱いやすいです。
