# 単体演出テンプレートの制作手順

1. フォルダ全体を複製し、別名を付けます。template.jsonのname・descriptionとindex.htmlのtitleを作品に合わせます。LICENSEの既存著作権表記は保持します。
2. SPEC.mdとPLUGIN_SPEC.mdを読み、effects/glow.jsを動かします。main.jsはカード表示、runtime/effect-host.jsは演出の呼出元です。
3. effects/glow.jsを別の名前で複製し、id・title・defaults・fields・mountを変更します。
4. effect-entry.jsのscript.srcを新しい演出ファイルへ変更します。これが演出の選択箇所です。利用者に登録作業は求めません。
5. mountで専用rootへ描画し、updateで設定変更を反映、destroyでタイマー・イベント・アニメーションをすべて解除します。
6. defaultsとfieldsへ同じキーを追加すると、共通設定パネルと保存対象へ反映されます。config_default.jsやsettings-panel.jsを演出ごとに編集する必要はありません。
7. OBSの対話で通常・支援・メンバーを試し、設定更新・取消・保存・消去・連続追加・配置拡縮を確認します。ページ再読み込み後の保存値も確認します。

## AIへの依頼例
画像を使える演出は `material: { emoji: '✨' }` を宣言し、mountで `createMaterial(settings)` を呼んで返されたelementをrootへ追加してください。共通UIの定義は不要です。位置とアニメーションはモジュールで設定し、updateで素材を更新、destroyで素材とアニメーションを終了します。詳しくはPLUGIN_SPEC.mdの共通素材契約を参照してください。assetsフォルダは配布物に含め、画像の利用条件も保持します。

「このフォルダのAGENTS.md、SPEC.md、PLUGIN_SPEC.md、DEVELOPER_GUIDE.mdと最小サンプルを読んでください。支援・メンバーのカードに○○の演出を付ける単体テンプレートを作成してください。演出の設定項目は○○です。まず既存契約で実装できるか確認し、演出モジュールと選択箇所を変更してください。実装後は確認結果と未確認事項を報告してください。」

会話の履歴や特定のAIサービスは不要です。既存契約で表現できない要望が出た場合は、本体を黙って迂回せず、必要な契約変更と影響を説明してください。演出制作だけのために新規依存やビルドを導入しないでください。

## 確認コマンド
開発環境でPlaywrightを解決できる状態にして `node tests/browser.cjs` を実行します。Chromeが必要です。これは開発用依存であり、配布先にNode.jsやPlaywrightは不要です。
模擬試験はOBSや実OneSDKの検証を代替しません。SDK仕様を確認するときは同梱lib/VCT_SDK_SPEC.mdと、対応する公式の日本語資料を使ってください。
