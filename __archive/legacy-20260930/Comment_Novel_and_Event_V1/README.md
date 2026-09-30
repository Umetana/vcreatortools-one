# Comment Novel and Event V1

コメント投稿者を使った短文イベントを自動生成する、わんコメ用カスタムテンプレートです。

v0.1は`event`モードのみ対応します。通常コメントは既定で有効、スパチャ・ステッカー・メンバー関連は`config.js`の`event.routes`で個別に有効化できます。

主な調整項目:

- `event.triggerRate`: 発動確率
- `event.cooldownMs`: 発動間隔
- `event.userDedupe.enabled`: 同一ユーザーの重複排除
- `event.recentUserWindow`: 直近発動ユーザーの重複排除件数
- `event.queue`: Queue件数、表示間隔、超過処理
- `event.routes`: イベント種別の有効化と辞書ファイル
- `event.maxVisible`: 同時表示数
- `event.durationMs`: 表示時間
- `appearance.border`: カード枠線
- `appearance.boxShadow`: カードの影
- `appearance.popDurationMs`: 出現アニメーション時間

表示プリセットは`config.js`で切り替えます。

```js
appearance: {
  preset: "popup",
  dictionaryPresetMode: "dictionary"
}
```

- `dictionary`: 辞書に外観指定があれば使用
- `global`: 辞書指定を無視して`preset`へ固定

スパチャやマイルストーンなど、元イベントに色がある場合はその色を背景へ利用できます。

```js
appearance: {
  eventColor: {
    enabled: true
  }
}
```

無効化する場合は`enabled: false`へ変更します。対象イベントは`eventColor.kinds`で選択できます。
加入・サブスクライブなど元データに色がないイベントは、`eventColor.fallbackColors`の色を使用します。`useFallbackColors: false`で無効化できます。

個別調整は`appearance.overrides`へ指定すると、選択中プリセットへ上書きされます。

```js
appearance: {
  preset: "rpg",
  overrides: {
    fontSizePx: 42,
    borderRadiusPx: 18
  }
}
```

辞書ごとに固有デザインを指定できます。

```js
window.CNE_registerEventDictionary({
  id: "horror_004",
  appearance: {
    preset: "horror",
    overrides: {
      fontSizePx: 40,
      borderRadiusPx: 4
    }
  },
  templates: ["{name} は {action}"],
  words: { action: ["振り返った"] }
});
```

未定義プリセットは全体デザインへフォールバックします。辞書から上書きできるのは許可された外観項目だけです。

辞書は`event/`以下のサンプルを複製し、固有IDを付けて利用します。詳細は`TECHNICAL_SPEC.md`を参照してください。

`{comment}`は文字、絵文字、スタンプを元の順序で表示します。演出用のため、長いコメントは先頭から設定上限まで表示して省略します。

```js
event: {
  commentDisplay: {
    maxUnits: 36,
    maxMediaItems: 4,
    emojiUnitCost: 2,
    stickerUnitCost: 6,
    overflowText: "…"
  }
}
```

文字は1単位、絵文字とスタンプは設定した単位数として数えます。

デバッグ時は`config.js`で`debug: true`にし、ブラウザconsoleから次を実行できます。

```js
CNE_DEBUG.emit({ name: "テストユーザー", comment: "こんにちは" });
```
