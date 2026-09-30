# view comment Underbar V2 v1.0.0 Technical Spec

## 概要

`view_comment_Underbar_V2` は、わんコメコメントを画面下部へ表示するUnderbar型テンプレートです。

コメント解析、イベント分類、翻訳表示、バッジ抽出は `custom_base_template_V2_7_dev` と同系統の VCT SDK を使用します。表示面は `ticker` と `stack` の2モードを持ちます。

## 表示方式

### ticker

- `comments` 配列に受信コメントを追加する。
- コメント追加時に `laneIndex` を付与する。
- `laneIndex` は `UNDERBAR_LANES` の範囲で順番に割り当てる。
- `.cmt-shell` は絶対配置され、`--lane-index` と `--scroll-duration` をCSS変数として受け取る。
- `UNDERBAR_DIRECTION` により `underbar-scroll-rtl` または `underbar-scroll-ltr` を使用する。
- `AUTO_HIDE_MS` が 0 の場合は、横断時間 + 800ms 後にコメントを削除する。
- `AUTO_HIDE_MS` が 1 以上の場合は、その値を削除タイマーとして優先する。

### stack

- `comments` 配列に受信コメントを追加する。
- レーンは1段固定で、コメント枠を下部に横並びする。
- `UNDERBAR_DIRECTION: "rtl"` では新着が右側、`"ltr"` では新着が左側に入る。
- 新着追加時はカード列全体を `UNDERBAR_STACK_SLIDE_MS` で横スライドさせる。
- 最大件数超過時も、古いコメントが画面幅 + `UNDERBAR_STACK_EXIT_CARDS` 相当の距離だけ押し出されるまで保持する。
- 古いコメントの削除は、次のコメント追加直前のオーバーフロー整理で行う。スライド完了直後にはDOM削除しない。
- `AUTO_HIDE_MS` が 0 の場合は自動削除せず、最大件数で押し出す。

## 主要設定

| 設定 | 内容 |
| --- | --- |
| `UNDERBAR_LAYOUT_MODE` | `ticker` / `stack` |
| `UNDERBAR_DIRECTION` | `rtl` / `ltr` |
| `UNDERBAR_LANES` | レーン数 |
| `UNDERBAR_SCROLL_MS` | 画面横断時間 |
| `UNDERBAR_CARD_MIN_WIDTH` | コメント枠の最小横幅 |
| `UNDERBAR_CARD_WIDTH` | コメント枠の最大横幅 |
| `UNDERBAR_CARD_HEIGHT_PX` | コメント枠の高さ |
| `UNDERBAR_STACK_MAX_ITEMS` | stackモードの最大表示件数 |
| `UNDERBAR_STACK_EXIT_CARDS` | stackモードで画面外へ押し出してから削除する距離 |
| `UNDERBAR_STACK_CARD_HEIGHT_PX` | stackモードのカード高さ |
| `UNDERBAR_STACK_MESSAGE_LINES` | stackモードの本文表示行数 |
| `UNDERBAR_STACK_SLIDE_MS` | stackモードの横スライド時間 |
| `UNDERBAR_LANE_HEIGHT_PX` | レーンの縦間隔 |
| `UNDERBAR_BOTTOM_PX` | 画面下からの位置 |
| `UNDERBAR_SIDE_PADDING_PX` | 画面外の開始・終了余白 |
| `UNDERBAR_MIN_GAP_PX` | 同一レーン内で前後コメントに空ける最低距離 |
| `COMMENT_OVERFLOW_MODE` | `clip` / `marquee` |
| `MESSAGE_MARQUEE_MS` | 枠内横スクロール時間 |

## 長文制御

MVPではカード高さを固定し、名前行と本文行が基本の2行相当になるようにしています。

カード横幅は内容に応じて可変になり、`UNDERBAR_CARD_MIN_WIDTH` から `UNDERBAR_CARD_WIDTH` の範囲に収まります。
可変幅でも速度差が目立ちにくいよう、推定カード幅からコメントごとの横断時間を補正します。
同じレーンのコメントは、前コメントの推定幅と `UNDERBAR_MIN_GAP_PX` を元に発車待ちを入れます。

`COMMENT_OVERFLOW_MODE: "clip"` では本文を1行で省略します。
`COMMENT_OVERFLOW_MODE: "marquee"` では本文パーツを複製し、カード内で横スクロールさせます。

`stack` モードでは本文を `UNDERBAR_STACK_MESSAGE_LINES` の行数まで折り返して表示します。本文エリアだけを縦自動スクロールする演出は今後の拡張候補です。

## 今後の拡張候補

- レーン衝突を避けるための空き時間ベース割り当て
- 3行カードと本文エリアだけの縦自動スクロール
- コメント種別ごとの速度・幅・レーン優先度
- 固定コメントやスパチャだけ別レーンに流すモード

## 既知メモ

- `stack` モードでは、連投タイミングによってカード列が一瞬戻るように見える場合があります。通常の演出用途では大きな破綻ではないため、v1.0.0では既知挙動として扱います。
- 固定コメントは通常コメントと同じカード表示です。専用の固定枠は横向きUnderbarの主用途と合わないため未実装です。
