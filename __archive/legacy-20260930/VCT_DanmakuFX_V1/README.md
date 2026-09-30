# VCT DanmakuFX V1

OneComme commentsから絵文字とYouTubeカスタム絵文字だけを抽出し、Canvas2D上でランダムな弾幕エフェクトとして表示するテンプレートです。

通常コメント本文は表示対象にしません。`?debug=1` または `CONFIG.DEBUG = true` のときだけ、左下に簡易コメントログを表示できます。

## Files

- `index.html` - OneComme/VCT loader entry
- `config.js` - DanmakuFX settings
- `parser.js` - CommentFX base parser bridge
- `engine.js` - emoji/custom emoji token extraction
- `fx.js` - Canvas2D renderer
- `style.css` - transparent OBS layout and debug log

## Main Settings

- `SOURCE_MODE`: `all`, `emoji`, or `custom`
- `PICKUP_RATE`: comment-level pickup rate
- `MIN_PICK_PER_COMMENT` / `MAX_PICK_PER_COMMENT`: token count sampled per comment
- `MAX_ACTIVE`: active drawn tokens
- `MAX_PARTICLES`: burst particle limit
- `EFFECT_DURATION_MIN` / `EFFECT_DURATION_MAX`: random display duration range in seconds
- `BURST_DURATION`: burst effect duration in seconds
- `EFFECTS`: weighted effect list
- `CUSTOM_EMOJI_USE_IMAGE`: draw custom emoji as image when URL is available
- `FALLBACK_TO_ALT_TEXT`: draw `alt` text if image is unavailable

## Effects

- `fall`
- `float`
- `wave`
- `spin`
- `burst`
