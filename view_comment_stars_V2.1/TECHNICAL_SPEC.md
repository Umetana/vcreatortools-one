# View Comment Stars V2.1 技術仕様

本ドキュメントは、`view_comment_stars_V2.1` の内部構造と星降り演出の実装メモです。

## 1. システム構成

- UI Framework: Vue.js 3 (Composition API)
- SDK: OneSDK / VCT SDK (`vct_sdk.js`) v2.0.3-dev
- Styling: Vanilla CSS + CSS Variables

## 2. フォルダ構成

- `index.html`: Vueテンプレートとライブラリ読み込みを定義。
- `main.js`: OneSDK購読、VCT解析、表示用データ整形、星演出データ生成を担当。
- `style.css`: コメントレイアウト、ギフト/メンバー/固定コメントの見た目、星降りアニメーションを定義。
- `config.js`: 実際に読み込まれる設定。
- `config_default.js`: 設定エディタのデフォルト復元用設定。
- `config_editor.html`: 設定変更用UI。
- `settings/config-runtime.js`: default、config.js、localStorageを合成して最終設定を確定。
- `settings/settings-launcher.js`: 右下ギアと設定UIの遅延読み込みを担当。
- `settings/settings-schema.js`: 画面内設定パネルの項目定義。
- `settings/settings-panel.js`: 設定パネルDOM、ファイル読込、localStorage保存を担当。
- `settings/settings-panel.css`: 設定パネル専用スタイル。ギアクリック時に読み込む。
- `lib/vct_sdk.js`: VCT SDK v2.0.3-dev。

## 3. データ処理

`main.js` の `parseComment()` は、`VCT_SDK.normalize(raw)` を唯一の正規化入口として使います。SDK 1系へのフォールバックは行いません。

主な表示データ:

- ユーザー: `parsed.user.displayName` / `parsed.user.profileImage` / `parsed.user.badges` / `parsed.user.roles.owner` / `parsed.user.roles.moderator`
- 本文: `parsed.message.parts`
- YouTube自動翻訳: `parsed.message.translation.parts`
- イベント: `parsed.event.kind` / `parsed.event.displayLabel` / `parsed.event.isSupport` / `parsed.event.isMembership`
- 固定コメント: `parsed.system.sticky`
- 強調色: `parsed.style.colorString`

OWNER/MOD は `buildUserFlags()` で表示用データに変換します。OWNERの場合はOWNERを優先し、MODは同時表示しません。
`COMMENT_TRANSLATION_MODE` は `original` / `translated` / `both` を受け取り、翻訳がない場合は元文表示へフォールバックします。

ギフト系コメントは `GIFT_BG_OPACITY` / `GIFT_BORDER_OPACITY`、メンバー系コメントは `MEMBER_BG_OPACITY` / `MEMBER_BORDER_OPACITY` で背景と枠線の濃度を個別に調整できます。

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

localStorageには全設定ではなく、`config_default.js + config.js` の基準値との差分だけを保存します。保存キーはテンプレートフォルダ名から自動生成します。

```text
vct.template-settings.<template-folder>.v1
```

## 5. 画面内設定パネル

`settings-launcher.js` だけは起動時に読み込みます。ギアをクリックするまでは `settings-schema.js`、`settings-panel.js`、`settings-panel.css` を読み込みません。

設定の確定反映は、localStorageへ保存後にページを再読み込みして行います。
設定パネルから `vct-settings-preview` カスタムイベントを送信し、`main.js` 内のリアクティブ設定へ一時反映します。パネルを閉じると `vct-settings-reset-preview` を送信して起動時設定へ戻します。

CSS変数やVueの表示条件に加え、本文上限、イベント本文フィルター、星粒の生成条件も表示中コメントへプレビューできます。自動非表示タイマーは新規コメントまたは保存後再読み込みで完全適用されます。

### 透明表示

通常コメント枠は以下の設定を使用します。

- `BASE_BORDER_COLOR`
- `BASE_BORDER_OPACITY`
- `BASE_BORDER_WIDTH`
- `SYSTEM_BORDER_OPACITY`

`BG_GLASS` を透明色にし、各背景・枠線濃度を `0`、`SHADOW_SOFT` を `none` にすると、別ソースの画像などを背景として重ねやすい表示になります。設定パネルの `背景・枠を透明` はこの組み合わせを一括でフォームへ読み込みます。

## 6. 星降り演出

コメント追加時に `buildStars(comment)` が `STAR_MODE` を参照し、星データを生成します。

- `gift`: `comment.isSupport` のときだけ表示
- `special`: `comment.isSpecial` のとき表示
- `always`: すべてのコメントで表示
- `off`: 表示しない

生成した星データは各コメントの `stars` 配列に格納し、`index.html` の `.cmt__stars` レイヤーで描画します。

`STAR_DIRECTION` は `down-right` / `down-left` / `random` に対応します。CSSの `@keyframes star-shower` で、コメント上部から斜めに落下しながら明滅・軽い色相変化を行います。

## 7. 調整ポイント

- 星を増やす: `STAR_COUNT`
- 色味を変える: `STAR_COLORS`
- 向きを変える: `STAR_DIRECTION`
- 派手にする: `STAR_SIZE_MAX` と `STAR_COUNT` を上げる
- ゆっくり降らせる: `STAR_DURATION_MIN` / `STAR_DURATION_MAX` を上げる
- 密度を散らす: `STAR_DELAY_MAX` を上げる
