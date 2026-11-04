# Visual mode 生成素材

2026-11-03、本プロジェクト用に内蔵image_genツールで新規生成した透過PNG。入力画像・公式ロゴ・第三者の参照画像は使用していない。外部AIへの実行時送信はなく、生成済みファイルをローカル表示する。

- `bomb.png`：爆弾。表示用512×512、RGBA。202,303 bytes。
- `explosion.png`：爆発。表示用512×512、RGBA。178,233 bytes。

生成時の原寸は両方1254×1254。2026-11-04、原寸を `../../asset_original/visual` へ無変更で退避し、このフォルダーの表示用画像をImageMagickのLanczosフィルターで512×512へ縮小、RGBA8のPNGとして圧縮した。原寸と表示用の対応・容量はasset_original/READMEを参照。

合計1,968,673 bytesから380,536 bytesへ約81%削減。表示時は従来どおりCSSで48pxへ収め、既存アニメーションで拡縮する。最大設定では48px×爆発倍率3×全体倍率3＝432pxとなり、512pxの素材で表示できる。原寸の退避先がコミット前の素材と完全一致すること、縮小後も隅がalpha 0であることを確認済み。

再処理は `tools/optimize_visual_assets.ps1` を実行する。導入済みのImageMagickを使う制作時専用処理で、テンプレート実行時には不要。既存の原寸は上書きせず、常に退避した原寸から縮小する。

## 生成プロンプト

以下は生成に使用したプロンプト原文。`transparent_background: true` を指定。

### bomb.png

```text
Use case: stylized-concept. Asset type: a single transparent PNG game UI sprite for a tiny livestream overlay card. Subject: one classic round charcoal-black cartoon bomb with a short curved braided fuse and a bright orange-yellow lit spark. Style: polished playful toy-like 3D illustration, soft rounded form, clean strong silhouette, subtle cool blue highlights, readable at 48 pixels. Center the entire bomb and fuse in a square canvas with narrow even transparent padding. Isolated on genuine transparent background, no floor, no cast shadow outside silhouette, no text, no logo, no border, no other objects. This will pulse and grow in a UI, so make a clear compact single object.
```

### explosion.png

```text
Use case: stylized-concept. Asset type: a single transparent PNG game UI sprite for a tiny livestream overlay card, matching a playful rounded 3D charcoal bomb. Subject: one compact comic explosion burst with a bright creamy yellow center, orange rounded flame lobes and a bold red-orange outer silhouette, a few short pointed rays integrated into the burst. Style: polished playful toy-like 3D illustration, rounded clean forms, crisp silhouette, readable at 48 pixels, not photorealistic fire. Center the entire burst in a square canvas with narrow even transparent padding. Isolated on genuine transparent background, no floor, no text, no logo, no border, no bomb, no scene, no separate debris or extra objects. This will pulse on a UI card.
```
