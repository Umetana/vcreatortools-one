# view comment heart V2 v2.0.0-dev Technical Spec

本ドキュメントは、`view_comment_heart_v2` の内部構造およびカスタマイズのための技術仕様書です。

## 1. システム構成

- **UI Framework**: Vue.js 3 (Composition API)
- **SDK**: OneSDK / VCT SDK (`vct_one_core.js`) v1.2.6-dev
- **Styling**: Vanilla CSS (CSS Variables)

## 2. フォルダ構成

- `index.html`: エントリポイント。Vueコンポーネントの構造を定義。
- `main.js`: ロジック本体。OneSDKの購読、データ解析、ハート演出のデータ生成を担当。
- `style.css`: レイアウトおよびアニメーションの定義。
- `config.js`: 初期設定ファイル。
- `config_editor.html`: 設定変更用UI。
- `lib/`: VCT SDK などの同梱ライブラリ。

## 3. ハート演出 (Heart Embrace) の仕組み

`main.js` 内でコメント追加時、`HEART_MODE` に基づいてハートの座標・遅延・サイズ等のデータをランダムに生成し、各コメントオブジェクトの `hearts` 配列に格納します。
V2 では `VCT.parseStructured(raw).event` を参照し、`event.isSupport` / `event.isMembership` / `system.isSticky` を special 判定に使用します。
YouTube自動翻訳がある場合は `parsed.translation.parts` を参照し、`COMMENT_TRANSLATION_MODE` で元文、翻訳文、両方表示を切り替えます。

## 4. イベント本文フィルター

V2では、SDKの `event.shouldShowMessage` を初期推奨値として扱い、テンプレート側の `config.js` で本文表示を上書きできます。

主な設定:

- `SHOW_EVENT_MESSAGES`
- `SHOW_EVENT_MESSAGE_SUPERCHAT`
- `SHOW_EVENT_MESSAGE_SUPERSTICKER`
- `SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT`
- `SHOW_EVENT_MESSAGE_MEMBER_JOIN`
- `SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT`
- `SHOW_EVENT_MESSAGE_GIFT_RECEIVED`

`membership_gift_received` は連続しやすいため、初期設定では本文表示OFFです。

```javascript
// main.js でのデータ生成例
heartList.push({
  id: i,
  x: Math.random() * 100, // 横位置(%)
  y: Math.random() * 100, // 縦位置(%)
  delay: Math.random() * 2, // アニメーション開始遅延(s)
  dur: 2 + Math.random() * 2, // アニメーション時間(s)
  size: ... ,
  color: ...
});
```

CSSのアニメーション (`@keyframes heart-drift`) により、これらのデータに基づいたアニメーションが実行されます。

## 5. CSS 変数連携

`main.js` の `updateStyle` 関数により、`window.CONFIG` の値が CSS カスタムプロパティ（変数）として `document.documentElement` に反映されます。これにより、CSS側で `var(--font-size)` のように設定値を参照できます。

## 5.1 ユーザー属性バッジ

VCT SDK の `parsed.user.isOwner` / `parsed.user.isModerator` を参照し、OWNER/MOD バッジを表示します。
`isOwner` が true の場合は OWNER を優先し、MOD は同時表示しません。

## 5.2 強調表示の濃度

ギフト系コメントは `GIFT_BG_OPACITY` / `GIFT_BORDER_OPACITY`、メンバー系コメントは `MEMBER_BG_OPACITY` / `MEMBER_BORDER_OPACITY` で背景と枠線の濃度を個別に調整できます。

## 6. 演出の拡張

- **新しいアニメーション**: `style.css` の `.list-enter-from` / `.list-leave-to` を変更することで、コメントの入場・退場演出をカスタマイズできます。
- **ハート以外の演出**: `main.js` の `heartList` 生成ロジックを変更し、`HEART_GLYPH` を書き換えることで、星や音符などの別演出に転用可能です。

## 7. 注意事項

- 本テンプレートは `VCT SDK` (`vct_one_core.js`) を使用しています。同梱または共有フォルダ内の `vct_one_core.js` が正しく読み込まれている必要があります。
- ハート演出はブラウザの `GPU` リソースを消費するため、`HEART_COUNT` を極端に大きくしすぎないよう注意してください。
