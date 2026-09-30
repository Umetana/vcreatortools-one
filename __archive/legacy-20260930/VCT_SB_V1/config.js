window.CONFIG = {
  // 設定データのバージョン
  configVersion: 2,

  // localStorage に保存する設定キー
  storageKey: "vct_sb_v1.settings.v1",

  // タイトル帯に表示する文言
  title: "本日の支援者",

  // 表示開始位置 (OBSソース内の座標)
  startX: 0,
  startY: 0,

  // 表示終端X座標。表示エリア幅は endX - startX
  endX: 1920,

  // 対象の配信ID。null の場合は当日 YYYYMMDD を使用
  streamId: null,

  // 読み込んで表示する最大件数
  limit: 20,

  // 表示順
  // "oldest_first": 古い順。新着は後ろに追加
  // "newest_first": 新しい順。新着が先頭側
  displayOrder: "oldest_first",

  // コメント表示の最大文字数
  maxMessageLength: 50,

  // アイコンを表示するか
  showIcon: true,

  // タイトル帯を表示するか
  titleVisible: true,

  // タイトル帯の高さ(px)
  titleHeight: 40,

  // 金額欄を表示するか
  amountVisible: true,

  // コメント欄を表示するか
  messageVisible: true,

  // カード表示エリアの高さ(px)
  viewportHeight: 140,

  // カード1枚の幅(px)
  cardWidth: 280,

  // カード同士の間隔(px)
  cardGap: 12,

  // 横スクロール速度(px/秒)
  scrollSpeed: 110,

  // カード色モード
  // "soft": 背景になじみやすい同系色グラデーション
  // "contrast": 視認性を高めやすい強めのグラデーション
  cardColorMode: "soft",

  // カード背景の濃さ(0.0 - 1.0)
  // 大きいほど背景が濃くなり、配信画面上で見やすくなります
  cardBackgroundOpacity: 0.18,

  // 支援データがない時の表示文言
  emptyStateText: "まだ支援はありません",

  // V1では表示テンプレ本体からの削除は行いません。
  // 互換用に残していますが、削除操作は VCT_Core / VCT_SB_V1_UI 側で扱います。
  resetStreamOnLoad: false,

  // V1では表示テンプレ本体からの削除は行いません。
  // 互換用に残していますが、削除操作は VCT_Core / VCT_SB_V1_UI 側で扱います。
  resetAllOnLoad: false,
};
