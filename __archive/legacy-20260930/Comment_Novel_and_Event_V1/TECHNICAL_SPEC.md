# Comment Novel and Event V1 Technical Spec v0.1

## 1. Scope

わんコメの受信イベントから投稿者名を使った短文を生成し、1920x1080論理キャンバス上へ表示する。
v0.1は`event`モードのみ実装し、`novel`、`scenario`、辞書editorは予約扱いとする。

## 2. Dependencies

- OneSDK
- VCT SDK v1.2.3
- `VCT.parseStructured().user.id`をユーザー識別に使用する
- `VCT.parseStructured().translation`にYouTube自動翻訳文がある場合は保持されるが、v0.1では表示切替は未実装
- ユーザーIDがない場合は`service.id + 正規化表示名`へフォールバックする

## 3. Configuration

設定の優先順位は次の通り。

```text
config_default.js -> config.js -> localStorage
```

LocalStorageキーは`vct.template-settings.<template-id>.v1`。
設定UIはv0.1対象外だが、将来UIから上書きできるruntimeを用意する。

イベント種別は`event.routes`で切り替える。各routeは`enabled`、`dictionaryFiles`、任意の`triggerRate`と`cooldownMs`を持てる。

## 4. Receive Pipeline

```text
comment ID dedupe
-> event.kind route
-> trigger rate
-> cooldown
-> recent triggered users / queued users dedupe
-> dictionary selection
-> queue
-> display
```

直近ユーザー履歴には、受信時ではなく実際に表示開始したユーザーを追加する。
Queue超過時の既定動作は`dropOldest`。表示中カードが`maxVisible`へ達している間はQueueで待機する。

`event.userDedupe.enabled: false`では、直近履歴・Queue内・表示直前のユーザー重複判定をすべて無効化する。コメントIDの重複排除はOneSDK再送対策として維持する。

`clear`受信時は表示中カード、Queue、直近ユーザー、コメントID履歴をリセットする。

## 5. Dictionary

辞書ファイルは`window.CNE_registerEventDictionary(dictionary)`を呼び出す。
辞書IDの重複は先着優先で、後続を警告して無視する。

必須フィールド:

```js
{
  id: "normal_chaos_001",
  title: "汎用カオスイベント",
  templates: ["{name} は {action} {result}"],
  words: {
    action: ["宝箱を開け"],
    result: ["ミミックに食われた"]
  }
}
```

組み込みプレースホルダー:

- `{name}`
- `{comment}`
- `{amount}`
- `{currency}`
- `{giftLabel}`
- `{giftCount}`

`words`のキーもプレースホルダーとして使用できる。未知キー、空配列、空テンプレートを持つ辞書は登録しない。

### Structured comment placeholder

`{comment}`は単純な文字列置換ではなく、VCT SDKの`message.parts`を元の順序でDOM展開する。

- `text`はテキストノード
- 通常絵文字はインライン画像
- スタンプは大きめのインライン画像
- HTML文字列は使用しない
- `{comment}`を含まない既存辞書の動作は変更しない

`event.commentDisplay`で演出用の上限を設定する。先頭から順に採用し、上限到達後の文字・絵文字・スタンプはまとめて省略する。

既定コスト:

- 文字・改行: 1単位
- 絵文字: 2単位
- スタンプ: 6単位
- メディア最大数: 4
- 全体上限: 36単位

この制限はコメント内容の完全な意味保持より、ネタ演出のテンポとカードの可読性を優先する。元コメント全文は配信サービスのコメント欄に残る前提とする。

## 6. Display

- 座標はカード中心基準
- `spawnMode`: `fixed`または`random`
- `allowOverflow: false`の場合はカード実寸を使ってキャンバス内へ補正
- DOMへは`textContent`で挿入し、名前やコメントのHTMLを解釈しない
- `durationMs`後にフェードアウトして削除
- 音声なし
- Phase 1の既定外観は白地・濃色文字・ピンクのアクセントを使用する
- 枠線、影、出現時間は`appearance.border`、`boxShadow`、`popDurationMs`で設定する
- 出現時は縮小・軽い回転からオーバーシュートする短いポップ演出を行う

### Appearance presets

以下の標準プリセットを提供する。

- `popup`: 白地の通知風
- `rpg`: 暗い茶系背景と金色枠
- `dark`: 青黒背景とシアン枠の丸いバッジ
- `rpg2`: 青背景と白枠
- `horror`: 黒赤のホラー表示
- `sf`: 青緑のSF表示
- `recipe`: 明るい料理カード
- `system`: 配信システム通知風

解決順は`appearance.preset`、旧形式のappearance直下設定、`appearance.overrides`の順とし、後の値を優先する。旧形式の直下設定はLocalStorageを含む既存設定との互換用に残す。

`appearance.dictionaryPresetMode`で辞書外観の利用可否を切り替える。

- `dictionary`: 辞書の`appearance`を適用する
- `global`: 辞書の`appearance`を無視し、全体プリセットへ固定する

```js
appearance: {
  preset: "dark",
  overrides: {
    cardMaxWidthPx: 520,
    fontSizePx: 40
  }
}
```

`fontFamily`と`cardMaxWidthPx`はプリセット間で共有する全体設定とする。

### Dictionary appearance

辞書は任意で外観メタデータを持てる。

```js
{
  appearance: {
    preset: "rpg",
    overrides: {
      accentColor: "#ffcf54"
    }
  }
}
```

優先順位:

```text
全体プリセット
-> 全体上書き
-> 辞書プリセット
-> 辞書固有上書き
-> イベント色
```

未定義の辞書プリセットは警告を出し、全体デザインへフォールバックする。辞書の`appearance.overrides`は許可された外観キーだけ使用できる。任意CSS文字列を辞書へ直接記述する方式は採用しない。

## 7. Event Routes

既定では`normal`のみ有効。以下は設定で個別に有効化できる。

- `superchat`
- `supersticker`
- `membership_gift`
- `member_join`
- `member_milestone`
- `membership_event`
- その他は`default`route

ギフト専用辞書を利用するかは利用者が`config.js`またはLocalStorage設定で決定する。

### Event color

`appearance.eventColor.enabled`が有効で、対象kindかつOneSDK元データに`colors`が存在する場合、VCT SDKの`style.colorStr`をカード背景へ使用する。通常コメント等で生成される既定白色はイベント色として扱わない。

イベント色適用時は可読性を優先し、文字・ラベル・枠を白へ上書きする。対象kind、文字色、枠、影は`appearance.eventColor`で変更できる。

加入・サブスクライブ系はOneSDK元データに`colors`を持たない場合がある。この場合は`eventColor.fallbackColors[kind]`を使用する。既定のメンバー系フォールバック色は緑。`useFallbackColors: false`でフォールバックを停止できる。

## 8. Debug

`debug: true`で除外理由とQueue状態をconsoleへ出力する。
同時に`window.CNE_DEBUG.emit()`と`clear()`を公開する。

## 9. v0.1 Completion

- OneSDKコメント受信
- VCT SDK v1.2.3正規化
- 種別別辞書ルーティング
- Rate、cooldown、重複排除、Queue
- 固定・ランダム表示
- 時間削除と`maxVisible`
- config三層マージ
- 辞書エラー時の部分継続
