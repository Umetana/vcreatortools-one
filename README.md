# VCreatorTools

わんコメ・OBS向けのテンプレートと共通ライブラリです。わんコメ公式の製品ではありません。各フォルダのREADME・仕様書・ライセンスを確認して使用してください。

## 現行テンプレート

- `CRB_Nonogram_V2/`
- `CRB_sweetsheaven_v2/`
- `Ms.Bridge_V2/`
- `Ms_Tally_v0_6/`
- `OBS_gadget_v2_Onecomme/`
- `VCT_InfoHUD_V2/`
- `VCT_SB_V2/`
- `VCT_SB_V2_UI/`
- `VCT_Stage_FX/`
- `VCT_clock_V2/`
- `comment_raid_base_v2/`
- `custom_base_template_V2_8_dev/`
- `custom_base_template_V3_1_dev/`
- `custom_base_template_V3_dev/`
- `view_comment_Halloween_StageFX_V2_dev/`
- `view_comment_Halloween_V2/`
- `view_comment_Underbar_V2.1/`
- `view_comment_V3/`
- `view_comment_flash_V2.1/`
- `view_comment_heart_V2.1/`
- `view_comment_stars_V2.1/`

## 共通ライブラリ

- `_vct_core/`: VCT SDK 2系・共有IndexedDB基盤。SDK 1系の凍結版も互換用に保持します。
- `_vct_lib/`: 共通UI部品。
- `__shared/`: 既存の互換用資産。

## 配布ZIP

`__Release/` に現行パッケージを配置します。テンプレートが参照する共通ライブラリと、わんコメが用意する `__origin` が必要です。わんコメ本体は同梱しません。

## 旧版の保管

V1・旧SDK 1系のテンプレートと対応ZIPは `__archive/legacy-20260930/` へ退避しました。現行の配布・監査済み対象から外しています。互換性確認・履歴保存用であり、安全性を保証するものではありません。削除はしていません。

## 2026-09-30 同期

Raid共通描画のXSS対策、V2.8・View Comment V3の設定ファイル読込の安全化、旧エディタの除外を反映しました。開発ベースV3.1も追加しました。旧配布物を更新する場合、V2.8・View Comment V3内に残った `config_editor.html` を削除してください。

画像表示の通常動作は利用者のOBS確認報告に基づきます。攻撃耐性の確認はローカルの模擬入力で行っています。OBS本体の更新も別途必要です。
