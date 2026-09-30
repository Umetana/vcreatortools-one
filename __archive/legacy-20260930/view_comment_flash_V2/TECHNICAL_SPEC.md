# View Comment Flash V2 - Technical Specification v1.0.0

本ドキュメントは `view_comment_flash_V2` の内部構造・演出実装の技術仕様です。
`custom_base_template_V2` をベースにフォークし、ギフト演出を追加しています。

---

## 1. システム構成

- Core: Vue.js 3 (Composition API)
- SDK: OneSDK / VCT Core SDK v1.2.5-dev
- Styling: Vanilla CSS + CSS Custom Properties

## 2. フォルダ構成

- `index.html`: エントリポイント。Vueテンプレート、ライブラリ読み込み、演出レイヤー（Glint / Trace SVG）の定義。
- `main.js`: OneSDK購読、VCT解析、表示用データ整形、コメント追加・削除を担当。
- `style.css`: コメントレイアウト、ギフト・メンバーシップ枠のテーマ、入退場アニメーション、7種のギフト演出定義。
- `config.js`: 実際に読み込まれる設定ファイル。
- `config_default.js`: 設定エディタのデフォルト復元用設定。
- `config_editor.html`: 設定変更用GUI。スキーマ駆動でフィールドを自動レンダリングし、File System Access API で直接上書き保存に対応。
- `lib/vct_one_core.js`: VCT Core SDK v1.2.5-dev（同梱）。

## 3. データ処理

`main.js` の `parseComment()` は `VCT.parseStructured(raw)` を優先して使用します。

主な表示データ:

- ユーザー: `parsed.user.displayName` / `parsed.user.profileImage` / `parsed.user.badges`
- 本文: `parsed.message.parts`
- YouTube自動翻訳: `parsed.translation.parts`
- イベント: `parsed.event.kind` / `parsed.event.isSupport` / `parsed.event.isMembership`
- 固定コメント: `parsed.system.isSticky`
- 強調色: `parsed.style.colorStr`（インラインで `--gift-color` に渡す）

`VCT.parseStructured()` が無い環境では、旧 `VCT.parse(raw)` でフォールバックします。
`COMMENT_TRANSLATION_MODE` は `original` / `translated` / `both` を受け取り、翻訳がない場合は元文表示へフォールバックします。

## 4. CSS カスタムプロパティ設計

`main.js` の `updateStyle()` が `window.CONFIG` の値を `:root` に反映します。

主なプロパティ:

- `--gift-color`: ギフト枠のテーマ色。Vueバインドでインライン指定、未設定時は `.cmt-gift` で `var(--accent-color)`、`.cmt-member` で `#0f9d58` にフォールバック。
- `--gift-bg-opacity` / `--gift-border-opacity`: 枠の塗りつぶし・枠線強度。
- `--max-width`, `--font-size`, `--font-family`, `--icon-size`, `--meta-scale`, `--item-gap`, `--fade-in`, `--fade-out`, `--bg-glass`, `--bg-blur`, `--text-main`, `--text-name`, `--accent-color`, `--shadow-soft`

## 5. ギフト演出の実装詳細

演出クラスは `index.html` の `:class` バインドで、`config.GIFT_EFFECT` の値に応じて動的に付与されます。

### effect-glow（発光）

`none` 以外のすべての演出に共通して付与されます。
`box-shadow` の3層重ね（半径 8px / 25px / 50px）と白みを帯びた `border-color` でネオングロー効果を実現します。

### effect-shimmer（シマー）

`::after` 疑似要素で `linear-gradient`（115度、白い柔らかい帯）を定義し、`background-position` アニメーション（周期4秒）で左から右に移動させます。`border-radius: inherit` と `mix-blend-mode: overlay` により、カード内にのみ描画されます。

### effect-sweep（スイープ）

シマーと同様の構造ですが、グラデーションの帯幅を狭く（透明 42%〜58%）設定してシャープな光線にし、`cubic-bezier(0.25, 1, 0.5, 1)` で素早いスキャン感を演出します（周期4秒）。

### Glint（グリント）

`index.html` 内に `glint` 選択時のみ描画される `.cmt__glint-container` を配置します。大小2つのSVG四角星（4点星形パス）をカード右上角に重ね、それぞれ独立した拡縮・回転キーフレーム（`cmt-sparkle-primary` / `cmt-sparkle-secondary`）で時間差にきらめかせます（周期5秒）。

### effect-aurora（オーロラ）

`::before` 疑似要素を `z-index: -1` に配置し、ギフトカラーの明暗グラデーション（白〜黒ブレンド）の `background-position` を往復（周期8秒）させながら、`hue-rotate` を -35度〜+35度の範囲で別周期（12秒）交互にアニメーションさせます。元色のアイデンティティを維持しつつ、自然な色相変化を実現します。

### Border Trace（トレース）

`index.html` 内に `trace` 選択時のみ描画される `.cmt__trace-container` を配置します。内部の `<rect>` に `pathLength="100"` を指定してパス長を正規化し、`stroke-dasharray: 20 80`（光の帯の長さ20、空白80）と `stroke-dashoffset` を 100→0 にアニメーション（周期4秒）させることで、コメント枠のサイズに依存せず正確に1周するトレース効果を実現します。視認性のため線幅を3.5pxに設定し、`drop-shadow` の多重化で白い光彩コアを付与しています。

## 6. イベント本文フィルター

`SHOW_EVENT_MESSAGES` と `SHOW_EVENT_MESSAGE_*` で、イベント本文の表示を制御します。
詳細は `main.js` の `shouldShowEventMessage()` を参照してください。

## 7. フォーク・拡張時の変更ポイント

- `template.json`: テンプレート名と説明。
- `index.html`: タイトル、DOM構造、追加演出レイヤー。
- `main.js`: `normalizeComment()` 後のデータ加工。
- `style.css`: 配色、レイアウト、アニメーション。
- `config.js` / `config_default.js` / `config_editor.html`: 設定項目の追加・変更。
