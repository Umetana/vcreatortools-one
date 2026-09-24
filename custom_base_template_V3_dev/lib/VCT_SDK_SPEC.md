# VCT SDK 2.0 確定仕様 v2.0.3-dev

## 1. 位置づけ

`vct_sdk.js` は、OneSDK のコメント1件をテンプレート共通の構造へ正規化する SDK 2.0 の正本です。

- SDK 1系の正本 `vct_one_core.js` v1.2.7-dev は凍結する。
- SDK 1系を参照する既存テンプレートは一括変更しない。
- SDK 2.0 は `window.VCT_SDK` として公開し、SDK 1系の `window.VCT` と共存できる。
- SDKの版と各テンプレートの版は別に管理する。

## 2. 公開API

```js
const normalized = VCT_SDK.normalize(rawComment);
const withRaw = VCT_SDK.normalize(rawComment, { includeRaw: true });
console.log(VCT_SDK.VERSION); // 2.0.3-dev
```

公開メンバーは次の2つだけです。

- `VCT_SDK.VERSION`: SDKの版。
- `VCT_SDK.normalize(raw, options)`: OneSDK生データを正規化する唯一の入口。

SDK 1系の `parse()`、`parseStructured()`、`parseCore()`、Legacy API、`legacy` フィールドは提供しません。

### options

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `includeRaw` | Boolean | `false` | `true` の場合だけ戻り値のトップレベルへ `raw` を含める |
| `useUserColor` | Boolean | `window.CONFIG.USE_USER_COLOR !== false` | 通常コメントでユーザーカラーを採用するか |

## 3. 正規化結果

```js
{
  id: "comment-id",
  service: { id: "youtube", name: "YouTube" },
  message: {
    text: "本文",
    html: "本文HTML",
    parts: [],
    imageUrls: [],
    command: { exists: false, name: "", body: "", fullText: "本文" },
    translation: {
      available: false,
      text: "",
      html: "",
      parts: [],
      imageUrls: [],
      source: "",
      visibility: ""
    }
  },
  user: {
    id: "",
    name: "Anonymous",
    displayName: "Anonymous",
    screenName: "",
    profileImage: "",
    originalProfileImage: "",
    badges: [],
    roles: { owner: false, moderator: false, member: false },
    traits: { anonymous: false, firstTime: false, repeater: false }
  },
  monetization: {
    present: false,
    kind: "",
    money: { available: false, amount: 0, currency: "", displayText: "" },
    jewels: { available: false, count: 0, unit: "jewel" },
    gift: { type: "", label: "", imageUrl: "", hasImage: false }
  },
  membership: {
    active: false,
    primary: "",
    sub: "",
    milestone: null,
    giftCount: 0,
    isGiftSender: false,
    isGiftReceiver: false
  },
  event: {
    kind: "normal",
    category: "comment",
    isSupport: false,
    isMembership: false,
    displayLabel: "",
    announcementText: "",
    shouldShowMessage: true
  },
  style: {
    color: { r: 255, g: 255, b: 255 },
    colorString: "rgb(255, 255, 255)"
  },
  system: { sticky: false, complementedMessage: false }
}
```

正式な業務構造は `message` / `user` / `monetization` / `membership` / `event` です。`service`、`style`、`system` は出所・表示補助情報です。

## 4. 正規化ルール

### 本文

- `comment`、`text`、`message`、`body` の順で、最初の空でない値を採用する。
- `message` はユーザー本文として扱い、`membership.primary` / `membership.sub` を混ぜない。ユーザー本文が空の加入・継続通知では案内文を `event.announcementText` に保持する。
- 同じ本文HTMLは1回だけDOM解析し、その結果から `text`、`parts`、`imageUrls`、ギフト画像候補を作る。
- 翻訳HTMLは元本文と別の入力なので、存在する場合だけ別途1回解析する。
- 金額表示やギフト名を `message.text` へ混ぜない。
- `speechText` は読み上げ用の加工済み文字列であるため、表示本文やギフト名の補完には使用しない。

### 金額・数量

- 法定通貨または通貨建て金額は `monetization.money` に保持する。
- YouTubeジュエル数は `jewels`、`jewelCount`、`price`、`paidText` など取得できる数量候補から `monetization.jewels` に保持し、`money.amount` へ入れない。
- メンバーシップギフト件数は `membership.giftCount` に保持し、金額にもジュエルにも入れない。
- `money.available` は金額が正数かつ通貨情報または金額表示があり、ジュエル／メンギフ件数でない場合に `true` とする。

### RAW

- 通常の表示処理で巨大な生データを複製し続けないよう、既定では含めない。
- 調査、ログ保存、デバッグ表示で必要な呼び出しだけ `includeRaw: true` を指定する。
- `raw` は参照をそのまま保持し、複製や凍結は行わない。

## 5. event.kind

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

ジュエルは `category: "support"` / `isSupport: true` ですが、通貨金額を持つことを意味しません。保存側は `monetization.money.available` を通貨建て支援の条件にします。

## 6. 初期移行範囲

### 第1対象

1. `_debug/comment_monitor.html`（SDK v2.0.3-dev対応済み）
   - SDK 2.0を読み込み、1コメントにつき `normalize()` を1回だけ実行する。
   - 通常表示ではRAWなし、RAWタブ等で必要な場合だけ受信した原本を直接表示する。
   - SDK 1系との比較が必要な検証期間だけ、明示的な比較モードとして分離する。
2. 新しいカスタムベース
   - 既存 `custom_base_template_V2` / `custom_base_template_V2_7_dev` は変更しない。
   - 新規ディレクトリを作成し、`VCT_SDK.normalize()` の戻り値を表示モデルの入力にする。
   - SDK同梱版を持たせる場合もSDK版とテンプレート版を別記する。

### 今回の対象外

- `_vct_core` runtime のSDK 2.0移行
- IndexedDBレコードビルダー
- 既存テンプレートの参照変更、同梱SDKの差し替え
- SDK 1系との自動フォールバックやLegacy変換

## 7. 移行時の主な対応

| SDK 1系 | SDK 2.0 |
| --- | --- |
| `VCT.parseStructured(raw)` | `VCT_SDK.normalize(raw)` |
| `translation` | `message.translation` |
| `user.isOwner` | `user.roles.owner` |
| `user.isModerator` | `user.roles.moderator` |
| `monetization.amount` | `monetization.money.amount` |
| ジュエル判定後に金額除外 | `monetization.jewels.count` として最初から分離 |
| `event.giftCount` | `membership.giftCount` |
| 常時 `raw` | `normalize(raw, { includeRaw: true })` のみ |

## 8. 既知の境界

- OneSDKや配信サービスが提供しない情報は復元しない。
- 通貨コードが無く表示文字列だけある場合は `currency` が空のままになることがある。
- 自動生成IDは入力にIDが無い場合の実行時識別用であり、再起動をまたぐ永続キーには使わない。
