window.CNE_registerEventDictionary({
  id: "normal_rpg_002",
  title: "RPGイベント",
  
  appearance: {
    preset: "rpg2"
  },

  templates: [
    "{name} は {action} {result}",
    "冒険者 {name} が {adverb} {action} した",
    "クエスト発生！ {name} が {action} → {result}",
    "{name} の HP が {adverb} {result}",
    "伝説の {name} が {action}。村人が {result}"
  ],
  words: {
    adverb: ["勇猛果敢に", "ズル賢く", "運任せで", "チート級に", "慎重に", "無謀にも", "派手に"],
    action: ["ドラゴンと戦い", "宝箱を開け", "魔法を連発し", "村娘を助け", "ボス部屋に突入し", "レベル上げをし", "隠しダンジョンに挑み"],
    result: ["伝説の剣を入手した", "全滅した", "村人から石を投げられた", "レベル99になった", "何も起きなかった", "異世界転移した", "神になった", "即死した"]
  }
});