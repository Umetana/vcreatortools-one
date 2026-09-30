# CommentFX Base v2.6 Technical Specification

## 1. Overview

CommentFX Base v2.6 is a base template for OneComme custom comment-effect templates.

The template receives OneSDK comments, normalizes them through VCT SDK (`vct_one_core.js`), converts normalized comments into FX events, and renders those events.

## 2. Version

- Template: `2.6.0`
- VCT SDK (`vct_one_core.js`): `1.2.1`
- Data model: VCT SDK structured event model

## 3. Runtime Flow

```txt
index.html
  -> config.js
  -> vct-loader.js
    -> _lib/vct_one_core.js or ../_vct_core/js/vct_one_core.js
    -> parser.js
    -> engine.js
    -> fx.js
    -> script.js

OneSDK comments
  -> CommentFXParser.parse(rawComment)
  -> ENGINE.onComment(commentData)
  -> FX.push(event)
```

## 4. File Responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | Defines `#fx`, `.comments`, script load entrypoints |
| `config.js` | User-facing configuration |
| `vct-loader.js` | Loads VCT SDK and app scripts in order |
| `parser.js` | Normalizes raw OneSDK comments |
| `engine.js` | Converts commentData into FX events |
| `fx.js` | Renders FX events with Canvas2D |
| `script.js` | Connects OneSDK to parser, engine, and FX |
| `style.css` | Base page and debug comment styles |
| `_lib/vct_one_core.js` | Bundled VCT SDK |

## 5. Loading Order

`index.html` loads `config.js` first.

`vct-loader.js` then tries VCT SDK paths in this order by default:

```js
[
  "./_lib/vct_one_core.js",
  "../_vct_core/js/vct_one_core.js"
]
```

After VCT SDK resolution, `vct-loader.js` loads app scripts in this order:

```js
[
  "./parser.js",
  "./engine.js",
  "./fx.js",
  "./script.js"
]
```

Templates may override SDK paths by setting `window.VCT_CORE_PATHS` before loading `vct-loader.js`.

## 6. Configuration

Default `CONFIG`:

```js
{
  TEMPLATE_VERSION: "2.6.0",
  HIDE_DEFAULT_COMMENTS: true,
  MAX_ACTIVE: 30,
  FONT_SIZE: 36,
  EFFECT_DURATION: 3.0,
  FX_INTENSITY: 1.0,
  USE_USER_COLOR: true,
  CLEAR_ON_ONESDK_CLEAR: true,
  DEBUG: false
}
```

Current base implementation uses:

- `HIDE_DEFAULT_COMMENTS`
- `MAX_ACTIVE`
- `FONT_SIZE`
- `EFFECT_DURATION`
- `FX_INTENSITY`
- `CLEAR_ON_ONESDK_CLEAR`
- `DEBUG`

`USE_USER_COLOR` is preserved as a base setting for derived templates.

## 7. Parser Contract

Global:

```js
window.CommentFXParser = {
  parse,
  parseLegacy,
  normalizeStructured
}
```

### 7.1 Primary Path

If available, parser uses:

```js
VCT.parseStructured(rawComment)
```

It also calls `VCT.parse(rawComment)` when available and merges legacy-compatible fields with structured fields.

### 7.2 Fallback Path

If VCT SDK is not available or parsing fails, parser returns `parseLegacy(rawComment)`.

Fallback source lookup:

```js
rawComment.data
rawComment.payload.raw.data
rawComment.payload.data
rawComment.raw.data
rawComment.payload
rawComment
```

### 7.3 Returned commentData

Legacy-compatible fields:

```js
{
  id,
  text,
  user,
  screenName,
  profileImage,
  color,
  colorStr,
  badges,
  parts,
  imgUrls,
  vctCommand,
  hasGift,
  giftType,
  isSticky,
  membership,
  isOwner,
  isModerator,
  raw
}
```

Structured fields added by v2.6:

```js
{
  service,
  structured,
  event,
  monetization,
  membershipDetail,
  message,
  legacy,
  system,
  style,
  userDetail,
  isAnonymous,
  isFirstTime,
  isRepeater,
  giftLabel,
  giftImageUrl
}
```

### 7.4 Text and Parts

`text`, `parts`, and `imgUrls` prefer structured legacy fields when available:

- `structured.legacy.text`
- `structured.legacy.parts`
- `structured.legacy.imgUrls`

This preserves compatibility with older CommentFX-style templates while still exposing structured data.

## 8. Event Classification

VCT SDK v1.2.1 provides `commentData.event`.

Common `event.kind` values:

| kind | category | Meaning |
| --- | --- | --- |
| `normal` | `comment` | Normal comment |
| `superchat` | `support` | Super Chat |
| `supersticker` | `support` | Super Sticker |
| `membership_gift` | `membership` | Membership gift purchase |
| `membership_gift_received` | `membership` | Membership gift received |
| `member_join` | `membership` | New member |
| `member_milestone` | `membership` | Member milestone |
| `membership_event` | `membership` | Other membership event |

Typical `event` shape:

```js
{
  kind,
  category,
  isSupport,
  isMembership,
  isGiftSender,
  isGiftReceiver,
  giftCount,
  displayLabel,
  shouldShowMessage
}
```

## 9. Engine Contract

Global:

```js
window.ENGINE = {
  onComment(commentData)
}
```

`onComment` may return:

- `null`
- `undefined`
- a single event object
- an array of event objects

`script.js` normalizes the return value into an array before passing each object to `FX.push(event)`.

Base `engine.js` returns one generic event:

```js
{
  type: "comment",
  text,
  user,
  color,
  colorStr,
  imgUrls,
  parts,
  event,
  structured,
  monetization,
  membershipDetail,
  service,
  system,
  raw,
  life,
  scale,
  intensity
}
```

Derived templates should treat `engine.js` as the primary filtering and event-shaping layer.

## 10. FX Contract

Global:

```js
window.FX = {
  push(event),
  clear(),
  reset()
}
```

`FX.push(event)` receives event objects produced by `ENGINE.onComment`.

Base `fx.js` renders generic falling text/emoji items on `#fx` with Canvas2D.

Derived templates may replace `fx.js` entirely, as long as they expose the same `window.FX` contract.

## 11. OneSDK Bridge

`script.js` calls:

```js
OneSDK.setup({ mode: "diff" });
```

Subscriptions:

- `comments`: parse each comment, run engine, push events into FX
- `clear`: if `CONFIG.CLEAR_ON_ONESDK_CLEAR !== false`, call `FX.clear()`

When `OneSDK.ready()` resolves, the body `hidden` attribute is removed and `OneSDK.connect()` is called.

If OneSDK is unavailable, the body is shown and a debug warning is emitted when debug mode is enabled.

## 12. Debug Behavior

Debug is enabled when:

- URL has `?debug=1`
- URL has `?debug=true`
- `CONFIG.DEBUG === true`

Debug mode:

- emits console logs for parsed data and events
- shows default comment DOM
- enables `D` key toggle for `.comments`

## 13. Derived Template Guidance

Recommended edit targets:

1. `config.js`: expose settings
2. `engine.js`: filter and shape events
3. `fx.js`: render events
4. `style.css`: layout and visual style
5. `index.html`: add DOM layers if needed

Avoid editing unless necessary:

- `parser.js`
- `script.js`
- `vct-loader.js`
- `_lib/vct_one_core.js`

When editing parser or SDK files, verify:

- `VCT.parseStructured()` still exists
- `commentData.event.kind` still exists
- legacy fields used by older templates are preserved

## 14. Compatibility Notes

- v2.6 uses VCT SDK (`vct_one_core.js`) structured-event data.
- `VCT_CORE_PATHS` is the SDK path override used by `vct-loader.js`.
- v2.6 is intended for new structured-event templates and should be treated separately from older V1-v1.1.0 style templates.
