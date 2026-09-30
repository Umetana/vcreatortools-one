# Comment Raid Base v2.1.0-dev

Comment Raid Base v2.1.0-dev は、わんコメ向けリアルタイム演出を **Core** と **Rule Pack (Plugin)** に分離した開発基盤です。  
本ドキュメントは「現在の実装」に合わせて、plugin author が `ctx / hook / manifest` を理解しやすい形で整理しています。

V2 では同梱旧SDKを廃止し、共通基盤 `../_vct_core/js/vct_sdk.js` (VCT SDK 2.0) を参照します。`VCT_SDK.normalize()` を1コメントにつき1回だけ実行し、その正規化結果をそのまま `ctx.commentData` としてプラグインへ渡します。

## 1. 目的

- Core を変更せずに、ルールやUIをプラグイン側で差し替える
- プラグインは hook で処理を差し込み、`state` と `ctx.events` で動作を構成する
- UI/CSS/追加JS は manifest で宣言して動的ロードする
- Base は「読まれる側」の共通基盤として扱い、個別の `CRB_*` テンプレートを参照・管理しない

## 1.1 責務境界

`comment_raid_base_v2` は、OneSDK コメント受信、VCT コメント解析 SDK の利用、`ENGINE` / hook / `state` / FX、plugin UI/CSS/script の差し込み機構だけを担当します。

個別の `CRB_*` テンプレートは Base を相対参照し、固有ルール、固有 UI、固有 DB wrapper、VCT 共通 DB との接続をテンプレート側で完結させます。Base は `VCT_IDB` や個別テンプレート用 DB を読み込まず、DB の存在も前提にしません。

外部テンプレートから Base を読む場合も、`window.CONFIG.PLUGINS` や manifest のパスはそのテンプレートの `index.html` から実際に解決できる形で指定してください。

## 2. 最小構成

```text
comment_raid_base_v2/
├── index.html
├── config.js
├── style.css
├── js/
│   ├── core/
│   │   ├── engine.js
│   │   ├── script.js
│   │   └── fx.js
│   └── plugins/
│       ├── _starter_kit/
│       │   ├── starter_logic.js
│       │   ├── starter_config.js
│       │   ├── plugin_manifest.js
│       │   ├── ui.html
│       │   └── style.css
│       ├── sample_counter/
│       │   ├── sample_counter_logic.js
│       │   ├── sample_counter_config.js
│       │   ├── plugin_manifest.js
│       │   ├── ui.html
│       │   └── style.css
│       └── raid_battle/
│           └── ...
```

## 3. プラグイン有効化

`config.js` の `window.CONFIG.PLUGINS` に、エントリープラグイン（通常は `*_logic.js`）を設定します。

```js
window.CONFIG = {
  PLUGINS: [
    "./js/plugins/raid_battle/raid_logic.js"
  ]
};
```

## 4. plugin author 向け要点

- hook 実行順: `onInit` -> `onUpdate`(毎フレーム) -> コメントごとに `beforeComment` -> `onProcessAttack` -> `onCalculateDamage` -> `afterCalculateDamage` -> `afterComment`
- コメント処理用 `ctx` 主要フィールド: `commentData`, `events`, `dmg`, `attack`, `terminated`, `isBossAction`, `now`
- `ctx.commentData` は VCT SDK 2.0 の正規化結果です。本文は `message.text`、表示名は `user.displayName`、支援判定は `event`、通貨建て金額は `monetization.money` を参照します
- `ctx.events` に event を push すると `script.js` 経由で `FX.push()` に渡される
- `state` は全プラグイン共有。UI同期は `state.ui.status` を利用可能

詳細は以下を参照:
- `BASE_DEVELOPMENT_GUIDE.md`
- `BASE_TECHNICAL_SPEC.md`

`sample_counter` は Raid 非依存の最小サンプルです。  
`_starter_kit` が拡張用テンプレートであるのに対し、`sample_counter` は最小完成例として参照できます。

## 5. Manifest 運用方針

本 Base では、プラグインの追加資産は manifest ベースで管理します。

- 標準構成（`js/plugins/<plugin_name>/`）でも `plugin_manifest.js` で管理する
- **標準ディレクトリから外れる構成にする場合は、manifest で自己管理すること**
  - 例: `data/`, `assets/`, `ui/` を別階層に置く
  - 例: 複数JS/CSS/HTMLを段階的に読み込む
- Core はパス解決を自動補正しないため、manifest のパスは実際に読み込める相対/絶対指定にする

## 6. 実装上の注意

- 推奨表示サイズ: 1920x1080
- 変更後は OBS 側でキャッシュ更新を行う
- Base の JS (`js/core/*`) は変更せず、プラグイン側で拡張する

## 7. ライセンス

# コード
- 本プロジェクトのコード部分は **MIT License** の下で公開されています。
- 自由に使用・改変・再配布できます。

# わんコメ（OneComme）について
- 本テンプレートは **わんコメ（OneComme）** を利用して動作します。
- 使用にあたっては **わんコメの利用規約に準拠してください。**

## 8. 更新履歴

- v2.1.0-dev (2026-08-17)
  - `ctx.commentData` を既存互換アダプタ形式から VCT SDK 2.0 正規化結果の直渡しに変更
  - プラグイン側の参照方針を `message.text` / `user.displayName` / `event` / `monetization.money` に整理
  - `template.json` に `version` を追加
- v2.0.0 (2026-06-12)
  - Base V1をフォークし、VCT SDK参照を `../_vct_core/js/vct_sdk.js` に移行
  - `VCT_SDK.normalize()` をコメント正規化の入口に変更
  - `ENGINE.extractGiftPrice()` は `ctx.commentData.monetization.money.amount` を優先し、ジュエル数やメンギフ件数を通貨金額として扱わない
- v1.1.1 (2026-03-14)
  - ログの切り分けロジックを改善（お名前に「の」が含まれるリスナーの表示崩れを修正）
- v1.1.0 (2026-03-12)
  - 動的 UI/CSS/Script ロード（manifest 方式）を正式化
  - plugin author 向けに責務分離を強化


## セキュリティ対応（2026-09-30）

コメント本文・名前・イベントの `log` をHTMLとして再解釈しないよう、ログと簡易コメント欄の出力をエスケープします。`event.log` はプレーンテキストとして扱い、HTML装飾は解釈しません。絵文字画像はHTTP(S)のURLのみを許可し、属性値もエスケープします。未許可URLは代替文字を表示します。非表示のコメント欄も同じ対策を適用します。

回帰検証: `node comment_raid_base_v2/tests/security.cjs`（開発用Playwright・Chromeが必要）。実わんコメ・OBSでの検証は別途必要です。
