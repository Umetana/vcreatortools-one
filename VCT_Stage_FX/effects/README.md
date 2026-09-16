# 演出制作の基本形式

Heart・Stars・紙吹雪の描画部品と他ガジェットでの再利用は[共有部品](../../__docs/VCT_Stage_FX/EFFECT_PORTING.md)を参照してください。各Pluginフォルダだけでなく、effects/shared/celebration.jsとstyle.cssも必要です。FXではindex.htmlから一度読み込みます。

新規3演出は固有の数・サイズ・色・速度を持ち、ManifestのusesCommonCount:falseにより、選択中は共通の「基準表示数」を隠します。時間・強度・暗幕・待機制御は共通設定を使います。同フラグを省略した既存Pluginの挙動は変わりません。

`sample_effect` をひな形にします。フォルダを `effects/<id>/` とし、main.js、style.css、必要ならassetsを置きます。effects-list.jsへIDを追加するか、設定UIでフォルダ名を登録します。JSで `VCTStage.registry.register(id, EffectClass)` を呼びます。自動探索・外部インストールはありません。

```js
(function () {
class MyEffect {
  static manifest = { stageApi: 1, name: '演出名', lifecycle: 'host' };
  constructor(context, params) { this.context = context; this.params = params; }
  start() {
    const element = document.createElement('span');
    element.textContent = 'ようこそ';
    element.className = 'fx-my-message';
    this.context.root.appendChild(element);
    this.context.animations.animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'both' });
  }
  destroy() { /* 外部イベントなど、Context管理外の資源だけを解除する。 */ }
}
VCTStage.registry.register('my_effect', MyEffect);
})();
```

## Context

- `root`: この実行だけの描画先。削除・交換せず、classListと子要素を使う。
- `size`: 1920×1080の論理サイズ。画面のinnerWidthやvw/vhを移動量に使わない。
- `signal`: 終了時にabortされる。
- `timers.setTimeout(callback, ms)` / `clearTimeout(id)` / `wait(ms)`。
- `wait()` は通常完了でtrue、途中停止でfalse。非同期処理の後はsignalまたは戻り値を確認する。
- `animations.animate(element, frames, options)`: Web Animationsを登録し、終了時にcancelする。
- `assets.url('assets/image.png')`: Pluginフォルダ内の相対URL。
- `assets.ready(image)`: 成功でtrue、読込失敗・停止でfalse。
- `addCleanup(callback)`: 外部イベント解除等を登録する。
- `complete()`: effect終了型の正常終了をHostへ知らせる。
- `logger.warn/error`: 演出ID付きログ。

`lifecycle: 'host'` はparams.durationで終了、`'effect'` はcomplete()で終了します。いずれも15秒で強制終了します。start()のPromise解決は終了ではありません。constructorは参照の保持・設定整形のみとし、開始と終了通知を行わないでください。

Hostは正常終了・停止・例外を同じ後片づけへ集約し、destroyとContext破棄を一度だけ実行します。Pluginからdestroyを直接呼ばずcompleteを使います。

## パラメータと接続

現行main.jsはcount（1〜60）、duration（1200〜10000ms）、intensity（small/standard/large/extra）、bgOpacity（0〜0.7）、settings（発火時の設定コピー）を渡します。強度の表現はPluginが決め、負荷上限は守ります。Halloweenのような固有設定はPlugin内でsettingsから取り出します。

発火対象はmain.jsとtriggers.jsです。演出名の選択肢はManifestから自動生成します。Runtime本体に演出固有の分岐を追加しないでください。

`host.trigger(id, params)` は `{ status: 'started' | 'queued', id }` または `{ status: 'rejected', reason }` を返します。非同期で始まった後の失敗はログと破棄で扱うため、startedは最後までの成功保証ではありません。`host.stop(id)`、`host.stopAll()`、`host.destroy()` が停止APIです。

CSSは `fx-<固有名>-` を使い、bodyや汎用クラスを変更しないでください。入力文字列はtextContentへ渡します。画像を追加する場合は出典・ライセンス・AI生成の有無をREADMEとManifestに記載してください。これは信頼する同梱コード向けの契約で、任意Pluginの安全性を保証する仕組みではありません。

## 一覧とPlugin固有設定

`effects-list.js` の配列は配布時の標準一覧です。サークルは常に復帰先として有効です。標準一覧の他の演出はUIで無効化・有効化でき、追加登録した演出は登録解除できます。登録解除は実行中・待機中の対象演出を停止し、CSSを無効にします。ファイルは削除しません。読み込み済みJSは再追加に備えて保持するため、コードを更新した場合はソースを再読み込みしてください。

IDは英字で始まる英数字・アンダースコア・ハイフンの64文字以内で、フォルダ名とregisterのIDを一致させます。main.jsとstyle.cssは必須です（CSS不要でも空ファイルを配置）。追加登録は32件まで。各ファイルの読込待ちは8秒で打ち切り、失敗したPlugin以外は利用できます。フォルダ探索や外部URLからのインストールは行いません。

Manifestへ任意の `settings` を定義すると、設定UIと初期値へ反映されます。値は従来どおり `params.settings` から取得します。

```js
settings: {
  MY_EFFECT_TEXT: { type: 'text', label: '表示文字', default: 'ようこそ' },
  MY_EFFECT_MODE: { type: 'select', label: '種類', default: 'small',
    options: ['small', 'large'], labels: { small: '小', large: '大' } }
}
```

キーは大文字英字で始まる英数字・アンダースコアとし、固有の接頭辞を付けて基盤や他Pluginと重複させないでください。typeはcheckbox、select、text、color、range、range-number、numberに対応。labelとdefaultは必須、範囲入力はmin/max/stepも指定します。defaultは文字列・数値・真偽値です。設定の優先順位はPlugin初期値→config.js→保存値です。Halloweenの既存保存キーは維持しています。

Pluginはテンプレートと同じ権限で実行される信頼済みのローカルJavaScriptです。読み込み時のトップレベルでは登録だけを行い、必ずIIFE等で変数を閉じてください。ファイル検査はコードの安全性を保証しません。CSSは固有の範囲へ限定し、素材とコードのライセンスは各PluginのREADMEに記載してください。
