# V-Creator Tools: OneComme Core SDK (VCT) Technical Spec v1.2.7-dev

## 1. 概要
`vct_one_core.js` は、わんコメの `OneSDK` から送られてくる生データを、テンプレート開発で扱いやすい形式に解析・整形するための共有ライブラリです。
`DOMParser` による絵文字の分離、色の優先順位判定、システムメッセージの補完などを自動で行います。

## 2. 導入方法
テンプレートの `index.html` の `onesdk.js`（および `config.js`）の後、メインスクリプト（`main.js` 等）の前に読み込みます。

```html
<script src="../__origin/js/onesdk.js"></script>
<script src="./config.js"></script>
<!-- SDKの読み込み -->
<script src="../__shared/js/vct_one_core.js"></script>
<script src="./main.js"></script>
```

## 3. API リファレンス

### `window.VCT.parse(rawComment)`
OneSDKの `comments` アクション等で受け取った生のコメントオブジェクトを解析します。

**引数:**
- `rawComment` (Object): OneSDKから渡されるコメント1件分のデータ。

**戻り値:**
解析済みの `CommentObject`。構造は以下の通りです。

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | String | ユニークID（OneSDKのID優先、なければ自動生成） |
| `user` | String | 表示名（displayName > name） |
| `profileImage` | String | プロフィールアイコンのURL |
| `badges` | Array | メンバーバッジ等の配列 |
| `text` | String | 画像を除外した純粋なテキスト本文 |
| `parts` | Array | テキストと絵文字を分解した配列（後述） |
| `imgUrls` | Array | メッセージに含まれる画像URLのリスト |
| `vctCommand` | Object | 先頭 `!command` の抽出結果。既存本文は変更せず補助情報として付与 |
| `giftType` | String | 支援ギフト種別。`resolveSupportGift()` の `type` を Legacy 互換オブジェクトにも付与 |
| `giftLabel` | String | SuperSticker 等のギフト内容名。本文 `text` には混ぜない |
| `giftImageUrl` | String | SuperSticker 等のギフト画像URL |
| `color` | Object | 解析された色（`{r, g, b}`） |
| `colorStr` | String | `rgb(255, 255, 255)` 形式の色文字列 |
| `hasGift` | Boolean | ギフト・スパチャ判定 |
| `isSticky` | Boolean | 固定コメント判定 |
| `membership` | Boolean | メンバーシップ関連判定 |
| `isOwner` | Boolean | 配信者（オーナー）判定 [NEW] |
| `isModerator` | Boolean | モデレーター判定 [NEW] |
| `raw` | Object | 解析前の生データ |

### `CommentObject.parts` の構造
リスト表示などで「テキストと絵文字を正しい並び順で出したい」場合に使用します。
```js
[
  { type: 'text', content: 'こんにちは！' },
  { type: 'emoji', url: 'https://...', alt: 'emoji_smile', isSticker: false },
  { type: 'emoji', url: 'https://...', alt: 'test_sticker', isSticker: true }
]
```

### `CommentObject.vctCommand` の構造
先頭コマンドを使うテンプレート向けの補助オブジェクトです。既存の `text` や `parts` は書き換えません。
`vctCommand` は、金額表示などを混ぜないベース本文から抽出されます。

```js
{
  exists: true,
  name: '支援',
  body: '新衣装お披露目！',
  fullText: '!支援　新衣装お披露目！'
}
```

- `name`: `!` を除いたコマンド名。日本語を含めて取得可能
- `body`: 区切り空白以降の本文
- `fullText`: 判定対象になった元テキスト
- 区切り空白は半角スペースだけでなく、全角スペースやタブも許容

### `window.VCT.extractSupportAmount(commentData)`
解析済みの `CommentObject` から支援金額を抽出します。

**引数:**
- `commentData` (Object): `VCT.parse()` の戻り値。

**戻り値:**
- `Number`: 抽出できた支援金額。取得できない場合は `0`。

参照候補は `price`, `paidAmount`, `amount`, `money`, `paidText` などです。数値文字列に含まれるカンマは除去して扱います。

### `window.VCT.extractSupportCurrency(commentData)`
解析済みの `CommentObject` から通貨情報を抽出します。

**戻り値:**
- `String`: `currency` または `money.currency` 由来の通貨文字列。取得できない場合は空文字列。

### `window.VCT.getDisplayMessage(commentData)`
支援金額表示用の `paidText` が本文末尾に付いている場合、それを除いた表示用メッセージを返します。
ステッカー等の内容名は本文には混ぜず、`resolveSupportGift()` で別フィールドとして扱います。

**戻り値:**
- `String`: 支援履歴に保存するメッセージ本文。

### `window.VCT.resolveSupportGift(support)`
支援イベントまたは解析済みコメントから、ステッカー等のギフト情報を抽出します。

**戻り値:**
- `Object`: `type`, `label`, `imageUrl`, `hasImage` を含むギフト情報。

### `window.VCT.buildUserProfileRecord(commentData, options)`
`VCT_IDB.saveUserProfile()` に渡すためのユーザープロフィールレコードを生成します。
VCT Core 内部では `parseCore()` の戻り値を渡します。

**引数:**
- `commentData` (Object): `VCT.parseCore()` または `VCT.parse()` の戻り値。
- `options` (Object, optional): 環境依存値の注入用。

**`options` 候補:**
- `now` (Function): 現在時刻を返す関数。未指定時は `Date.now()`。

**戻り値:**
`platform`, `userId`, `userName`, `displayName`, `screenName`, `userIcon`, `originalUserIcon`, `isMember`, `isModerator`, `isOwner`, `eventAt`, `updatedAt`, `rawProfile` を含むオブジェクト。

### `window.VCT.buildSupportRecord(commentData, options)`
`VCT_IDB.saveSupport()` に渡すための支援レコードを生成します。
VCT Core 内部では `parseCore().event.isSupport === true` のイベントだけを保存対象にします。

**引数:**
- `commentData` (Object): `VCT.parseCore()` または `VCT.parse()` の戻り値。
- `options` (Object): `streamId` や `buildUserKey` などの環境依存値。

**`options` 候補:**
- `streamId` (String): 保存対象の配信ID。
- `buildUserKey` (Function): `userKey` を生成する関数。通常は `VCT_IDB.buildUserKey` を runtime 側から注入します。
- `now` (Function): 現在時刻を返す関数。

**戻り値:**
`event.isSupport === true` かつ支援金額が取得できた場合は `platform`, `streamId`, `originalEventId`, `eventAt`, `userKey`, `userId`, `userName`, `amount`, `currency`, `message`, `giftType`, `giftLabel`, `giftImageUrl`, `supportColor`, `rawType`, `raw` を含むオブジェクト。対象外イベント、支援金額が `0` 以下、または `event.kind === 'jewel'` の場合は `null`。ジュエル数は法定通貨の金額と区別し、`supports` へは保存しません。

`VCT` は `VCT_IDB` を直接参照しません。`streamId` や `buildUserKey` は呼び出し側が注入します。

### `window.VCT.parseStructured(rawComment)`
OneSDK の生コメントを、表示用途以外でも扱いやすい構造化オブジェクトへ変換します。
Legacy 互換の `VCT.parse()` と同じ内部正規化を通るため、`vctCommand` と `message.command`、`giftType / giftLabel / giftImageUrl` と `monetization.gift` は意味対応します。

主な構造:

```js
{
  id: 'comment-id',
  service: { id: 'youtube', name: 'youtube' },
  user: {
    id: 'platform-user-id',
    name: 'raw name',
    displayName: '表示名',
    profileImage: 'https://...'
  },
  message: {
    text: 'ユーザー本文',
    html: 'ユーザー本文HTML',
    parts: [],
    imgUrls: [],
    command: { exists: false, name: '', body: '', fullText: 'ユーザー本文' }
  },
  translation: {
    available: true,
    text: 'YouTube自動翻訳文',
    html: 'YouTube自動翻訳HTML',
    parts: [],
    imgUrls: [],
    sourceText: 'ユーザー本文',
    source: 'youtube_auto_translation',
    visibility: 'owner_only'
  },
  legacy: {
    text: 'Legacy表示本文',
    parts: []
  },
  monetization: {
    hasGift: true,
    kind: 'superchat',
    paidText: '¥1,000',
    amount: 1000,
    currency: 'JPY',
    gift: { type: 'superchat', label: '', imageUrl: '', hasImage: false }
  },
  membership: {},
  system: {},
  style: {},
  event: {
    kind: 'superchat',
    category: 'support',
    isSupport: true,
    isMembership: false,
    isGiftSender: false,
    isGiftReceiver: false,
    giftCount: 0,
    displayLabel: '¥1,000',
    shouldShowMessage: true
  },
  raw: {}
}
```

### `structured.event`
`parseStructured()` が返す表示・演出判定用のイベント分類です。
テンプレート側は `giftType` / `hasGift` / `membership` を個別に組み合わせず、まずこの値を参照します。

主な `kind`:
- `normal`
- `superchat`
- `supersticker`
- `jewel`
- `membership_gift`
- `membership_gift_received`
- `member_join`
- `member_milestone`
- `membership_event`
- `unknown`

主なフィールド:
- `category`: `comment` / `support` / `membership` / `system` / `unknown`
- `isSupport`: スパチャ、Super Sticker などの支援イベント
- `isMembership`: メンバーシップ、メンギフ、加入、マイルストーン系イベント
- `giftCount`: メンギフ送信件数。`sponsorgift` の `price` は金額ではなく件数として扱う
- `displayLabel`: テンプレートが名前行やメタ表示に使える短いラベル
- `shouldShowMessage`: 本文欄に `message.parts` を表示するかどうか

### `window.VCT.VERSION`
SDK API のバージョン文字列です。v1.1.0 以降で利用できます。

## 4. 特殊仕様
- **YouTubeジュエル**: `giftType === 'jewel'` は、`event.kind === 'jewel'` / `category === 'support'` / `isSupport === true` の支援通知イベントとして分類します。「ジュエル 77 個 を使って GG ハムスター を送りました」形式の本文からギフト名を抽出し、`monetization.gift.label` と `event.displayLabel` に保持します。わんコメが `paidText` / `price` を提供する場合は `monetization.paidText` / `amount` に反映しますが、その値はジュエル数であり法定通貨の金額ではありません。そのため `buildSupportRecord()` では金額の有無にかかわらず保存対象外とします。
- **YouTube自動翻訳**: YouTube 側が `data.translated` を提供する場合、`parseStructured()` は `translation` に翻訳文を保持します。翻訳文にYouTube絵文字の `<img>` が含まれる場合も `parts` / `imgUrls` に分解します。`message.text` は元コメントのまま維持し、テンプレート側で表示オン/オフを選べるようにします。翻訳はチャンネルオーナー側だけ見える可能性があるため、未提供時は `translation.available === false` になります。Legacy `VCT.parse()` の戻り値には追加しません。
- **システムメッセージ補完**: メンギフやマイルストーンなど、本文が空でシステム情報だけがある場合、それらを結合して `text` および `parts` にセットします。
- **本文ソース補完**: `comment` / `text` / `message` / `body` が空文字の場合、`speechText` を本文候補として扱います。メンバーシップギフト受取など、読み上げ文だけに内容が入るケースを補正します。
- **スパチャ金額**: 金額テキスト（`paidText`）は `monetization.paidText` / `raw.data.paidText` などで扱い、本文 `text` には混ぜません。表示側で必要に応じて結合します。
- **色判定ロジック**:
  1. ギフト背景色・文字色
  2. （`CONFIG.USE_USER_COLOR` が true の場合）ユーザーカラー
  3. 白 (`rgb(255, 255, 255)`)
  の順に優先されます。

## 5. 実装例
```javascript
OneSDK.subscribe({
  action: 'comments',
  callback: (comments) => {
    comments.forEach(raw => {
      // 解析の実行
      const data = VCT.parse(raw);
      
      console.log(`${data.user}: ${data.text}`);
      console.log('解析された色:', data.colorStr);
    });
  }
});
```

## 6. 変更履歴
- **v1.2.7-dev**: わんコメのジュエルテストデータに `price` / `paidText` が追加されたことに対応。`event.kind === 'jewel'` は金額を取得できても `buildSupportRecord()` では `null` を返し、通貨建ての支援履歴への混入を防止。
- **v1.2.6-dev**: YouTubeジュエルの実通知本文からギフト名を抽出し、`monetization.gift.label` / `event.displayLabel` に反映。ジュエル数は金額として扱わない。
- **v1.2.5-dev**: YouTubeジュエル（`giftType: 'jewel'`）を数量・金額のない支援通知イベントとして `event.kind: 'jewel'` に分類。金額0の場合は従来通り支援履歴を作成しない。
- **v1.2.4-dev**: Legacy互換 `VCT.parse().text` への `paidText` 末尾補完を廃止。本文と金額を分離し、判定・DB保存では `parseStructured().message` / `monetization` を優先する方針へ整理。
- **v1.2.3**: `parseStructured()` に `translation` を追加。YouTube `data.translated` を元本文とは分離して保持し、Legacy `VCT.parse()` は変更なし。
- **v1.2.2**: `parseStructured().user.id` にプラットフォーム側の `userId` を非破壊追加。取得できない場合は空文字列。
- **v1.2.1**: 空文字の `comment` / `text` / `message` / `body` をスキップし、`speechText` へフォールバック。`giftreceived` など本文が空で読み上げ文だけに内容が入るケースを補正。API構造の変更はなし。
- **v1.2.0**: `parseStructured()` に `event` レイヤーを追加。superchat / supersticker / membership_gift / membership_gift_received / member_join / member_milestone / membership_event / normal を分類。Legacy `parse()` の戻り値は原則変更なし。
- **v1.1.0**: 内部正規化 `parseCore()` を追加し、`parse()` を Legacy 変換層へ整理。`parseStructured()` と `VERSION` を追加。Legacy 戻り値に `giftType`, `giftLabel`, `giftImageUrl` を非破壊追加。
- **v1.0.6**: `extractSupportAmount()`, `extractSupportCurrency()`, `getDisplayMessage()`, `buildUserProfileRecord()`, `buildSupportRecord()` を追加。VCT Core v0.3.0 の責務分離に合わせ、レコード生成を options 注入型で提供。
- **v1.0.5**: `vctCommand` を追加。先頭 `!command` を非破壊で分離し、日本語コマンドと全角スペース区切りにも対応。`vctCommand` は `paidText` 追記前のベース本文から抽出。
- **v1.0.4**: `Super Sticker` 判定を追加。`gift-sticker` または `gift-image` クラスを持つ画像をステッカーとして識別し、`parts` 内に `isSticker` フラグを付与。
- **v1.0.3**: `isOwner`, `isModerator` フラグを追加（配信者やモデレーターの判定を容易に）。
- **v1.0.2**: `parseColor` 関数に `rgba` のパースロジックを修正。
- **v1.0.1**: `parseColor` 関数に `rgba` のパースロジックを追加。
- **v1.0.0**: 初版リリース。
