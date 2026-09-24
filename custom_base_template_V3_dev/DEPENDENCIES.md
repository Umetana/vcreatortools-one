# 同梱物と実行時依存の確認記録

確認日：2026-09-17。

| 対象 | 区分・確認結果 |
|---|---|
| ベースのHTML/JS/CSS、演出サンプル | 作者Umetanaのコード。V2.8を流用・改修。ルートLICENSEはMIT、Copyright (c) 2026 Umetana |
| lib/vct_sdk.js、VCT_SDK_SPEC.md | VCT SDK 2.0.3-devを継承。lib/LICENSEはMIT、Copyright (c) 2026 Umetana |
| settings/inline-color-picker | 作者製共通UIをV2.8から継承。ユーザーの作者確認と共通UIのREADMEを根拠とする。独立した第三者ライブラリの取込は確認されていない |
| Vue / OneSDK | ../__origin/js/vue3.min.js、onesdk.jsを実行時に参照。このフォルダへ複製していない。自作コードのMITをこれらへ適用しない |
| M PLUS 1p | style.cssのGoogle Fonts外部読込を継承。フォントファイルは同梱しない。ネットワーク・取得可否により表示が変わり、取得できない場合はFONT_FAMILYの代替へ移る |
| Playwright / Chrome | 開発時のブラウザ検証に使用。配布フォルダにライブラリ・ブラウザを同梱しない |

自作コードであることはユーザーの申告、MIT表記はローカルLICENSE、外部参照はindex.html・style.css・SDK実装の参照確認に基づく。

公式の[制作ガイドライン](https://onecomme.com/developer-guidelines)、[利用規約](https://onecomme.com/terms/)、[テンプレートSDK](https://onecomme.com/docs/developer/onesdk-js/)を確認。Vue・OneSDKの参照を継承し、SDK内部APIを直接呼ぶ処理は追加しない。無料利用時のクレジットはREADMEで案内する。

公式ガイドの型リファレンス対象は現在9.1.1と記載されている。V3の実機対象版は未検証で、既存製品のalpha版確認結果をV3の確認結果として引き継がない。
