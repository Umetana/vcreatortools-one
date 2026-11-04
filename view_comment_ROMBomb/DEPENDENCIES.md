# 流用元と依存関係

確認日：2026-11-02。

| 対象 | 流用・扱い |
| --- | --- |
| VCT SDK 2.0.3-dev | custom_base_template_V3_1_dev/libからvct_sdk.js・仕様・LICENSEを無改変で複製。MIT Copyright (c) 2026 Umetana |
| 設定保存 | 同ベースのsettings/config-runtime.jsを無改変で複製。フォルダー名別のlocalStorage差分保存を利用 |
| 設定UI | 同ベースのsettings-launcher.js・settings-panel.css・inline-color-pickerを複製。settings-panel.jsは専用確認表示・全体マウス配置・方式別の項目表示へ調整 |
| 設定検証 | 同ベースのsettings-contract.jsを無改変で複製し、本作のrom-settings.jsで時刻順・整数制約を追加 |
| 描画領域 | 同ベースruntime/layout.jsの1920×1080固定キャンバスへの縮小方式を専用描画へ流用。Vueは使用しない |
| マウス配置 | 同ベースlib/placement-editor/v1のJSを無改変で同梱し、READMEは利用方法中心に整理。ドラッグ・ホイール・縮小座標補正を流用し、設定連動は専用描画とパネルが担当 |
| OneSDK | ../__origin/js/onesdk.jsを実行時に参照。同梱・改変せず、公開APIのみ利用。動作確認したわんコメの版はTEST_RESULTSを参照 |
| アイコン・絵文字 | 受信データの画像URLとOSのUnicode絵文字表示。Google Fonts・効果音は追加しない |
| Visual mode素材 | 内蔵image_genで本プロジェクト用に生成した透過PNG2点をassets/visualへ同梱。入力画像なし。生成プロンプト・寸法・確認内容は同フォルダーのREADMEに記録 |
| 素材軽量化 | 制作環境に導入済みのImageMagick 7.1.2-3をtools/optimize_visual_assets.ps1から利用。原寸をasset_originalへ退避し、表示用を512pxの透過PNGへ縮小。ImageMagick本体は同梱せず、テンプレート実行時にも不要 |
| 自動検証 | 開発用Node.js標準モジュールとChrome。利用者側に追加インストール不要 |

わんコメの[制作ガイドライン](https://onecomme.com/developer-guidelines)、[利用規約](https://onecomme.com/terms/)、[テンプレート用SDK](https://onecomme.com/docs/developer/onesdk-js/)を参照している。公開APIとCommentDataのtimestamp・meta.type等を利用する。型リファレンスと利用するわんコメの対応版は、公式資料で確認すること。

VCT基盤と新規実装のMIT表記はルートLICENSE、SDKはlib/LICENSEを保持する。OneSDK・ユーザーアイコンなどへ自作部分のMITを適用しない。
