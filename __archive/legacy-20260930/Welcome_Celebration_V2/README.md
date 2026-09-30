# Welcome Celebration V2

Welcome Celebration は、メンバーシップ加入や継続を全画面で派手に祝うための、わんコメ用カスタムテンプレートです。

通常の通知表示ではなく、数秒間だけ配信画面の主役をイベント対象者に切り替えることを目的にしています。画面を隠すことを許容し、配信者と視聴者がイベントに気付きやすい祝祭演出として使います。

## 対応イベント

v2.1.0 の初期設定では、以下を対象にします。

- `member_join`: メンバーシップ加入
- `member_milestone`: メンバーシップ継続 / マイルストーンチャット
- `first_time`: 初見コメント歓迎

以下のイベント分類は VCT SDK (`vct_one_core.js`) v1.2.6-dev で判定できますが、初期設定では無効です。

- `membership_gift`: メンバーシップギフト購入
- `membership_gift_received`: メンバーシップギフト受取

メンバーシップギフト系は短時間に連続しやすく、画面占有が強くなりすぎるため、デフォルトOFF方針です。

## 表示内容

加入時:

- ユーザーアイコン
- ユーザー名
- `NEW MEMBER`
- `WELCOME!`
- `新規メンバー`
- `〇〇〇 へようこそ！` など、わんコメの membership 文言

継続時:

- ユーザーアイコン
- ユーザー名
- `MEMBER ANNIVERSARY`
- `THANK YOU!`
- `メンバー歴 N か月` などのイベントラベル

初見コメント時:

- ユーザーアイコン
- ユーザー名
- `FIRST VISIT`
- `WELCOME!`
- `初見さん`
- `はじめまして！`

## 設定

設定は `config.js` で変更します。

```js
ENABLED_EVENT_KINDS: [
  "member_join",
  "member_milestone"
],

DISPLAY_DURATION: 5.2,
CARD_SCALE: 1.0,
FX_INTENSITY: 1.0,
CONFETTI_ENABLED: true,
CONFETTI_AMOUNT: 150,
SPARKLES_ENABLED: true,
SPARKLE_AMOUNT: 80,
MAX_QUEUE: 8

FIRST_TIME_MODE: "light",
FIRST_TIME_COOLDOWN_MS: 15000
```

主な項目:

- `ENABLED_EVENT_KINDS`: 対象イベント種別
- `DISPLAY_DURATION`: 1件あたりの表示秒数
- `CARD_SCALE`: 中央カードの拡大率
- `FX_INTENSITY`: 紙吹雪とキラキラ量の全体倍率
- `CONFETTI_ENABLED`: 紙吹雪のON/OFF
- `CONFETTI_AMOUNT`: 紙吹雪量
- `SPARKLES_ENABLED`: キラキラのON/OFF
- `SPARKLE_AMOUNT`: キラキラ量
- `MAX_QUEUE`: 連続イベント時に保持する最大件数
- `FIRST_TIME_MODE`: 初見歓迎モード。`off` / `light` / `party`
- `FIRST_TIME_COOLDOWN_MS`: 初見演出の最短発動間隔

## 初見歓迎モード

初見コメントは `isFirstTime` / `userDetail.isFirstTime` をもとに判定します。ただしメンバー加入・継続などのイベントがある場合は、メンバーイベント側を優先します。

```js
FIRST_TIME_MODE: "light"
```

モード:

- `off`: 初見コメントでは演出しない
- `light`: デフォルト。短め、小さめ、紙吹雪少なめ
- `party`: 初見でもかなり派手に歓迎する

初見は配信内容によって頻度が高くなるため、`FIRST_TIME_COOLDOWN_MS` とプリセット内の `maxQueue` で詰まりすぎを抑制します。

## ギフト系の今後の有効化

現時点では `membership_gift` / `membership_gift_received` の分類は VCT SDK 側で可能ですが、Welcome Celebration V2 の `engine.js` には専用表示定義をまだ入れていません。

将来メンバーシップギフト購入を有効にする場合は、`engine.js` に `EVENT_META.membership_gift` を追加したうえで、`ENABLED_EVENT_KINDS` に `membership_gift` を追加します。

```js
ENABLED_EVENT_KINDS: [
  "member_join",
  "member_milestone",
  "membership_gift"
]
```

ギフト受取まで有効にする場合は、同様に `EVENT_META.membership_gift_received` を追加したうえで `membership_gift_received` を設定します。ただし受取イベントは連続発生しやすいため、デフォルトOFFのまま、OBS上で画面占有と表示時間を確認してから使う方針です。

## 動作基盤

- `CommentFX_Base_v2_6` から派生
- 同梱 `vct_one_core.js` は VCT SDK v1.2.6-dev
- 旧仕様系 V1-v1.1.0 ではなく、VCT SDK structured event 方式を採用
- `VCT.parseStructured()` の `event.kind` を利用
- OneSDK の `comments` を受け取り、対象イベントのみ演出します


## ライセンス

MIT LICENSE

本テンプレートは改造・再配布自由です。
