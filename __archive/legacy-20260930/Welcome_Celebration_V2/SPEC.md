# Welcome Celebration V2 Specification

## 1. 概要

Welcome Celebration V2 は、わんコメのコメントデータからメンバーシップ関連イベントを検出し、全画面の祝祭演出として表示するテンプレートである。

本テンプレートは通知の可読性や省スペース性より、歓迎感、祝祭感、イベント感を優先する。

## 2. バージョン

- Template: `2.1.0`
- Base: `CommentFX_Base_v2_6`
- VCT SDK (`vct_one_core.js`): `1.2.6-dev`
- Data model: VCT SDK structured event 方式

## 3. ファイル構成

- `index.html`: DOMレイヤー、Canvas、OneSDK/VCT loader 読み込み
- `config.js`: ユーザー調整用設定
- `parser.js`: VCT SDK の structured データを CommentFX 互換形式へ正規化
- `engine.js`: 対象イベントを Welcome Celebration event に変換
- `fx.js`: DOMカード、Canvas紙吹雪、キラキラ、キュー制御
- `style.css`: 全画面レイヤーとカード表示スタイル
- `_lib/vct_one_core.js`: 同梱 VCT SDK
- `template.json`: わんコメテンプレート用メタ情報

## 4. 入力データ

`script.js` が OneSDK の `comments` 購読から受け取った raw comment を `CommentFXParser.parse()` に渡す。

`parser.js` は `VCT.parseStructured(rawComment)` を優先し、次の情報を従来互換の commentData に追加する。

- `structured`
- `event`
- `monetization`
- `membershipDetail`
- `message`
- `legacy`
- `userDetail`
- `system`
- `style`

既存互換フィールドも維持する。

- `text`
- `user`
- `profileImage`
- `badges`
- `color`
- `colorStr`
- `hasGift`
- `giftType`
- `membership`
- `raw`

## 5. イベント分類

VCT SDK (`vct_one_core.js`) v1.2.6-dev の `event.kind` を利用する。

現在の `engine.js` が定義するイベント:

| kind | 用途 | 初期状態 |
| --- | --- | --- |
| `member_join` | メンバーシップ加入 | 有効 |
| `member_milestone` | メンバーシップ継続 / マイルストーン | 有効 |
| `first_time` | 初見コメント歓迎 | 有効 |

VCT SDK 側では分類できるが、V2では `EVENT_META` 未定義のため演出対象外:

| kind | 用途 | 方針 |
| --- | --- | --- |
| `membership_gift` | メンバーシップギフト購入 | 将来対応。デフォルトOFF推奨 |
| `membership_gift_received` | メンバーシップギフト受取 | 将来対応。デフォルトOFF推奨 |

## 6. Engine仕様

`ENGINE.onComment(comment)` は以下を行う。

1. `comment.event.kind` を取得
2. `EVENT_META` に存在しない kind は無視
3. `CONFIG.ENABLED_EVENT_KINDS` に含まれない kind は無視
4. メンバーイベントが対象外だった場合、初見コメント条件を判定
5. `welcome-celebration` event を返す

`first_time` は VCT SDK の `event.kind` ではなく、`isFirstTime` / `userDetail.isFirstTime` から作る疑似イベントである。メンバー加入・継続などのイベントがある場合は、そちらを優先する。

返却 event:

```js
{
  type: "welcome-celebration",
  kind,
  tone,
  label,
  headline,
  message,
  eventLabel,
  user,
  iconUrl,
  color,
  colorStr,
  life,
  event,
  structured,
  raw
}
```

### 6.1 表示文言

`member_join`:

- `label`: `NEW MEMBER`
- `headline`: `WELCOME!`
- `message`: `membershipDetail.sub` を最優先
- fallback: `message.text` -> `text` -> `ようこそ`

`member_milestone`:

- `label`: `MEMBER ANNIVERSARY`
- `headline`: `THANK YOU!`
- `message`: `membershipDetail.primary` を優先
- fallback: `event.displayLabel` -> `いつもありがとう`

`first_time`:

- `label`: `FIRST VISIT`
- `headline`: `WELCOME!`
- `eventLabel`: `初見さん`
- `message`: `はじめまして！`
- `tone`: `first-time`
- 表示時間、カードサイズ、エフェクト量、queue制限は `FIRST_TIME_PRESETS` を利用

## 7. FX仕様

`FX.push(event)` は `event.type === "welcome-celebration"` のみ受け付ける。

### 7.1 キュー

- `queue` に演出待ちイベントを保持
- 同時表示は1件
- `CONFIG.MAX_QUEUE` を超えた場合は古い待機イベントから破棄
- `first_time` は `event.maxQueue` により同種イベントの待機/表示数を追加制限する
- `clear` 受信時は現在表示、待機、パーティクルを全消去

### 7.2 表示フロー

1. `show(event)`
2. overlay を `is-active` にする
3. カード文言とアイコンを反映
4. `cardEntrance` animation
5. `cardPulse` animation
6. 紙吹雪とキラキラを生成
7. `DISPLAY_DURATION` 経過で終了
8. キューがあれば次を再生

### 7.3 描画

- カードと背景: DOM/CSS
- 紙吹雪: Canvas2D
- キラキラ: Canvas2D

Canvasは devicePixelRatio を反映して resize する。

## 8. 設定仕様

| key | default | description |
| --- | --- | --- |
| `TEMPLATE_VERSION` | `2.1.0` | テンプレートバージョン |
| `ENABLED_EVENT_KINDS` | `["member_join", "member_milestone"]` | 対象イベント |
| `DISPLAY_DURATION` | `5.2` | 1件の表示秒数 |
| `CARD_SCALE` | `1.0` | カード拡大率 |
| `FX_INTENSITY` | `1.0` | エフェクト量倍率 |
| `CONFETTI_ENABLED` | `true` | 紙吹雪ON/OFF |
| `CONFETTI_AMOUNT` | `150` | 紙吹雪生成数 |
| `SPARKLES_ENABLED` | `true` | キラキラON/OFF |
| `SPARKLE_AMOUNT` | `80` | キラキラ生成数 |
| `MAX_QUEUE` | `8` | 最大待機件数 |
| `FIRST_TIME_MODE` | `"light"` | 初見歓迎モード |
| `FIRST_TIME_COOLDOWN_MS` | `15000` | 初見演出の最短発動間隔 |
| `FIRST_TIME_PRESETS` | object | 初見演出プリセット |
| `HIDE_DEFAULT_COMMENTS` | `true` | コメントDOM表示ON/OFF |
| `CLEAR_ON_ONESDK_CLEAR` | `true` | OneSDK clear時に演出を消す |
| `DEBUG` | `false` | debug log ON/OFF |

## 9. 初見歓迎仕様

初見歓迎は通常コメントに付与される `isFirstTime` を利用する。再訪を示す `isRepeater` は演出対象にしない。

対象条件:

- `comment.isFirstTime === true` または `comment.userDetail.isFirstTime === true`
- `event.isMembership !== true`
- `event.isSupport !== true`
- `event.kind` が空、`normal`、または `event.category === "comment"`

発動制御:

- `FIRST_TIME_MODE: "off"` の場合は無効
- `FIRST_TIME_MODE: "light"` はデフォルトの軽量演出
- `FIRST_TIME_MODE: "party"` は強めの歓迎演出
- `FIRST_TIME_COOLDOWN_MS` 未満の連続発動は抑制する
- `FIRST_TIME_PRESETS[mode].maxQueue` 以上の同種イベントは追加しない

## 10. メンバーシップギフト対応方針

ギフト系は主役ジャック演出との相性が強すぎるため、追加する場合もデフォルトOFFとする。

想定:

- `membership_gift`: 購入者を主役にした大演出。ただし件数表示を追加する。
- `membership_gift_received`: 受取者ごとの連続発生が多いため、カード小型化、短時間表示、または専用軽量演出を検討する。

有効化は `CONFIG.ENABLED_EVENT_KINDS` で行う。

```js
ENABLED_EVENT_KINDS: [
  "member_join",
  "member_milestone",
  "membership_gift"
]
```

## 11. 既知の制約

- `membership_gift` / `membership_gift_received` は現時点では `EVENT_META` 未定義のため、configに追加しても演出されない。
- 表示は 1920x1080 を主想定としているが、CSSは viewport に追従する。
- 大量イベント時は `MAX_QUEUE` を超えた待機イベントを破棄する。
- アイコン画像の読み込みに失敗した場合はユーザー名の先頭2文字を表示する。
