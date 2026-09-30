# view comment heart V2 Display Spec Draft

本ドキュメントは、`view_comment_heart_v2` を VCT SDK v1.2.1 の `parseStructured()` / `event` レイヤーへ移行するための表示仕様ドラフトです。
目的は、旧版の表示体験を保ちながら、コメント本文と支援・メンバーシップ情報を分離して扱える構造へ移行することです。

## 1. 移行目的

- `VCT.parse(raw)` の Legacy 互換表示から、`VCT.parseStructured(raw)` ベースの表示へ移行する。
- コメント本文に混在していた金額・メンバーシップ情報を、名前行のメタ情報として分離する。
- コメント欄は、文字列・絵文字・スタンプ・画像を元の順序通りに表示する。
- v1 は安定版として維持し、V2 で新仕様の表示改善を進める。

## 2. 基本表示構造

### 名前行

名前行は、発言者情報とイベント情報をまとめて表示する。

表示要素:

- ユーザー名
- バッジ
- ギフト情報
- メンバーシップ情報
- 固定コメントなどの状態情報

例:

```text
kain9 [badge] スパチャ ¥500
kain9 [badge] メンギフ 5件
kain9 [badge] メンバー 12ヶ月
```

### コメント行

コメント行は、ユーザーが入力した本文のみを表示する。

- `parsed.message.parts` を使用する。
- `parsed.legacy.parts` は原則使用しない。
- 文字列、絵文字、スタンプ、画像の順序を変更しない。
- コメントが空の場合、コメント行は空扱いにする。
- 金額やメンバーシップ補足はコメント本文へ混ぜない。

## 3. データソース

`VCT.parseStructured(raw)` の戻り値を主データソースとする。

| 表示項目 | 参照先 |
| :--- | :--- |
| ID | `parsed.id` |
| 表示名 | `parsed.user.displayName` |
| プロフィール画像 | `parsed.user.profileImage` |
| バッジ | `parsed.user.badges` |
| コメント本文 | `parsed.message.parts` |
| ギフト判定 | `parsed.monetization.hasGift` |
| 支援金額表示 | `parsed.monetization.paidText` |
| 支援金額 | `parsed.monetization.amount` |
| 通貨 | `parsed.monetization.currency` |
| ギフト種別 | `parsed.monetization.kind` / `parsed.monetization.gift.type` |
| ギフト名 | `parsed.monetization.gift.label` |
| ギフト画像 | `parsed.monetization.gift.imageUrl` |
| イベント種別 | `parsed.event.kind` |
| イベント分類 | `parsed.event.category` |
| イベント表示ラベル | `parsed.event.displayLabel` |
| メンギフ件数 | `parsed.event.giftCount` |
| 本文表示判定 | `parsed.event.shouldShowMessage` |
| メンバーシップ | `parsed.membership.active` |
| メンバーシップ本文 | `parsed.membership.primary` / `parsed.membership.sub` |
| 固定コメント | `parsed.system.isSticky` |
| 強調色 | `parsed.style.colorStr` |

## 4. ギフト情報の表示

名前行の横に短いメタ表示として出す。

### スパチャ系

表示形式:

```text
スパチャ ¥500
```

SDK v1.2.1 以降では、表示判定は `parsed.event.kind === "superchat"` を主に参照する。
YouTube の確認済み raw データでは、以下が入る。

- `giftType: "superchat"`
- `hasGift: true`
- `paidText`: `¥1,000` / `$10.00` / `￥200`
- `price`: `1000` / `10` / `200`
- `unit`: `¥` / `$`
- `currency`: `JPY` / `USD`

優先順位:

1. `parsed.monetization.paidText`
2. `amount + currency` から生成
3. 取得できなければ `スパチャ`

### メンギフ系

表示形式:

```text
メンギフ 5件
```

SDK v1.2.1 以降では、送信側イベントは `parsed.event.kind === "membership_gift"` を主に参照し、件数は `parsed.event.giftCount` を使用する。
YouTube の実データでは、送信側 raw に以下が入る。

- `giftType: "sponsorgift"`
- `isSponsorshipGiftSender: true`
- `price: 5`
- `comment`: `...メンバーシップ ギフトを 5 個贈りました`

SDK側では件数を `parsed.event.giftCount` に正規化する。
内部的には `price` を優先して取得する。
`price` が取得できない場合は、`comment` / `speechText` から `5 個` のような個数表記を抽出する。

件数が取得できない場合:

```text
メンギフ
```

受け取り側イベントは `parsed.event.kind === "membership_gift_received"` を主に参照する。
YouTube の実データでは、受け取り側 raw に以下が入る。

- `giftType: "giftreceived"`
- `isSponsorshipGiftReceiver: true`
- `price: 0`
- `comment`: `...メンバーシップ ギフトを受け取りました`

受け取り側は件数イベントではないため、初期表示は `メンギフ受取` とする。

### その他ギフト・スタンプ系

Super Sticker は `parsed.event.kind === "supersticker"` として扱う。

表示形式:

```text
ステッカー ¥1,000
```

`parsed.event.displayLabel` または `paidText` が取得できない場合:

```text
ステッカー
```

YouTube の確認済みデータでは、以下を主に参照する。

- `giftType: "supersticker"`
- `hasGift: true`
- `paidText`: `¥1,000` / `￥140`
- `price`: `1000` / `140`
- `currency`: `JPY`
- `comment`: `<img class="gift-image ...">`
- `speechText`: `テストステッカー` / `1 本の赤いバラ`

Super Sticker の画像は `parsed.message.parts` に含まれる画像 part として本文欄に表示する。
名前行では、金額つきの短いメタ情報だけを表示する。

### その他ギフト

表示形式:

```text
ギフト名
```

`gift.label` が空の場合:

```text
ギフト
```

ギフト画像は初期実装では名前行のテキストメタには混ぜない。
本文中の画像・スタンプは `message.parts` の順序通りに表示する。

## 5. メンバーシップ情報の表示

名前行の横に短いメタ表示として出す。

継続月数が取得できる場合:

```text
メンバー 12ヶ月
```

継続月数が取得できない場合:

```text
メンバー
```

SDK v1.2.1 以降では、メンバーシップイベントの大分類は `parsed.event.kind` を主に参照する。
`membership.primary` / `membership.sub` に月数を含む文字列がある場合は、そこから月数表記を抽出する。
YouTube の実データでは、マイルストーンチャットに `membership.primary: "メンバー歴 8 か月"` のような値が入る。
この場合は `8 か月` を抽出し、表示上は `メンバー 8ヶ月` に正規化する。
バッジ側にも `label: "メンバー（6 か月）"` のような月数が含まれる場合があるが、マイルストーン表示では `membership.primary` を優先する。
新規加入は `parsed.event.kind === "member_join"` を主に参照し、表示上は `メンバー加入` とする。
`milestonechat` は `hasGift: true` になる場合があるが、V2 表示では汎用 `ギフト` ラベルを付けず、メンバーシップ情報として扱う。
抽出できない場合は `メンバー` にフォールバックする。

## 6. コメント本文の描画

### 順序保持

`parsed.message.parts` を配列順に描画する。

禁止事項:

- テキストだけを先に結合する。
- 絵文字やスタンプだけを末尾へ移動する。
- 画像を別枠へ移動して本文中の順序を崩す。

理由:

日本の配信コメントでは、文字列・絵文字・スタンプの組み合わせと順序で意味が成立するケースが多いため。

### 空コメント

コメント本文が空の場合、コメント行は空扱いにする。
支援・メンバーシップ情報は名前行に表示されるため、本文欄に代替テキストは出さない。

例外として、メンバーシップ加入・継続など `membership.primary` / `membership.sub` から SDK がシステム本文を補完できる場合は、`parsed.message.parts` を表示する。
これは `...へようこそ！` や `メンバー歴 8 か月` のような加入・継続ログをコメントビューア上で読めるようにするため。
ただし受け取り側のメンギフなど、`parsed.event.shouldShowMessage === false` のイベントは、初期設定では本文欄を空扱いにし、名前行メタ表示に留める。
メンギフ送信側は1件の送信イベントとして扱い、`parsed.event.shouldShowMessage === true` の場合は `... のメンバーシップ ギフトを 5 個贈りました` のような本文も表示する。

V2では、最終的な本文表示可否をテンプレート設定で上書きできる。

```js
SHOW_EVENT_MESSAGES: true,
SHOW_EVENT_MESSAGE_SUPERCHAT: true,
SHOW_EVENT_MESSAGE_SUPERSTICKER: true,
SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT: true,
SHOW_EVENT_MESSAGE_MEMBER_JOIN: true,
SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT: true,
SHOW_EVENT_MESSAGE_GIFT_RECEIVED: false
```

`SHOW_EVENT_MESSAGE_GIFT_RECEIVED` は初期OFF。
これにより、連続しやすいメンギフ受け取り本文は初期状態では抑制する。

## 7. 長文省略

デフォルトではコメント本文を省略しない。
コメントビューアとして、YouTube 側の仕様上投稿できる本文をそのまま表示することを基本とする。

任意設定で上限が指定された場合のみ、末尾に `...` を追加して省略する。

初期案:

- テキスト: 実文字数でカウント
- 絵文字・画像・スタンプ: 1要素を 2 文字相当としてカウント
- 上限: デフォルトなし
- 任意上限: `MAX_COMMENT_UNITS` のような設定値で指定
- 省略記号: `...`

省略処理は、任意上限が有効な場合のみ `parts` の先頭から順に処理する。
テキスト part が途中で上限を超える場合は、収まる文字数だけ残して `...` を追加する。
画像・絵文字 part が上限を超える場合は、その要素を追加せず `...` を追加する。

## 8. 演出判定

既存のハート演出・背景強調は、新仕様の構造化データを参照する。

| 判定 | 参照先 |
| :--- | :--- |
| 支援イベント時 | `parsed.event.isSupport` |
| メンバーシップイベント時 | `parsed.event.isMembership` |
| 固定コメント時 | `parsed.system.isSticky` |
| 強調色 | `parsed.style.colorStr` |

`HEART_MODE = gift` の場合は、支援イベント・メンバーシップイベント・固定コメントを special として扱う。

## 9. 実装方針

### 第1段階

- `main.js` を `VCT.parseStructured(raw)` ベースに変更する。
- `normalizeComment(parsed)` のような変換関数を追加し、表示用データを組み立てる。
- CSS と HTML の大幅な変更は避け、表示構造の変更に必要な最小差分にする。
- Legacy 互換の `VCT.parse(raw)` は、SDKが古い場合のフォールバックとしてのみ検討する。

### 第2段階

- 名前行のメタ表示を CSS で整える。
- ギフト・メンバーシップ・固定コメントのラベル色を調整する。
- 必要に応じて `config.js` に表示上限やメタ表示の ON/OFF を追加する。

## 10. 実装チェックリスト

- [x] `main.js` のパース処理を `parseStructured()` に移行する。
- [x] 表示用コメントオブジェクトを新構造から生成する。
- [x] `message.parts` を順序通りに描画する。
- [x] `legacy.parts` 依存を外す。
- [x] 名前行にギフト情報を表示する。
- [x] 名前行にメンバーシップ情報を表示する。
- [x] コメント空時に代替本文を出さない。
- [x] 任意上限が設定された場合のみ、長文省略処理を parts 単位で適用する。
- [x] ハート演出判定を新構造に移行する。
- [ ] 実データを流して表示確認する。

## 11. 後続確認事項

- YouTube 側でその他ギフト種別が追加された場合の表示確認。
- 長文任意上限は `MAX_COMMENT_UNITS` として config 化し、デフォルトは `0`（無制限）とする。

## 12. 確認済み raw サンプル

参照ファイル:

```text
__docs/__comment_data_RAW/わんコメ生データ_youtube_202605.txt
わんコメ生データサンプル_youtube(非公開版).txt
```

確認済み `giftType`:

```text
normal
superchat
supersticker
milestonechat
sponsorgift
giftreceived
```

確認済みイベント:

| イベント | 主な raw 値 | 表示案 |
| :--- | :--- | :--- |
| 通常コメント | `giftType: "normal"`, `hasGift: false` | メタ表示なし |
| スパチャ | `giftType: "superchat"`, `paidText: "¥1,000"`, `price: 1000` | `スパチャ ¥1,000` |
| Super Sticker | `giftType: "supersticker"`, `paidText: "￥140"`, `comment: "<img class=\"gift-image\" ...>"` | `ステッカー ￥140` |
| メンギフ送信 | `giftType: "sponsorgift"`, `isSponsorshipGiftSender: true`, `price: 5` | `メンギフ 5件` |
| メンギフ受取 | `giftType: "giftreceived"`, `isSponsorshipGiftReceiver: true`, `price: 0` | `メンギフ受取` |
| メンバー加入 | `giftType: "milestonechat"`, `membership.sub: "...へようこそ！"` または `badges.label: "新規メンバー"` | `メンバー加入` |
| マイルストーンチャット | `giftType: "milestonechat"`, `membership.primary: "メンバー歴 8 か月"` | `メンバー 8ヶ月` |
| チャンネルオーナーコメント | `isOwner: true`, `hasGift: false` | 通常コメント + `OWNER` バッジ |
| モデレーターコメント | `isModerator: true`, `isOwner: false` | 通常コメント + `MOD` バッジ |

確認済みコメント本文パターン:

| パターン | 主な raw 値 | 表示方針 |
| :--- | :--- | :--- |
| Unicode 絵文字 | `comment` 内に通常の `<img>` または文字 | `message.parts` 順に表示 |
| YouTube カスタム絵文字 | `data-custom-emoji="true"`, `data-src` あり | `message.parts` 順に表示 |
| メンバー専用スタンプ連続 | `data-custom-emoji="true"` の `<img>` が多数連続 | 順序維持、省略は parts 単位 |
| Super Sticker 画像 | `class="gift-image"` または `class="gift-image gift-sticker"` | 本文欄に画像として表示 |
