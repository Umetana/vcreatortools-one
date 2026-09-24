# 演出モジュール契約 API 1

このベース専用の契約です。わんコメ本体のプラグインAPIやVCT Stage FXのAPIとは別です。

## 登録
effect-entry.jsで一つのJSファイルを指定します。そのスクリプトはwindow.VCT_EFFECTへ次のオブジェクトを設定します。ES Modulesやfetchは必須にせず、ローカルファイルで読み込める通常のスクリプトを使います。

| 名前 | 内容 |
|---|---|
| apiVersion | 数値1 |
| id / title | 制作者向けIDと設定欄の日本語タイトル |
| defaults | 演出設定の初期値。キーはFX_演出名_項目名とし、本体設定と衝突させない |
| fields | defaultsと同じキーの設定項目。typeとlabelを持つ。最小例はnumber/color |
| mount(context) | 同期関数。update(settings)とdestroy()を持つオブジェクトを返す |

サンプルはeffects/glow.jsが実際に動作する正本です。非同期mountには対応しません。読み込み失敗・API版違いではコメント表示を継続し、演出を出しません。

## context
- root: 本体が用意したカード上の専用描画先。カードと同じ寸法で、ポインター操作は透過します。要素はここへ追加してください。
- settings: defaultsに定義したキーだけを取り出した現在値。モジュール側で型・範囲を確認してください。
- comment: isSupportとisMembershipの真偽値。RAW・本文・個人情報は渡しません。追加情報が必要なら仕様と本体の契約を明示的に拡張します。

## 絵文字・画像の共通素材（任意）
モジュールに `material: { emoji: '✨' }` を宣言すると、共通素材UIと `context.createMaterial(settings)` が有効になります。宣言のないモジュールにはUIを出さず、従来どおり動作します。API 1の追加オプションです。

共通設定は `FX_MATERIAL_MODE`（初期emoji、imageへ切替）、`FX_MATERIAL_FILE`（初期空欄）、`FX_MATERIAL_SIZE`（初期32、1～512px）です。宣言したモジュールのsettingsにはこれらも渡され、変更時にはupdateが呼ばれます。この3キーは本体予約キーとして扱い、モジュールのdefaults/fieldsへ重複定義しないでください。

createMaterialは `{ element, update(settings), destroy() }` を返します。elementをrootへ追加し、位置・個数・アニメーションはモジュールで実装します。モジュールのupdateから各素材のupdateを呼び、destroyから各素材のdestroyを呼んでください。素材を複数生成した場合は全て破棄します。サンプルはeffects/glow.jsです。

素材の枠は指定pxの正方形です。画像はobject-fit:containで長辺を合わせ、縦横比を保持します。画像読み込み中・失敗時は宣言した絵文字を表示します。設定パネルの素材プレビューにも読込状況を表示します。モード変更・破棄後に古い読み込み結果を適用しません。

画像はassets配下のPNG/JPEG/WebP/GIF。ファイル名は任意で、日本語・空白・サブフォルダに対応します。UI入力にはassets/を含めず `stars/star.png` のように指定します。外部URL、絶対パス、上位フォルダ参照は受け付けません。画像ファイル自体は保存・複製せず、localStorageには設定値だけを保存します。

## ライフサイクル
支援・メンバーのカードに対して本体がmountを呼びます。通常・固定のみのカードには呼びません。設定の演出有効がOFFなら呼びません。
演出設定が変わるとupdateを呼びます。変更のない再描画では呼ばないため、不要なアニメーション再開始を避けられます。取消もupdateで元の値へ戻します。
カード削除、演出OFF、ページ終了ではdestroyを呼びます。ONへ戻すと残る対象カードへ再度mountします。
本体は例外を捕捉し専用rootを除去しますが、モジュールが作ったタイマー・イベント・アニメーションの解除責任はモジュール側にあります。mount途中で失敗する場合も、確保済みリソースを自分で解放してから例外を投げてください。

## 制限
コメント領域の外は本体でクリップします。カードからはみ出す光や粒子も領域の境界で切れます。境界で見切れただけではカード削除やdestroyは発生しません。
本体DOM・コメント配列・OneSDK・localStorageへ直接アクセスしないでください。保存と判定は本体が担当します。window.CONFIGを書き換えず、設定値は渡されたsettingsから読みます。
外部CSSを使う場合は演出固有クラスを付け、他のカードや設定パネルへ影響させないでください。CSSの読込はeffect-entry.jsからlink要素を追加するかindex.htmlに明示します。自動フォルダ走査は行いません。
