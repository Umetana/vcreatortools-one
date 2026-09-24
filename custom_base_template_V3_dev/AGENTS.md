# V3派生制作の案内

- 日本語で応答・資料を記述する。最初にREADME.md、SPEC.md、PLUGIN_SPEC.md、DEVELOPER_GUIDE.mdを読む。
- 単体演出の制作ではeffects/とeffect-entry.jsを中心に編集する。最小サンプルはeffects/glow.js。
- 本体はmain.js、runtime/、settings/。既存契約で足りる場合は本体の変更を避ける。契約拡張が必要なら影響と仕様差分を明示する。
- 演出一つを組み込む。自動登録、利用者のプラグイン管理、複数演出切替は追加しない。
- 新しい設定はモジュールのdefaultsとfieldsに宣言し、共通パネル・保存を使う。
- destroyで生成物を後片付けし、通常／支援／メンバー、更新／取消／削除／連続表示を検証する。
- MITと既存著作権表記を保持する。依存関係はDEPENDENCIES.mdを確認する。
- ファイル変更・確認結果・未確認事項を報告する。模擬検証をOBS実機検証と記載しない。
