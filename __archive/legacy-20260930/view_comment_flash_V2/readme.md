# View Comment Flash V2 v1.0.0

VCT Core SDK v1.2.5-dev 対応の、わんコメ用コメント表示テンプレートです。
`custom_base_template_V2` をベースに、ギフト・メンバーシップコメントへのビジュアル演出を追加した配信向けコメントビュアーです。

---

## 主な機能

- Vue 3 + OneSDK によるコメント購読
- VCT Core SDK v1.2.5-dev の `parseStructured()` 対応（旧 `VCT.parse()` へのフォールバックあり）
- 通常コメント / スパチャ / Super Sticker / メンバーシップ加入・継続・ギフト / 固定コメントの表示
- ユーザー名、アイコン、バッジ、イベントラベル（スパチャ金額など）の分離表示
- イベント種別ごとの本文表示フィルター
- YouTube自動翻訳文の表示切り替え
- `config_editor.html` による設定の GUI 編集と上書き保存
- ギフト・メンバーシップコメントへのビジュアル演出（7種類）

---

## ギフト演出一覧 (GIFT_EFFECT)

ギフトやメンバーシップ系コメントに対して、以下の演出から1つを選択できます。

| 値 | 演出名 | 概要 |
| :--- | :--- | :--- |
| none | なし | 演出なし。フラットなすりガラス枠のみ |
| glow | 発光（グロー） | ギフト色のネオン調の光が枠の周囲ににじみ出します。 |
| shimmer | シマー | 発光に加え、斜めの柔らかい光の帯が約4秒周期で走り抜けます。 |
| glint | グリント | 発光に加え、カード右上で大小の星がきらっと輝きます（約5秒周期）。 |
| sweep | スイープ | 発光に加え、白く細い光のラインが素早くカードをスキャンします。 |
| aurora | オーロラ | 発光に加え、ギフト色グラデーションが色相を変化させながら波打ちます（約8秒周期）。 |
| trace | トレース | 発光に加え、ギフト色の光の粒子がカードの境界線に沿って周回スクロールします。 |

> Note: glow 演出（外周のネオングロー）は none 以外のすべての演出に共通して適用されます。

---

## 設定項目一覧 (config.js)

設定は `config_editor.html` をブラウザで開いてGUIから変更・保存するか、`config.js` を直接編集してください。

### 基本表示設定

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| MAX_ITEMS | 画面内に表示するコメントの最大数 | 8 |
| MAX_WIDTH | コメント枠の最大横幅 | "900px" |
| STACK_DIRECTION | 積み上げ方向 ("up" or "down") | "up" |
| ITEM_GAP_PX | コメント枠同士の縦の隙間 (px) | 4 |

### 要素表示・非表示

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| SHOW_ICON | アイコン表示 | true |
| SHOW_NAME | ユーザー名表示 | true |
| SHOW_BADGES | バッジ表示 | true |
| COMMENT_TRANSLATION_MODE | original / translated / both | "original" |
| MAX_COMMENT_UNITS | 本文の文字・絵文字換算上限（0で無制限） | 0 |

### イベント本文表示フィルター

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| SHOW_EVENT_MESSAGES | イベント本文のまとめ切り替え | true |
| SHOW_EVENT_MESSAGE_SUPERCHAT | スパチャ本文 | true |
| SHOW_EVENT_MESSAGE_SUPERSTICKER | スーパーステッカー本文 | true |
| SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT | メンバーシップ継続・マイルストーン本文 | true |
| SHOW_EVENT_MESSAGE_MEMBER_JOIN | メンバーシップ加入本文 | true |
| SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT | メンギフ送信本文 | true |
| SHOW_EVENT_MESSAGE_GIFT_RECEIVED | メンギフ受取本文 | true |

### フォント・テキスト

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| FONT_FAMILY | フォント指定（CSS font-family形式） | "M PLUS 1p", sans-serif |
| FONT_SIZE | 基本文字サイズ (px) | 24 |
| META_SCALE | 名前・バッジ行の相対サイズ倍率 | 0.8 |

### 演出・タイマー

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| AUTO_HIDE_MS | 自動非表示までの時間 (ms)。0で永続 | 0 |
| FADE_IN_MS | コメント入場アニメーション時間 (ms) | 300 |
| FADE_OUT_MS | コメント退場アニメーション時間 (ms) | 500 |

### ギフト・スパチャ設定

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| GIFT_EFFECT | ギフト演出の種類（上記一覧参照） | "shimmer" |
| GIFT_BG_OPACITY | ギフト枠の背景色の濃さ (0.0〜1.0) | 0.9 |
| GIFT_BORDER_OPACITY | ギフト枠の枠線の濃さ (0.0〜1.0) | 1.0 |

### カラー・スタイル詳細

| キー | 説明 | デフォルト |
| :--- | :--- | :--- |
| BG_GLASS | 通常コメント枠の背景色（rgba形式） | rgba(0,0,0,0.45) |
| BG_BLUR | 背景ぼかし強度 | "12px" |
| TEXT_MAIN | 本文文字色 | "#ffffff" |
| TEXT_NAME | ユーザー名の文字色 | "#eeeeee" |
| ACCENT_COLOR | ギフト色のデフォルト（色情報がない場合） | "#ffd700" |
| SHADOW_SOFT | コメント枠の基本シャドウ（CSS box-shadow形式） | "0 4px 12px rgba(0,0,0,0.3)" |

---

## ライセンス

MIT LICENSE
本テンプレートは改造・再配布自由です。
