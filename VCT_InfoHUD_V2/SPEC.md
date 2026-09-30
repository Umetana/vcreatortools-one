VCT_InfoHUD_V2 仕様書 v1.0.0-dev

1. 基本情報

テンプレート名：
VCT_InfoHUD_V2

バージョン：
v1.0.0-dev

目的：
OBS配信向けの下部固定型情報HUD。
わんコメコメント、同接、高評価、告知テキストを下部バーへ統合表示する。

設計思想：
コメントビューアではなく、配信情報HUDとして設計する。
コメントは配信情報、通知、告知、状態表示の一部として扱う。

2. 対象環境

OBS Studio
わんコメ
Browser Source
解像度 1920 x 1080 固定

レスポンシブ対応は行わない。
OBSでは index.html を表示し、上部の設定UIをクロップして下部HUDのみを配信画面に表示する。

3. 表示構成

HTML全体：
1920 x 1080 固定

表示ファイル：
index.html

HUD位置：
画面下部固定

HUD初期高さ：
260px

HUD表示構成：
[ 同接 ] [ 高評価 ] [ ログウインドウ ] [ 情報ウインドウ ]

メタエリアレイアウト：
default
compactMeta
gridMeta

default：
同接、高評価をそれぞれ縦長パネルとして表示する。

compactMeta：
左側2列を上下2段に分割する。
上段は空きスロットとして表示し、下段に同接、高評価を表示する。
空きスロットはOBS側で時計、画像、外部カウンターなどを重ねるための余白として扱う。
ログウインドウと情報ウインドウは全高表示を維持する。

ログ/INFO内容表示：
SHOW_LOG_CONTENT / SHOW_INFO_CONTENT で各ウインドウの見出しと内容を非表示にできる。
非表示時もHUD、パネル背景、枠線、レイアウト上の幅は維持する。
OBS側で画像、テキスト、別コメントビューアなどを重ねる用途を想定する。
非表示中もコメント受信とINFOローテーションは継続する。

gridMeta：
左側2列を上下2段に分割する。
上段は左右2つの空きスロットとして表示し、下段に同接、高評価を表示する。
空きスロットにはInfoHUD側では文字や画像を表示しない。
同接、高評価を手動表示に切り替えれば、下段も任意テキスト枠として利用できる。
ログウインドウと情報ウインドウは全高表示を維持する。

4. 設定UI

設定UIは index.html 内に含める。
OBS運用時は設定UI部分をクロップして使用する。

設定タブ：
基本
数値
ログ
ビジュアル
文字
情報文

接続状態：
わんコメ接続状態を常時表示する。

一時通知：
設定保存、読込元保存、保存済み設定削除などの操作通知を一時表示する。
通知は一定時間後に消える。

5. 設定読込仕様

設定読込元：
localStorage
config.js
内蔵初期設定

読込元指定キー：
vct_info_hud_load_source

通常設定保存キー：
vct_info_hud_config

読込元指定値：
auto
localStorage
configJs
builtin

auto：
localStorage > config.js > 内蔵初期設定

localStorage：
localStorage > config.js > 内蔵初期設定

configJs：
config.js > localStorage > 内蔵初期設定

builtin：
内蔵初期設定

読込元指定フラグのみ、常に localStorage に保存する。
最終設定は内蔵初期設定をベースにマージし、不足項目を補完する。

6. 保存仕様

現在の設定を保存：
vct_info_hud_config に保存する。

読込元設定を保存：
vct_info_hud_load_source に保存する。

初期値に戻す：
画面上の設定を内蔵初期設定に戻す。

保存済み設定を削除：
vct_info_hud_config を削除する。

7. ログウインドウ仕様

表示方式：
縦ログ型

動作：
新しいコメントを下に追加し、古いコメントは上方向へ押し出される。
時間で自動消去する方式ではない。

表示形式：
バッジ、ユーザー名、区切り記号、本文を一行表示する。

本文：
VCT SDK 2.0 の message.parts を順番通りにDOM展開する。

テキスト：
span として表示する。

画像絵文字：
img としてインライン表示する。

YouTubeスタンプ / Super Sticker：
isSticker が true の emoji part をスタンプとして扱い、インライン表示する。

通常コメント：
白文字を基本とする。

スパチャ、メンバーシップ、ギフト系コメント：
取得できた色を行背景に反映する。
本文とユーザー名は白文字を基本とする。
支援金額は本文に混ぜず、SUPPORT_AMOUNT_DISPLAY に従って別表示する。

支援金額表示：
none
badge
before
after

初期値：
badge

kind別の基本表示：
superchat / supersticker は monetization.money.displayText を優先する。
メンギフ送信は event.kind の membership_gift と membership.giftCount から メンギフ xN を表示する。
jewel は monetization.jewels.count を参照し、支援バッジへ 💎 N 形式で表示する。ギフト名は本文側の通知表示に任せる。
giftreceived は ギフト受取 と表示する。
milestonechat は membership.primary があればそれを優先し、無ければ メンバー と表示する。
例：メンバー歴 8か月

イベントログ表示：
SHOW_EVENT_MESSAGES でイベントログ全体の表示を切り替える。
種別別設定で superchat / supersticker / jewel / member_milestone / membership_event / member_join / membership_gift / membership_gift_received のログ行表示を個別に切り替える。
OFFにしたイベントはログ行全体を追加しない。
ギフトカード表示はイベントログ設定から独立し、GIFT_CARD_ENABLED とギフトカード対象判定に従う。
membership_gift_received は短時間に連続しやすいため初期OFFとする。

チャンネルオーナーコメント：
user.roles.owner が true の場合、ユーザー属性バッジ OWNER を表示する。

モデレーターコメント：
user.roles.moderator が true かつ user.roles.owner が false の場合、ユーザー属性バッジ MOD を表示する。
MOD バッジはYouTubeのスパナ表示に寄せた青系背景、白文字とする。

未接続時：
わんコメ未接続 と表示する。

8. 同接・高評価仕様

表示対象：
同接
高評価

表示モード：
auto
manual
meta

auto：
わんコメ meta が来ていれば meta 値を表示する。
meta が未取得の場合は手動値を表示する。

manual：
設定UIまたは config.js の任意ラベルと手動値を表示する。

meta：
わんコメ meta 値を表示する。

meta取得キー：
同接 viewer / viewers
高評価 upVote / likes / likeCount / goodCount

メタエリアレイアウト：
METRIC_LAYOUT で指定する。
default は従来表示。
compactMeta は上段に空きスロット、下段に同接/高評価を表示する。
gridMeta は上段に左右2つの空きスロット、下段に同接/高評価を表示する。
空きスロットにはInfoHUD側では文字や画像を表示しない。

9. 情報ウインドウ仕様

MVPではテキストのみ対応。
画像表示は未対応。

INFO_MESSAGES に設定した複数テキストを一定間隔で切り替える。
最後まで表示したら先頭へ戻ってループする。
INFO文は1項目を1メッセージとして表示する。
表示幅を超える場合はINFOエリア内で自動折り返しする。
折り返し位置は文字列、フォント、文字サイズ、INFOエリア幅に依存する。

INFO文プリセット：
現在の複数行INFO文全体を1セットとして、3枠までlocalStorageへ保存できる。
保存キーは vct_info_hud_info_presets とする。
選択枠を読み込むと現在のINFO文へ即時反映する。
プリセット読込後の内容を通常設定として保持する場合は「現在の設定を保存」を使用する。
未保存の枠を読み込んだ場合は現在のINFO文を変更しない。

切替間隔：
INFO_INTERVAL_MS

ギフトカード：
GIFT_CARD_ENABLED が true の場合、支援系コメント受信時にINFOエリアを一時的に差し替える。
初期値は false。
表示時間は GIFT_CARD_DURATION_MS で指定する。
連続して支援系コメントを受信した場合は最新のカードで上書きする。
表示時間経過後、通常のINFO_MESSAGESローテーションへ戻る。

ギフトカードキュー：
GIFT_CARD_QUEUE_ENABLED が false の場合は従来どおり最新カードで上書きする。
true の場合は表示中のカードを最後まで表示し、後続カードを受信順に表示する。
待機上限は3件とし、上限を超えた場合は最も古い待機カードを破棄する。
各カードの表示時間は GIFT_CARD_DURATION_MS を使用する。
設定変更などでINFOローテーションを再起動した場合は待機キューを破棄する。

ギフトカード表示対象：
superchat
supersticker
sponsorgift
milestonechat
その他 hasGift が true かつ giftreceived ではない支援系

giftreceived はメンバーシップギフト受取が短時間に連続しやすいため、初期仕様ではギフトカード対象外とする。

ギフトカード表示内容：
支援種別/金額ラベル
ユーザー名
本文
画像

ギフトカード表示内容設定：
GIFT_CARD_SHOW_LABEL
GIFT_CARD_SHOW_USER
GIFT_CARD_SHOW_MESSAGE
GIFT_CARD_SHOW_IMAGE
GIFT_CARD_SHOW_MESSAGE_WITH_IMAGE

初期値では、種別ラベル、ユーザー名、本文、画像を表示対象とする。
ただし画像がある場合は画像を優先し、本文は表示しない。
GIFT_CARD_SHOW_MESSAGE_WITH_IMAGE を true にすると、画像ありのギフトカードでも本文を併記する。
本文中の通常画像絵文字は message.parts の位置にインライン表示する。isSticker が true の画像は本文内へ重複表示せず、従来どおりカード画像として扱う。

ギフトカード表示デザイン：
背景は取得できたギフトカラーを濃いめに反映する。
文字は白を基本とする。
透明度可変、ガラスデザイン、キュー制御は将来候補とする。

10. ビジュアル調整

調整可能項目：
HUD高さ
同接エリア幅
高評価エリア幅
情報エリア幅
エリア間余白
バー本体色
バー本体色2
バー本体透明度
バー本体背景方式
バー本体グラデーション角度
パネル背景色
パネル背景透明度
枠線色
枠線透明度
枠線太さ
角丸
アクセント色
通常ログ行背景
メタ項目名文字色
メタ数値文字色
通常ログ文字色
INFO文字色

色設定には同梱インラインカラーピッカーを使用する。
インラインカラーピッカーはOBS対話、OBSドック、通常ブラウザで同じ操作を提供する。
各色は色見本付きHEX入力欄へ直接入力することもできる。
OSネイティブの input type=color は使用しない。

バー本体背景方式：
solid
gradient

solid：
HUD_BG_COLOR と HUD_BG_ALPHA を使用した従来の単色背景。

gradient：
HUD_BG_COLOR と HUD_BG_COLOR_2 を同じ透明度で合成した2色 linear-gradient 背景。
角度は HUD_BG_GRADIENT_ANGLE で指定する。

多色、虹グラデーション、アニメーション背景は初期対象外とする。

11. 文字設定

フォントプリセット：
gothic
rounded
mincho
mono
system

サイズ調整：
コメント文字サイズ
情報文字サイズ
数値文字サイズ
ログ行高さ
ログ行間

文字色調整：
メタ項目名
メタ数値
通常ログ文字
INFO文字

ギフト系ログ行とギフトカードはイベントカラー背景に白文字を基本とする。
通常ログ文字色は通常コメント行に適用する。

ログの表示行数は、HUD高さ、ログ行高さ、ログ行間、コメント文字サイズの組み合わせで決まる。

12. 主な設定キー

HUD_HEIGHT
VIEWERS_WIDTH
LIKES_WIDTH
INFO_WIDTH
GAP_PX

VIEWERS_VALUE
LIKES_VALUE
VIEWERS_LABEL
LIKES_LABEL
METRIC_SOURCE
METRIC_LAYOUT
SHOW_LOG_CONTENT
SHOW_INFO_CONTENT

FONT_PRESET
FONT_FAMILY
COMMENT_FONT_SIZE
INFO_FONT_SIZE
METRIC_FONT_SIZE

LOG_LINE_HEIGHT
LOG_ROW_GAP
MAX_COMMENT_CHARS
SHOW_IMAGE_EMOJI
SHOW_STICKERS
COMMENT_TRANSLATION_MODE
EMOJI_SIZE_RATIO
STICKER_SIZE_RATIO
SUPPORT_AMOUNT_DISPLAY
SHOW_EVENT_MESSAGES
SHOW_EVENT_MESSAGE_SUPERCHAT
SHOW_EVENT_MESSAGE_SUPERSTICKER
SHOW_EVENT_MESSAGE_JEWEL
SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT
SHOW_EVENT_MESSAGE_MEMBER_JOIN
SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT
SHOW_EVENT_MESSAGE_GIFT_RECEIVED
LOG_MAX_ITEMS

INFO_MESSAGES
INFO_INTERVAL_MS
GIFT_CARD_ENABLED
GIFT_CARD_QUEUE_ENABLED
GIFT_CARD_DURATION_MS
GIFT_CARD_SHOW_LABEL
GIFT_CARD_SHOW_USER
GIFT_CARD_SHOW_MESSAGE
GIFT_CARD_SHOW_IMAGE
GIFT_CARD_SHOW_MESSAGE_WITH_IMAGE

HUD_BG_COLOR
HUD_BG_COLOR_2
HUD_BG_ALPHA
HUD_BG_MODE
HUD_BG_GRADIENT_ANGLE
PANEL_BG_COLOR
PANEL_BG_ALPHA
PANEL_BORDER_COLOR
PANEL_BORDER_ALPHA
PANEL_BORDER_WIDTH
PANEL_RADIUS
TEXT_MAIN
TEXT_MUTED
ACCENT_COLOR
METRIC_LABEL_COLOR
METRIC_VALUE_COLOR
LOG_TEXT_COLOR
INFO_TEXT_COLOR
NORMAL_ROW_BG

DEBUG

13. ファイル構成

VCT_InfoHUD_V2/
  index.html
  config.js
  README.txt
  SPEC.md
  LICENSE

  css/
    style.css

  js/
    vct-loader.js
    defaults.js
    config-store.js
    info-rotator.js
    comments.js
    settings-ui.js
    hud.js
    debug.js

  _lib/
    vct_sdk.js
    inline-color-picker/
      picker.css
      picker.js

14. 外部/同梱ライブラリ

OneSDK：
../__origin/js/onesdk.js を参照する。

VCT SDK 2.0：
_lib/vct_sdk.js を同梱する。
読み込めない場合は ../_vct_core/js/vct_sdk.js を試す。
VCT_SDK.normalize() を唯一の正規化入口とし、SDK 1系とLegacy APIへのフォールバックは行わない。

VCT Inline Color Picker v1：
_lib/inline-color-picker/ に固定コピーを同梱する。
色選択UIのみを担当し、設定保存とHUD反映はInfoHUD側で行う。

15. ライセンス

MIT License

個人・法人、商用・非商用を問わず、無償で利用、改変、再配布できる。
ただし、このテンプレートはわんコメのカスタムテンプレートとして利用するものとする。
わんコメ本体および関連サービスの利用規約は、利用者自身で確認し遵守すること。

16. v1.0.0-dev 時点の既知制限/保留

現行仕様：
1920 x 1080 固定。OBS側の拡縮で運用する。
通常INFOはテキストのみ。画像やスライドショーはOBS側で重ねる。
ログは縦ログのみ。横型コメント表示は別テンプレートとの併用を想定する。
ログ/INFO内容を非表示にしてもHUDの背景、枠線、領域は維持する。

保留候補：
テキスト欄を利用した設定JSONのimport/export
light / dark / custom のGUIテーマプリセット
ギフトカードの透明度可変/ガラスデザイン
高度アニメーション
VCT_CORE高度統合

外部仕様依存：
同梱VCT SDKのYouTubeジュエル対応は、日本語の新旧通知形式「○○を送信しました」「ジュエル○個を使って○○を送りました」からギフト名を抽出する暫定対応とする。
YouTubeまたはわんコメ側の通知形式が変更された場合、ジュエルイベントの分類を維持できてもギフト名を取得できない可能性がある。

17. 更新履歴

v1.0.0-dev

VCT SDK 2.0 v2.0.3-dev（vct_sdk.js）へ更新。`event.announcementText` による加入・本文なし継続通知の案内文表示へ対応。
VCT_SDK.normalize() をコメント正規化の唯一の入口とする。
SDK 1系とLegacy APIへの参照・フォールバックを撤去。
翻訳は message.translation、ユーザー権限は user.roles、金額は monetization.money、ジュエル数は monetization.jewels、メンギフ件数は membership.giftCount を参照する。

v0.9.9-dev

同接/高評価ラベルの任意入力を追加。
イベント種別設定をログ行全体の表示切り替えとして整理。
YouTubeジュエルのイベントログ表示切り替えを追加。
ログ/INFO内容の表示切り替えを追加。
INFO文セットを3枠保存・読込できるプリセットを追加。
ギフトカードの受信順表示を追加。待機上限は3件とする。
一時通知による設定UIのレイアウトずれを修正。
エリア間余白を設定UIから変更可能に調整。
OBS対話でも動作するインラインカラーピッカーを同梱し、ネイティブ色入力を置き換える。

v0.9.8-dev

モデレーターコメントに MOD バッジを追加。
MOD バッジは青系背景、白文字で表示する。
isOwner と isModerator が同時に true の場合は OWNER を優先し、MOD は表示しない。
同梱 vct_one_core.js を v1.2.7-dev に更新する。
YouTubeジュエルを `event.kind: 'jewel'` の支援通知イベントとして分類する。
COMMENT_TRANSLATION_MODE に original / translated を追加し、YouTube自動翻訳があるコメントのログ本文表示を切り替えられるようにする。

v0.9.7-dev

HUD本体背景に単色/2色グラデーション切り替えを追加。
グラデーション2色目と角度を設定UI/config.jsから変更可能。
デフォルトは従来通り単色表示。
多色、虹グラデーション、アニメーション背景は対象外。

v0.9.6-dev

INFOギフトカードの表示内容カスタマイズを追加。
種別ラベル、ユーザー名、本文、画像、画像あり時の本文表示を設定UIとconfig.jsから切り替えできる。
初期値は従来通り、画像がある場合は画像を優先し本文を抑制する。

v0.9.5-dev

イベントログ表示の全体ON/OFFと種別別ON/OFFを追加。
対象は superchat / supersticker / member_milestone / membership_event / member_join / membership_gift / membership_gift_received。
membership_gift_received は連続しやすいため初期OFFとし、config.jsまたは設定UIからONに変更できる。
OFFにしたイベントはログ行全体を追加しない。ギフトカード表示は独立設定として維持する。

v0.9.4-dev

同梱 vct_one_core.js を v1.2.1 に更新。
parseStructured().event を優先し、テンプレ側の giftType / hasGift / membership 個別判定をSDK側の分類へ寄せる。
本文が空で speechText のみに内容が入るイベントの補完に対応する。
membership_gift は メンギフ xN として表示し、ギフトカード対象を維持する。
membership_gift_received は短時間に連続しやすいため、ログ表示とギフトカード対象から外す。
member_join / member_milestone / membership_event はメンバーシップ系ラベルとして扱い、支援ギフト扱いにはしない。
Super Sticker のギフトカードは、ALT/読み上げ文ではなくステッカー画像を表示する。

dev-v0.9.3

文字色カスタマイズと情報文タブUI整理を含む公開準備版。
Claudeレビュー指摘に基づき、タイマー管理、ギフトカード設定参照、支援バッジ表示順、設定UIの不要キー混入を修正。
INFO文は表示幅を超えた場合、自動折り返しされる仕様として整理。
配布フォルダ内に SPEC.md と LICENSE を追加。

dev-v0.9.2

メタエリアに compactMeta / gridMeta を追加。
compactMeta は左側2列の上段を横長空きスロット、下段を同接/高評価として使う。
gridMeta は左側2列の上段を左右2つの空きスロット、下段を同接/高評価として使う。
空きスロットはInfoHUD側では何も描画せず、OBS側で時計、画像、外部カウンターなどを重ねるための余白として扱う。

ギフトカードのINFOエリア一時表示を追加。
初期値は GIFT_CARD_ENABLED false。
支援系コメント受信時、INFO_MESSAGES のローテーションを一時的に差し替えて表示する。
表示時間経過後、通常のINFOローテーションへ戻る。
連続時は最新カードで上書きする。
giftreceived は短時間に連続しやすいため、初期仕様では対象外とする。

メタ項目名、メタ数値、通常ログ文字、INFO文字の色設定を追加。
背景色/透明度を変更した場合の視認性調整に使用する。
情報文タブは設定項目と文言入力欄を分け、横幅の余白を抑える配置へ整理。

dev-v0.9.1

vct_one_core.js の parseStructured 優先利用に移行。
Legacy parse 互換は維持する。
メンバーシップギフト、ギフト受取、マイルストーンチャットの実データに合わせて表示を調整。
sponsorgift は メンギフ xN、giftreceived は ギフト受取、milestonechat は membership.primary 優先で表示する。
チャンネルオーナーコメントに OWNER バッジを追加。
YouTubeスタンプ/画像絵文字のインライン表示を調整。

dev-v0.9.0

初期dev公開候補。
1920 x 1080 固定、OBSクロップ運用前提の下部固定HUDを実装。
コメントログ、同接/高評価、INFOテキストローテーションを実装。
localStorage、config.js、内蔵初期設定の読込順と設定UIを実装。
