# VCreatorTools

VCreatorTools（VCT）は、わんコメ向けのカスタムテンプレート、開発用ライブラリ、関連ツールをまとめたコレクションです。

コメント表示テンプレート、配信支援ツール、開発ベーステンプレートなどを収録しています。

## 収録内容

### Core / SDK

* `_vct_core/`

  * VCT Core
  * テンプレート間で共有するデータ管理基盤
  * ユーザー情報、支援履歴などの共有データを管理

* `vct_sdk.js`

  * VCT SDK V2系
  * コメントデータの正規化ライブラリ
  * スパチャ、メンバーシップ、メンギフなどを共通形式で扱うためのSDK
  * V1系に混在していた新仕様とLegacy仕様を整理しLegacyを削除
  * V1系固有の不具合や多重処理を修正

* `vct_one_core.js` 最終版 v1.2.7

  * VCT SDK V1系、旧仕様
  * コメントデータの正規化ライブラリ
  * スパチャ、メンバーシップ、メンギフなどを共通形式で扱うためのSDK

* `Ms.Bridge_V2/`

  * わんコメとVCreatorToos appを連携するためのBridgeテンプレ
  * OneSDKより購読したコメントなどをVCTSDKで正規化しVCreatorToos のローカルサーバーへ送信します
  * テンプレ自体は購読と送信のみでコメントなどのわんコメ由来データの保存は行わない。

### Development

## VCT SDK V2系

* `custom_base_template_V2_8_dev/`

  * `custom_base_template_V2_7/`をベースにVCT SDK V2仕様

* `comment_raid_base_V2/`

## VCT SDK V1系

* `CommentFX_base_V2_6/`
* `custom_base_template_V2/`

  * VCT SDK対応のカスタムテンプレート開発ベース
  * 新規コメント表示テンプレートの作成に利用可能

* `custom_base_template_V2_7_dev/`

  * `custom_base_template_V2/`をベースに設定UI内蔵、リアルタイムプレビュー追加のテスト版

### Templates

コメントビューアや配信支援向けの各種テンプレートを収録しています。

## VCT SDK V2仕様

* `VCT_InfoHUD_V2/`
* `VCT_SB_V2/`
* `VCT_SB_V2_UI/`

* `view_comment_halloween_V2`
* `view_comment_Halloween_StageFX_V2_dev`

* `view_comment_flash_v2.1/`

* `view_comment_V3/`
  * Heart,Stars,Flash,Underbar等を統合しテンプレ1つで使い分けられるようにしました。

## VCT SDK V1仕様

* `view_comment_flash_v2/`
* `view_comment_heart_v2/`
* `view_comment_stars_V2/`
* `VCT_clock_V1/`
* `VCT_InfoHUD_V1/`
* `VCT_SB_V1/`
* `VCT_SB_V1_UI/`
* `VCT_support_thanks/`
* `V_Telop_SYSTEM_V1/`
* `Ms_Tally_v0_6/`
* `Welcome_Celebration_V2/`

各テンプレートの詳細は、それぞれのフォルダ内の README を参照してください。

## 利用方法

1. 使用したいテンプレートのフォルダを選択します。
2. テンプレートごとの README を確認します。
3. わんコメのカスタムテンプレートとして配置して利用します。

## 開発について

VCT SDK を利用することで、コメント解析処理をテンプレートごとに実装することなく、統一された形式でコメントデータを扱えます。

また、VCT Core を利用することで、テンプレート間で共有するデータベースやユーザー情報を管理できます。

## License

各フォルダに記載されたライセンスに従って利用してください。
