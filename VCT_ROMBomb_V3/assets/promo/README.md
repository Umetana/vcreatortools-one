# ROM爆弾 サムネイル

BOOTH・テンプレート一覧用の正方形サムネイルです。製品バージョン番号は画像に含めません。

- `thumbnail.png`：BOOTH等へ掲載する1024×1024のPNG。
- `../../Thumb.jpg`：テンプレート一覧用の1024×1024のJPEG。
- 制作：2026-11-04、内蔵image_genによる画像生成。参照画像は本プロジェクトの `../visual/bomb.png` と `../visual/explosion.png`。公式ロゴ・実在のユーザー名・実アイコンは使用していません。
- 書き出し：生成結果をImageMagickで1024×1024へ縮小し、JPEG版を品質92で作成。テンプレート実行時に画像処理ツールは不要です。
- 表示しているカードは演出を説明するイメージです。アバターと名前は架空のサンプルです。

## 生成プロンプト

```text
Use case: ads-marketing.
Asset type: Finished Japanese product thumbnail for BOOTH and a streaming overlay template gallery. Square 1:1, 1024 x 1024 pixels.
Primary request: Create a polished, playful, slightly dangerous-looking promotional cover for the streaming interaction template named "ROM爆弾". This is a friendly audience-participation effect, not a weapon or military game.
Input images: Image 1 is the existing project's black spherical bomb artwork, use this exact recognizable bomb design with its short braided burning fuse, blue rim light and orange sparks. Image 2 is the existing project's stylized yellow-orange explosion artwork, preserve its friendly glossy cartoon appearance. These are supporting compositing inputs; integrate their designs prominently.
Background: deep midnight navy to almost black, subtle orange ambient glow and a few crisp sparks. Clear hierarchy, ample breathing room, not a busy explosion everywhere.
Layout: generous 55px outer safe margin. Top small mint/ivory text "コメントで解除！". Below it, enormous bold perfectly legible Japanese title "ROM爆弾" across the upper third. ROM in warm ivory and 爆弾 in orange-yellow with dark outline and controlled shadow; premium playful Japanese gaming graphic typography, sturdy block forms.
Central and lower-middle area: three floating, slightly tilted horizontal miniature listener cards stepping diagonally from lower-left toward upper-right, visually progressing normal -> danger -> explosion. Each card has a large simple rounded-square avatar on the left, a digital elapsed timer overlaid along the avatar's bottom edge, and the bomb/explosion to the right that grows and overlaps the avatar. The listener name must sit BELOW and OUTSIDE the card body, never inside a big UI frame. Make these look like polished actual streaming overlay cards, not trading cards or phones. Avatars are original flat generic pastel human silhouettes, no real people, brands or copyrighted characters.
Left smaller card: navy translucent body, timer "00:00", name "リスナーA", small black bomb.
Middle hero card: warm dark red body with orange/red rim glow, timer "19:59", name "リスナーB", very large black spherical bomb overlapping the avatar, centered in the composition. Make this bomb the central visual anchor.
Right card: orange glow, timer "20:00", name "リスナーC", bright orange-yellow explosion and a few scattering card fragments. Use visual progression through size, not arrows or instructional labels. Keep everything readable and comfortably separate from the title.
At the bottom a bold clear ivory tagline exactly "無言で育つ、配信演出。", with enough dark empty background behind it.
Small tasteful corner labels at bottom: "VCT" on left, "わんコメ用" on right. Text only, no official logo.
Constraints: Exact text as specified. NO version number. NO extra labels, pseudo-text, watermarks, prices, websites, official OneComme logo, service logo, real usernames, screenshots of browser chrome, monitor devices, fire destruction, military imagery. All content contained within square safe margins. High contrast and easily recognizable when reduced to 160px. The large product title and main bomb must dominate. Render final completed artwork, not a mockup presentation.
```
