# Visual modeの原寸素材

2026-11-04、表示用素材を軽量化する前のPNGを、バイト列を変更せず保管した。実行時の参照先は引き続きassets/visualであり、このフォルダーは表示には使用しない。原寸保管用のため、通常配布時は省略できる。

| ファイル | 原寸 | 原寸容量 | 表示用容量 |
| --- | --- | ---: | ---: |
| visual/bomb.png | 1254×1254 RGBA | 1,111,013 bytes | 202,303 bytes |
| visual/explosion.png | 1254×1254 RGBA | 857,660 bytes | 178,233 bytes |

原寸SHA-256：

- bomb.png：`FB9A4F0EF977E58AFA2122FE4F518228C909E7300E4885149DA6B742DC909A0C`
- explosion.png：`90ADD180C0C76E494C84DAE20F4D8A381A63C70DDE778A923F84960831FA10CE`

生成方法とプロンプトはassets/visual/README.mdに記録している。原寸から表示用を作り直す場合はtools/optimize_visual_assets.ps1を使う。保存場所と対象2ファイルはスクリプト内で固定しており、退避済み原寸を上書きしない。
