# 単体演出テンプレートの制作手順

1. フォルダ全体を複製し、別名を付けます。template.jsonのname・descriptionとindex.htmlのtitleを作品に合わせます。LICENSEの既存著作権表記は保持します。
2. SPEC.mdとPLUGIN_SPEC.mdを読み、effects/glow.jsを動かします。main.jsはカード表示、runtime/effect-host.jsは演出の呼出元です。
3. effects/glow.jsを別の名前で複製し、id・title・defaults・fields・mountを変更します。
4. template-definition.jsのeffectScriptを新しい演出ファイルへ変更します。これが演出の選択箇所です。利用者に登録作業は求めません。
5. mountで専用rootへ描画し、updateで設定変更を反映、destroyでタイマー・イベント・アニメーションをすべて解除します。
6. defaultsとfieldsへ同じキーを追加すると、共通設定パネルと保存対象へ反映されます。config_default.jsやsettings-panel.jsを演出ごとに編集する必要はありません。VCT対応版の公開時は同じ定義からVCT用契約を再生成します。
7. OBSの対話で通常・支援・メンバーを試し、設定更新・取消・保存・消去・連続追加・配置拡縮を確認します。ページ再読み込み後の保存値も確認します。

## AIへの依頼例
画像を使える演出は `material: { emoji: '✨' }` を宣言し、mountで `createMaterial(settings)` を呼んで返されたelementをrootへ追加してください。共通UIの定義は不要です。位置とアニメーションはモジュールで設定し、updateで素材を更新、destroyで素材とアニメーションを終了します。詳しくはPLUGIN_SPEC.mdの共通素材契約を参照してください。assetsフォルダは配布物に含め、画像の利用条件も保持します。

「このフォルダのAGENTS.md、SPEC.md、PLUGIN_SPEC.md、DEVELOPER_GUIDE.mdと最小サンプルを読んでください。支援・メンバーのカードに○○の演出を付ける単体テンプレートを作成してください。演出の設定項目は○○です。まず既存契約で実装できるか確認し、演出モジュールと選択箇所を変更してください。実装後は確認結果と未確認事項を報告してください。」

会話の履歴や特定のAIサービスは不要です。既存契約で表現できない要望が出た場合は、本体を黙って迂回せず、必要な契約変更と影響を説明してください。演出制作だけのために新規依存やビルドを導入しないでください。

## 確認コマンド
開発環境でPlaywrightを解決できる状態にして `node tests/browser.cjs` を実行します。Chromeが必要です。これは開発用依存であり、配布先にNode.jsやPlaywrightは不要です。
模擬試験はOBSや実OneSDKの検証を代替しません。SDK仕様を確認するときは同梱lib/VCT_SDK_SPEC.mdと、対応する公式の日本語資料を使ってください。

## 3.1を正本にした自作派生の保守

3.0は旧版として保持し、通常の改修は3.1に集約します。派生は新しいフォルダーへ複製し、次を分けて管理します。

| 区分 | ファイル | 更新時の扱い |
| --- | --- | --- |
| 派生固有 | template-definition.js、config.js、effects/、assets/、template.json | 共通更新で上書きしない。ID・版・演出選択・初期値の上書きをここに置く |
| 共通処理 | settings/、runtime/、main.js、effect-entry.js | 正本との差分を確認して更新。settings-schema.jsは基本項目定義、settings-contract.jsは共通検証 |
| 共通初期値 | config_default.js | 基本初期値。派生の上書きはconfig.jsに置き、ここへ混ぜない |
| 組立・表示 | index.html、style.css | 派生で外観を変更し得るため、機械的に上書きせず差分を取り込む |
| 外部依存 | lib/、settings/inline-color-picker/ | 独自に改変せず、版とLicenseを維持して更新 |

設定UIはsettings-schema.jsと演出fieldsから構成し、初期値はconfig_default.js→演出・素材defaults→config.jsの順に合成します。ローカル保存とVCT通信は同じ検証factoryを使います。VCT側で項目を手修正しません。

VCT開発リポジトリで、信頼する3.1フォルダーを明示して次を実行します。

```powershell
node sync-template-settings.js "<3.1テンプレートのフォルダー>"
node sync-template-settings.js "<3.1テンプレートのフォルダー>" --check
npm run sync:electron-public
npm run check:electron-public
```

生成対象は現在登録している1テンプレートです。別IDの自作派生を同時利用する際には、VCTの登録・保存先分離も追加する必要があります。このコマンドを別派生へ向けるだけで複数対応になるわけではありません。自動配布・派生への一括更新は今回追加しません。

項目追加は定義・defaultsと実際の描画処理へ反映し、契約を生成してテストします。キー削除・型変更・意味変更は既存保存データの移行方法とschemaVersionを検討します。VCTの完全値保存とテンプレートの差分保存の互換性を確認してください。UI・検証・通信の共通化は、描画処理や保存データの自動移行まで保証しません。

## 共通配置部品（2026-09-30）

`lib/placement-editor/v1` はVCTの共通配置部品を同梱した同期先です。単体起動時も外部Serverは不要。正本はVCT Serverの `public/V_CreatorTools/_vct_lib/ui/placement-editor/v1` で、同Repoの `node sync-placement-editor.js "<テンプレートフォルダー>"` で更新します。`--check` でコピーの一致を確認できます。同梱READMEにAPIと利用例があります。

`runtime/layout.js` はテンプレート固有のアダプターとして、DOM・1920×1080の配置・COMMENT系設定名・設定パネルのイベントを担当します。派生テンプレートでは部品を改造せず、この対応部分を調整します。VCT側の疑似キャンバスも同じ部品を使います。保存・通信・常時同期は部品の責務に含めません。部品化後はChromeの既存配置・保存取消を検証し、OBS実機は未確認です。
