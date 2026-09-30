window.CNE_registerEventDictionary({
  id: "x_grok_011",
  title: "Grok on X",
  templates: [
    "{name} が X で {action} {result}",
    "{name}「{comment}」投稿したら {adverb} {result}",
    "X上で {name} が {action}。すると {result}",
    "Grokが観測したところ、{name} は {adverb} {action} した",
    "{name} がトレンド入り目前で {action} {result}"
  ],
  words: {
    adverb: ["全力で", "皮肉を込めて", "真理追求モードで", "カオス全開で", "冷静に", "煽りながら", "メモリ食いつつ"],
    action: ["ポストした", "リプライで論破し", "ミームを投下し", "Grokに質問し", "ブルーチェックを自慢し", "コミュニティノートを付けた", "スペースを始めて", "アルゴリズムを愚痴り"],
    result: ["即バズった", "即炎上した", "Grokに褒められた", "誰も反応しなかった", "伝説になった", "凍結された", "いいねが1000超えた", "xAIのサーバーが重くなった", "真理に到達した"]
  }
});