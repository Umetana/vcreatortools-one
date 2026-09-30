# CommentFX Base v2.6

CommentFX Base v2.6 は、わんコメ用のコメント演出テンプレートを作るためのベーステンプレートです。

OneSDK からコメントを受け取り、VCT SDK (`vct_one_core.js`) で正規化し、`engine.js` で演出イベントに変換し、`fx.js` で描画します。

## 特徴

- VCT SDK (`vct_one_core.js`) v1.2.1 対応
- `VCT.parseStructured()` を利用した structured event 方式
- 旧来の `text`, `user`, `hasGift`, `membership` などの互換フィールドも維持
- `event.kind` によるスパチャ、メンバーシップ、ギフト系イベント分類に対応
- Canvas2D の最小FX実装つき
- 派生テンプレートでは主に `config.js`, `engine.js`, `fx.js`, `style.css` を編集すればよい

## 向いている用途

- コメントを弾幕、落下、浮遊、爆発などの演出に変換するテンプレート
- メンバーシップ加入、マイルストーン、ギフトなど、イベント種別ごとに演出を変えるテンプレート
- 既存の OneSDK 接続やコメント正規化を流用して、描画だけ作り替えたいテンプレート

## 基本構成

```txt
CommentFX_Base_v2_6/
  index.html
  config.js
  parser.js
  engine.js
  fx.js
  script.js
  style.css
  vct-loader.js
  _lib/vct_one_core.js
```

役割:

- `config.js`: 利用者が調整する設定
- `parser.js`: raw comment を CommentFX 用データへ正規化
- `engine.js`: commentData から FX event を作る
- `fx.js`: FX event を描画する
- `script.js`: OneSDK -> Parser -> Engine -> FX の橋渡し
- `vct-loader.js`: VCT SDK と各アプリスクリプトの読み込み
- `_lib/vct_one_core.js`: 同梱 VCT SDK

## 派生テンプレートの作り方

1. `CommentFX_Base_v2_6` フォルダをコピーする
2. フォルダ名、`index.html` の title、必要なら `template.json` を変更する
3. `config.js` に設定項目を追加する
4. `engine.js` でどのコメント/イベントを演出するか決める
5. `fx.js` と `style.css` で描画を作る

最小改造では、`engine.js` と `fx.js` だけ差し替えれば新しいテンプレートを作れます。

## event.kind の利用

v2.6 では、`comment.event?.kind` を見てイベント種別を判定できます。

主な値:

- `normal`: 通常コメント
- `superchat`: スパチャ
- `supersticker`: スーパーステッカー
- `membership_gift`: メンバーシップギフト購入
- `membership_gift_received`: メンバーシップギフト受取
- `member_join`: メンバーシップ加入
- `member_milestone`: メンバーシップ継続 / マイルストーン
- `membership_event`: その他メンバーシップイベント

例:

```js
function onComment(comment) {
  if (comment.event?.kind !== "member_join") return [];

  return [{
    type: "welcome",
    user: comment.user,
    iconUrl: comment.profileImage,
    message: comment.membershipDetail?.sub || comment.text
  }];
}
```

## commentData の主なフィールド

従来互換:

- `id`
- `text`
- `user`
- `profileImage`
- `badges`
- `parts`
- `imgUrls`
- `color`
- `colorStr`
- `hasGift`
- `giftType`
- `membership`
- `raw`

v2.6 追加:

- `structured`
- `event`
- `monetization`
- `membershipDetail`
- `message`
- `legacy`
- `service`
- `system`
- `style`
- `userDetail`

## デバッグ

`config.js` の `DEBUG` を `true` にするか、URLに `?debug=1` を付けると、解析結果とイベントが console に出ます。

```js
DEBUG: true
```

また、デバッグ中は `D` キーでデフォルトコメント表示のON/OFFを切り替えられます。

## 注意

- `parser.js` は `VCT.parseStructured()` を優先します。VCT SDK が読み込めない場合は legacy fallback で最低限のデータを作ります。
- 派生テンプレートで `_lib/vct_one_core.js` を差し替える場合は、`parseStructured()` と `event.kind` の互換性を確認してください。
