# view comment Underbar V2 v1.0.0

画面下部にコメントを表示する、わんコメ用カスタムテンプレートです。

コメントを長時間しっかり読むための主表示というより、配信画面を邪魔しにくい位置でコメントの存在感を出す「魅せる」演出テンプレートとして設計しています。ゲーム画面、歌枠、雑談画面の下部に軽く流す用途を想定しています。

`custom_base_template_V2_7_dev` をベースに、コメント解析・イベント分類・設定パネル・VCT SDK 同梱構成を流用しつつ、表示部分を下部固定の横レーン方式へ変更しています。

## 主な機能

- 1920x1080想定の下部コメント帯
- `ticker` 横流しモードと `stack` 横積みモード
- 右から左、または左から右への表示方向切り替え
- 1〜複数レーン表示
- コメント枠の最小幅・最大幅・高さ・速度・下位置の調整
- 名前、アイコン、バッジ、OWNER/MOD、イベントラベルの表示
- スパチャ、Super Sticker、メンバーシップ、メンギフ送信/受取、固定コメントの基本表示
- 長文本文の省略表示、または枠内横スクロール表示
- 右下ギアから開く画面内設定パネル

## モード

### ticker

コメントカード自体が画面下部を横方向に流れるモードです。コメントを読み切らせるより、配信画面の下部にコメントの流れを添える用途に向いています。

### stack

コメントカードを画面下部に横積みするモードです。新着時はカード列全体が横にスライドし、古いカードは画面外へ押し出されてから削除されます。本文は指定行数まで折り返して表示します。

## 主要設定

| 項目 | 内容 |
| --- | --- |
| `UNDERBAR_LAYOUT_MODE` | `ticker` で横流し、`stack` で横積み |
| `UNDERBAR_DIRECTION` | `rtl` で右から左、`ltr` で左から右 |
| `UNDERBAR_LANES` | コメントレーン数 |
| `UNDERBAR_SCROLL_MS` | 画面横断時間 |
| `UNDERBAR_CARD_MIN_WIDTH` | コメント枠の最小横幅 |
| `UNDERBAR_CARD_WIDTH` | コメント枠の最大横幅 |
| `UNDERBAR_CARD_HEIGHT_PX` | コメント枠の高さ |
| `UNDERBAR_STACK_MAX_ITEMS` | stackモードの最大表示件数 |
| `UNDERBAR_STACK_EXIT_CARDS` | stackモードで画面外へ押し出してから削除する距離 |
| `UNDERBAR_STACK_CARD_HEIGHT_PX` | stackモードのカード高さ |
| `UNDERBAR_STACK_MESSAGE_LINES` | stackモードの本文表示行数 |
| `UNDERBAR_STACK_SLIDE_MS` | stackモードの横スライド時間 |
| `UNDERBAR_LANE_HEIGHT_PX` | レーン間隔 |
| `UNDERBAR_BOTTOM_PX` | 画面下からの表示位置 |
| `UNDERBAR_MIN_GAP_PX` | 同じレーンで前後コメントに空ける最低距離 |
| `COMMENT_OVERFLOW_MODE` | `clip` で省略、`marquee` で枠内横スクロール |

## 現在の実装メモ

- MVPとして「名前＋本文」の2行相当で高さが暴れない設計にしています。
- コメント枠の横幅は内容に応じて可変になり、`UNDERBAR_CARD_WIDTH` を上限にします。
- `stack` モードでは下部1段にカードを横積みし、本文を指定行数まで折り返して表示します。
- `stack` モードではカード列全体を横トラックとしてスライドさせ、古いカードはスライド後に削除します。
- `UNDERBAR_STACK_EXIT_CARDS` で、画面外へ最大カード幅の何枚分ほど押し出してから削除するかを調整できます。
- `stack` モードの本文内縦スクロール演出は未実装です。まずはモード切替の土台のみ入れています。
- コメントごとに空きが早いレーンを選び、同じレーンで追突しにくい発車待ちを入れます。
- 可変幅コメントでも見た目の速度が近くなるよう、推定幅に応じて横断時間を補正します。
- `AUTO_HIDE_MS` を 0 より大きくすると、横断完了前でもその時間で削除します。
- `COMMENT_TRANSLATION_MODE: "both"` は表示行数が増えるため、Underbar用途では `original` または `translated` 推奨です。
- 固定コメントは通常コメントと同じ扱いです。横向きUnderbarでは固定表示専用枠は設けていません。
- `stack` モードでは、連投タイミングによってまれにカード列が一瞬戻るように見える場合があります。通常運用で大きく破綻しない範囲なら既知挙動として扱います。

## 調整の目安

- 下に詰めたい場合は `UNDERBAR_BOTTOM_PX` を小さくします。OBSや配信画面のセーフエリアに合わせて `16〜28px` くらいが扱いやすいです。
- `ticker` のレーン間の隙間は `UNDERBAR_LANE_HEIGHT_PX - UNDERBAR_CARD_HEIGHT_PX` で決まります。標準値では `104 - 92 = 12px` です。
- `stack` は `UNDERBAR_STACK_MAX_ITEMS` と `UNDERBAR_CARD_WIDTH` の掛け合わせで横幅が決まります。退場を画面外で処理したい場合は `UNDERBAR_STACK_EXIT_CARDS` を `1〜2` にします。
- 高速チャットでは、`ticker` は `UNDERBAR_LANES` を増やすか `UNDERBAR_MIN_GAP_PX` を小さくすると流量が増えます。見やすさ優先なら標準値のままがおすすめです。

## ライセンス

MIT LICENSE
