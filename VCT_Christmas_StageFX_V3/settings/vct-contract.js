// 自動生成: sync-template-settings.js。項目は各テンプレート側で編集する。
// MIT Copyright (c) 2026 Umetana
// UIと通信で共用する設定検証。項目定義はテンプレートから受け取る。
(function(root) {
'use strict';
function create(definition) {
const fields=Object.assign({},...Object.values(definition.sections).map(s=>s.fields));
function validate(value) {
 if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('設定形式が不正です。');
 const result={};
 for(const key of Object.keys(value)) if(!Object.hasOwn(definition.defaults,key)) throw new Error('非対応の設定項目: '+key);
 for(const [key,fallback] of Object.entries(definition.defaults)) {
  // 個別配置の追加前に保存された共有設定は、その項目だけ初期値で補う。
  const v=value[key]===undefined && key.startsWith('STAGE_PLUGIN_') ? fallback : value[key],field=fields[key]||{};
  if(typeof v!==typeof fallback || (typeof v==='number' && !Number.isFinite(v))) throw new Error('設定値の型が不正です: '+key);
  if(typeof v==='number' && (v<(field.min??0) || v>(field.max??1000000))) throw new Error('設定値が範囲外です: '+key);
  if(field.options && !field.options.includes(v)) throw new Error('選択値が不正です: '+key);
  if(typeof v==='string' && (v.length>2048 || /url\s*\(|@import/i.test(v))) throw new Error('設定文字列が不正です: '+key);
  result[key]=v;
 }
 const file=result.FX_MATERIAL_FILE;
 if(file && (/[:\\?#%]/.test(file) || file.startsWith('/') || file.split('/').some(x=>!x||x==='.'||x==='..') || !/\.(png|jpe?g|webp|gif)$/i.test(file))) throw new Error('素材はassets内の画像ファイル名を指定してください。');
 return result;
}
function validateState(s) {
 if(!s || s.templateId!==definition.templateId || s.schemaVersion!==definition.schemaVersion || s.templateVersion!==definition.templateVersion || !Number.isSafeInteger(s.revision) || s.revision<0) throw new Error('非対応の共有設定です。');
 if(s.payload!==null) validate(s.payload);
 return s;
}
return {...definition,validate,validateState};
}
const factory={create};
if(typeof module==='object' && module.exports) module.exports=factory;
else root.VCT_SETTINGS_CONTRACT=factory;
})(typeof window==='object'?window:globalThis);

(function(root) {
const factory = typeof module === 'object' && module.exports ? module.exports : root.VCT_SETTINGS_CONTRACT;
const contract = factory.create({
  "templateId": "vct_christmas_stage_fx",
  "schemaVersion": 1,
  "templateVersion": "0.1.0",
  "sections": {
    "stage": {
      "title": "ステージ",
      "fields": {
        "CHRISTMAS_ASSET_MODE": {
          "type": "select",
          "options": [
            "generated",
            "plain"
          ],
          "labels": {
            "generated": "生成素材（絵本調）",
            "plain": "生成素材なし（絵文字・CSS）"
          },
          "label": "クリスマス素材の表示"
        },
        "CHRISTMAS_BACKGROUND": {
          "type": "select",
          "options": [
            "transparent",
            "forest",
            "fireplace",
            "night",
            "legacy"
          ],
          "labels": {
            "transparent": "透明（OBSの背景を使用）",
            "forest": "雪の森と遠くの灯り",
            "fireplace": "暖炉のある部屋",
            "night": "静かな冬の夜空",
            "legacy": "既存の背景設定（色・画像）"
          },
          "label": "背景の種類"
        },
        "STAGE_FIT": {
          "type": "select",
          "options": [
            "contain",
            "cover"
          ],
          "labels": {
            "contain": "全体を収める",
            "cover": "画面を埋める"
          },
          "label": "画面への収め方"
        },
        "SHOW_STAGE_BACKGROUND": {
          "type": "checkbox",
          "label": "背景を表示"
        },
        "BG_COLOR": {
          "type": "color",
          "label": "背景色"
        },
        "BACKGROUND_IMAGE": {
          "type": "text",
          "label": "背景画像の相対パス（空欄で画像なし）"
        }
      },
      "tab": "stage"
    },
    "comments": {
      "title": "コメント領域",
      "fields": {
        "CHRISTMAS_COMMENT_FRAME": {
          "type": "checkbox",
          "label": "クリスマスの装飾枠を表示（領域に追従）"
        },
        "CHRISTMAS_COMMENT_FRAME_BG_COLOR": {
          "type": "color",
          "label": "枠全体の背景色"
        },
        "CHRISTMAS_COMMENT_FRAME_BG_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "枠の背景の不透明度（0＝透明、1＝不透明）"
        },
        "COMMENT_X": {
          "type": "range-number",
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1,
          "label": "X位置"
        },
        "COMMENT_Y": {
          "type": "range-number",
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1,
          "label": "Y位置"
        },
        "COMMENT_WIDTH": {
          "type": "range-number",
          "min": 240,
          "max": 1920,
          "step": 5,
          "numberStep": 1,
          "label": "幅"
        },
        "COMMENT_HEIGHT": {
          "type": "range-number",
          "min": 200,
          "max": 1080,
          "step": 5,
          "numberStep": 1,
          "label": "高さ"
        },
        "COMMENT_SCALE": {
          "type": "range",
          "min": 0.5,
          "max": 1.5,
          "step": 0.05,
          "label": "領域全体の倍率"
        },
        "SHOW_COMMENT_FRAME": {
          "type": "checkbox",
          "label": "領域の外枠を表示（確認用）"
        }
      },
      "tab": "placement"
    },
    "display": {
      "title": "表示方式",
      "fields": {
        "DISPLAY_MODE": {
          "type": "select",
          "options": [
            "stack",
            "popup",
            "underbar"
          ],
          "labels": {
            "stack": "縦積み",
            "popup": "ポップアップ",
            "underbar": "Underbar（横流し・横積み）"
          },
          "label": "コメントの表示方式"
        }
      },
      "tab": "display"
    },
    "underbar": {
      "title": "Underbar設定",
      "display": "underbar",
      "fields": {
        "UNDERBAR_MODE": {
          "type": "select",
          "options": [
            "ticker",
            "stack"
          ],
          "labels": {
            "ticker": "横流し",
            "stack": "横積み（新着で押し出す）"
          },
          "label": "Underbarの表示"
        },
        "UNDERBAR_SLIDE_MS": {
          "type": "range",
          "min": 0,
          "max": 2000,
          "step": 50,
          "label": "スライド時間 (ms・横積みのみ)"
        },
        "UNDERBAR_EXIT_CARDS": {
          "type": "range",
          "min": 0,
          "max": 4,
          "step": 0.5,
          "label": "画面外の保持余裕 (最大幅の枚数・横積み)"
        },
        "UNDERBAR_DIRECTION": {
          "type": "select",
          "options": [
            "rtl",
            "ltr"
          ],
          "labels": {
            "rtl": "右から左",
            "ltr": "左から右"
          },
          "label": "流れる方向"
        },
        "UNDERBAR_LANES": {
          "type": "range",
          "min": 1,
          "max": 5,
          "step": 1,
          "label": "レーン数（横流しのみ）"
        },
        "UNDERBAR_LANE_MODE": {
          "type": "select",
          "options": [
            "available",
            "sequence",
            "random"
          ],
          "labels": {
            "available": "空き優先（下段から）",
            "sequence": "順番（下から上）",
            "random": "ランダム"
          },
          "label": "レーンの振り分け（横流しのみ）"
        },
        "UNDERBAR_LANE_GAP": {
          "type": "range",
          "min": 0,
          "max": 200,
          "step": 1,
          "label": "上下の間隔 (px・横流しのみ)"
        },
        "UNDERBAR_SPEED": {
          "type": "range",
          "min": 30,
          "max": 600,
          "step": 10,
          "label": "移動速度 (px/秒・横流しのみ)"
        },
        "UNDERBAR_WIDTH": {
          "type": "range",
          "min": 180,
          "max": 1200,
          "step": 10,
          "label": "カード最大幅 (px・倍率適用前)"
        },
        "UNDERBAR_SCALE": {
          "type": "range",
          "min": 25,
          "max": 200,
          "step": 5,
          "label": "カード全体の倍率 (%)"
        },
        "UNDERBAR_BOTTOM": {
          "type": "range",
          "min": 0,
          "max": 500,
          "step": 1,
          "label": "下端からの位置 (px)"
        },
        "UNDERBAR_GAP": {
          "type": "range",
          "min": 0,
          "max": 300,
          "step": 5,
          "label": "カード間隔 (px)"
        },
        "UNDERBAR_QUEUE": {
          "type": "range",
          "min": 1,
          "max": 100,
          "step": 1,
          "label": "待機上限（横流しのみ・古い待機を削除）"
        }
      },
      "tab": "display"
    },
    "popup": {
      "title": "ポップアップ設定",
      "display": "popup",
      "fields": {
        "POPUP_PLACEMENT": {
          "type": "select",
          "options": [
            "random",
            "anchor"
          ],
          "labels": {
            "random": "全面ランダム（見切れ許容）",
            "anchor": "基準位置＋ばらつき"
          },
          "label": "配置方式"
        },
        "POPUP_X": {
          "type": "range",
          "min": 0,
          "max": 100,
          "step": 1,
          "label": "基準位置・横 (%・基準位置モードのみ)"
        },
        "POPUP_Y": {
          "type": "range",
          "min": 0,
          "max": 100,
          "step": 1,
          "label": "基準位置・縦 (%・基準位置モードのみ)"
        },
        "POPUP_SPREAD_X": {
          "type": "range",
          "min": 0,
          "max": 100,
          "step": 1,
          "label": "左右のばらつき (±%・基準位置モードのみ)"
        },
        "POPUP_SPREAD_Y": {
          "type": "range",
          "min": 0,
          "max": 100,
          "step": 1,
          "label": "上下のばらつき (±%・基準位置モードのみ)"
        },
        "POPUP_WIDTH": {
          "type": "range",
          "min": 160,
          "max": 1200,
          "step": 10,
          "label": "倍率適用前のカード幅 (px)"
        },
        "POPUP_SCALE": {
          "type": "range",
          "min": 25,
          "max": 200,
          "step": 5,
          "label": "カード全体の基本倍率 (%)"
        },
        "POPUP_DURATION": {
          "type": "range",
          "min": 1,
          "max": 30,
          "step": 0.5,
          "label": "表示時間 (秒・退場まで)"
        },
        "POPUP_MAX_ITEMS": {
          "type": "range",
          "min": 1,
          "max": 50,
          "step": 1,
          "label": "最大同時表示数（超過時は最古から退場）"
        }
      },
      "tab": "display"
    },
    "effect": {
      "title": "コメント枠の演出",
      "fields": {
        "COMMENT_EFFECT": {
          "type": "select",
          "options": [
            "none",
            "heart",
            "flash",
            "stars",
            "christmas"
          ],
          "labels": {
            "none": "なし",
            "heart": "ハート",
            "stars": "Stars（星降り）",
            "flash": "Flash（枠発光）",
            "christmas": "クリスマス（星・ベル・リボンが漂う）"
          },
          "label": "演出"
        }
      },
      "tab": "decoration"
    },
    "heart": {
      "title": "ハート設定",
      "effect": "heart",
      "fields": {
        "HEART_TARGET": {
          "type": "select",
          "options": [
            "support",
            "support-membership",
            "all"
          ],
          "labels": {
            "support": "支援のみ",
            "support-membership": "支援＋メンバー",
            "all": "すべて"
          },
          "label": "ハートの対象"
        },
        "HEART_COUNT": {
          "type": "range",
          "min": 1,
          "max": 24,
          "step": 1,
          "label": "ハートの数"
        },
        "HEART_SIZE": {
          "type": "range",
          "min": 8,
          "max": 64,
          "step": 1,
          "label": "基本サイズ (px・±30％)"
        },
        "HEART_COLOR": {
          "type": "color",
          "label": "ハートの色"
        },
        "HEART_DURATION": {
          "type": "range",
          "min": 1,
          "max": 12,
          "step": 0.5,
          "label": "動きの周期 (秒・大きいほどゆっくり)"
        }
      },
      "tab": "decoration"
    },
    "flash": {
      "title": "Flash設定",
      "effect": "flash",
      "fields": {
        "FLASH_TARGET": {
          "type": "select",
          "options": [
            "support",
            "support-membership",
            "all"
          ],
          "labels": {
            "support": "支援のみ",
            "support-membership": "支援＋メンバー",
            "all": "すべて"
          },
          "label": "Flashの対象"
        },
        "FLASH_MODE": {
          "type": "select",
          "options": [
            "glow",
            "shimmer",
            "glint",
            "trace",
            "aurora",
            "aurora-background",
            "sweep",
            "random"
          ],
          "labels": {
            "glow": "枠の発光",
            "shimmer": "枠の発光＋光の帯",
            "glint": "Glint（きらめき）",
            "trace": "Trace（枠を巡る光）",
            "aurora": "Halo（揺らぐ光彩）",
            "aurora-background": "Aurora（オーロラ）",
            "sweep": "Sweep（光のスキャン）",
            "random": "ランダム（全7種類）"
          },
          "label": "見せ方"
        },
        "FLASH_COLOR_MODE": {
          "type": "select",
          "options": [
            "fixed",
            "comment"
          ],
          "labels": {
            "fixed": "指定色",
            "comment": "コメントの強調色に連動"
          },
          "label": "発光色の方式"
        },
        "FLASH_COLOR": {
          "type": "color",
          "label": "指定色（強調色がない場合も使用）"
        },
        "FLASH_STRENGTH": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "光の強さ"
        },
        "FLASH_DURATION": {
          "type": "range",
          "min": 1,
          "max": 12,
          "step": 0.5,
          "label": "動きの周期 (秒・Traceは一周)"
        }
      },
      "tab": "decoration"
    },
    "stars": {
      "title": "Stars設定",
      "effect": "stars",
      "fields": {
        "STAR_TARGET": {
          "type": "select",
          "options": [
            "support",
            "support-membership",
            "all"
          ],
          "labels": {
            "support": "支援のみ",
            "support-membership": "支援＋メンバー",
            "all": "すべて"
          },
          "label": "星の対象"
        },
        "STAR_DIRECTION": {
          "type": "select",
          "options": [
            "down-right",
            "down-left",
            "random"
          ],
          "labels": {
            "down-right": "右下",
            "down-left": "左下",
            "random": "コメントごとにランダム"
          },
          "label": "降る方向"
        },
        "STAR_COUNT": {
          "type": "range",
          "min": 1,
          "max": 48,
          "step": 1,
          "label": "星の数"
        },
        "STAR_COLORS": {
          "type": "text",
          "label": "星の色（#rrggbbをカンマ区切り）"
        },
        "STAR_SIZE_MIN": {
          "type": "range",
          "min": 8,
          "max": 64,
          "step": 1,
          "label": "最小サイズ (px)"
        },
        "STAR_SIZE_MAX": {
          "type": "range",
          "min": 8,
          "max": 64,
          "step": 1,
          "label": "最大サイズ (px・最小以上で適用)"
        },
        "STAR_DURATION_MIN": {
          "type": "range",
          "min": 1,
          "max": 12,
          "step": 0.1,
          "label": "最短周期 (秒)"
        },
        "STAR_DURATION_MAX": {
          "type": "range",
          "min": 1,
          "max": 12,
          "step": 0.1,
          "label": "最長周期 (秒・最短以上で適用)"
        }
      },
      "tab": "decoration"
    },
    "general": {
      "title": "基本表示設定",
      "fields": {
        "MAX_ITEMS": {
          "type": "number",
          "label": "最大表示件数"
        },
        "MAX_WIDTH": {
          "type": "text",
          "label": "最大横幅"
        },
        "STACK_DIRECTION": {
          "type": "select",
          "options": [
            "up",
            "down"
          ],
          "label": "積み上げ方向"
        },
        "ITEM_GAP_PX": {
          "type": "number",
          "label": "コメント間隔 (px)"
        }
      },
      "tab": "display",
      "display": "stack"
    },
    "visibility": {
      "title": "表示要素",
      "fields": {
        "SHOW_ICON": {
          "type": "checkbox",
          "label": "アイコン"
        },
        "SHOW_NAME": {
          "type": "checkbox",
          "label": "名前"
        },
        "SHOW_BADGES": {
          "type": "checkbox",
          "label": "バッジ"
        },
        "SHOW_USER_FLAGS": {
          "type": "checkbox",
          "label": "OWNER / MOD"
        },
        "COMMENT_TRANSLATION_MODE": {
          "type": "select",
          "options": [
            "original",
            "translated",
            "both"
          ],
          "label": "翻訳表示"
        },
        "MAX_COMMENT_UNITS": {
          "type": "number",
          "label": "本文上限 (0で無制限)"
        }
      },
      "tab": "display"
    },
    "eventMessages": {
      "title": "イベント本文",
      "fields": {
        "SHOW_EVENT_MESSAGES": {
          "type": "checkbox",
          "label": "イベント本文を表示"
        },
        "SHOW_EVENT_MESSAGE_SUPERCHAT": {
          "type": "checkbox",
          "label": "スーパーチャット"
        },
        "SHOW_EVENT_MESSAGE_SUPERSTICKER": {
          "type": "checkbox",
          "label": "スーパーステッカー"
        },
        "SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT": {
          "type": "checkbox",
          "label": "メンバー継続"
        },
        "SHOW_EVENT_MESSAGE_MEMBER_JOIN": {
          "type": "checkbox",
          "label": "メンバー加入"
        },
        "SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT": {
          "type": "checkbox",
          "label": "メンギフ送信"
        },
        "SHOW_EVENT_MESSAGE_GIFT_RECEIVED": {
          "type": "checkbox",
          "label": "メンギフ受取"
        }
      },
      "tab": "display"
    },
    "typography": {
      "title": "文字とタイマー",
      "fields": {
        "FONT_FAMILY": {
          "type": "text",
          "label": "フォント"
        },
        "FONT_SIZE": {
          "type": "number",
          "label": "文字サイズ (px)"
        },
        "META_SCALE": {
          "type": "range",
          "min": 0.5,
          "max": 1.5,
          "step": 0.05,
          "label": "名前・バッジ倍率"
        },
        "AUTO_HIDE_MS": {
          "type": "number",
          "label": "自動非表示 (ms)"
        },
        "FADE_IN_MS": {
          "type": "number",
          "label": "入場時間 (ms)"
        },
        "FADE_OUT_MS": {
          "type": "number",
          "label": "退場時間 (ms)"
        }
      },
      "tab": "display"
    },
    "emphasis": {
      "title": "強調表示",
      "fields": {
        "GIFT_BG_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "ギフト背景"
        },
        "GIFT_BORDER_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "ギフト枠線"
        },
        "MEMBER_BG_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "メンバー背景"
        },
        "MEMBER_BORDER_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "メンバー枠線"
        }
      },
      "tab": "display"
    },
    "appearance": {
      "title": "カラー・スタイル",
      "fields": {
        "COMMENT_BG_COLOR": {
          "type": "color",
          "label": "背景色"
        },
        "BG_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "背景透明度"
        },
        "BG_BLUR": {
          "type": "text",
          "label": "ぼかし"
        },
        "BASE_BORDER_COLOR": {
          "type": "color",
          "label": "通常枠線色"
        },
        "BASE_BORDER_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "通常枠線の濃さ"
        },
        "BASE_BORDER_WIDTH": {
          "type": "number",
          "label": "通常枠線の太さ (px)"
        },
        "SYSTEM_BORDER_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "label": "固定コメント枠線"
        },
        "TEXT_MAIN": {
          "type": "color",
          "label": "本文色"
        },
        "TEXT_NAME": {
          "type": "color",
          "label": "名前色"
        },
        "ACCENT_COLOR": {
          "type": "color",
          "label": "アクセント色"
        },
        "SHADOW_SOFT": {
          "type": "text",
          "label": "影"
        },
        "DEBUG": {
          "type": "checkbox",
          "label": "デバッグモード"
        }
      },
      "tab": "display"
    },
    "effects": {
      "title": "イベント演出",
      "fields": {
        "ENABLE_STAGE_EFFECTS": {
          "type": "checkbox",
          "label": "支援・メンバーで演出を再生"
        },
        "REDUCED_MOTION": {
          "type": "checkbox",
          "label": "動き抑制（画面演出・カード装飾を停止）"
        },
        "STAGE_EFFECT_ID": {
          "type": "select",
          "options": [
            "sample_effect",
            "halloween_parade_effect",
            "heart_effect",
            "stars_effect",
            "confetti_effect",
            "sparkle_effect",
            "christmas_present"
          ],
          "labels": {
            "sample_effect": "サークル",
            "halloween_parade_effect": "ハロウィンパレード",
            "heart_effect": "Heart（ハート上昇）",
            "stars_effect": "Stars（流星）",
            "confetti_effect": "紙吹雪",
            "sparkle_effect": "Sparkle（きらめき）",
            "christmas_present": "クリスマスのプレゼント開封"
          },
          "label": "使用する演出"
        },
        "STAGE_EFFECT_POLICY": {
          "type": "select",
          "options": [
            "queue",
            "overlap",
            "ignore"
          ],
          "labels": {
            "queue": "順番に待つ",
            "overlap": "上限まで重ねる",
            "ignore": "再生中は受け付けない"
          },
          "label": "連続時の処理"
        },
        "STAGE_EFFECT_MAX_ACTIVE": {
          "type": "range-number",
          "min": 1,
          "max": 4,
          "step": 1,
          "label": "同時実行数"
        },
        "STAGE_EFFECT_QUEUE_LIMIT": {
          "type": "range-number",
          "min": 0,
          "max": 20,
          "step": 1,
          "label": "待機上限"
        },
        "STAGE_EFFECT_INTENSITY_MODE": {
          "type": "select",
          "options": [
            "fixed",
            "value"
          ],
          "labels": {
            "fixed": "標準固定",
            "value": "金額・件数に連動"
          },
          "label": "演出の強さ"
        },
        "STAGE_EFFECT_COUNT": {
          "type": "range-number",
          "min": 1,
          "max": 60,
          "step": 1,
          "label": "基準表示数"
        },
        "STAGE_EFFECT_DURATION_MS": {
          "type": "range-number",
          "min": 1200,
          "max": 10000,
          "step": 100,
          "label": "基準時間（ms）"
        },
        "STAGE_EFFECT_BG_OPACITY": {
          "type": "range",
          "min": 0,
          "max": 0.7,
          "step": 0.05,
          "label": "暗幕の濃さ"
        }
      },
      "tab": "effects"
    },
    "layout:sample_effect": {
      "title": "サークルの配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "sample_effect",
      "plugin": "sample_effect",
      "fields": {
        "STAGE_PLUGIN_sample_effect_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_sample_effect_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sample_effect_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sample_effect_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sample_effect_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sample_effect_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_sample_effect_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "layout:halloween_parade_effect": {
      "title": "ハロウィンパレードの配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "halloween_parade_effect",
      "plugin": "halloween_parade_effect",
      "fields": {
        "STAGE_PLUGIN_halloween_parade_effect_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_halloween_parade_effect_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_halloween_parade_effect_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_halloween_parade_effect_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_halloween_parade_effect_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_halloween_parade_effect_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_halloween_parade_effect_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:halloween_parade_effect": {
      "title": "ハロウィンパレードの設定（AI生成画像を同梱）",
      "tab": "effects",
      "plugin": "halloween_parade_effect",
      "fields": {
        "HALLOWEEN_RENDER_MODE": {
          "default": "emoji",
          "type": "select",
          "options": [
            "emoji",
            "image"
          ],
          "labels": {
            "emoji": "絵文字",
            "image": "AI生成画像"
          },
          "label": "表示素材"
        },
        "HALLOWEEN_PATTERN": {
          "default": "parade",
          "type": "select",
          "options": [
            "parade",
            "ghostNight",
            "batSwarm",
            "candyRain",
            "randomPop"
          ],
          "labels": {
            "parade": "パレード",
            "ghostNight": "ゴーストナイト",
            "batSwarm": "コウモリの群れ",
            "candyRain": "キャンディレイン",
            "randomPop": "ランダムポップ"
          },
          "label": "演出パターン"
        }
      }
    },
    "layout:heart_effect": {
      "title": "Heart（ハート上昇）の配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "heart_effect",
      "plugin": "heart_effect",
      "fields": {
        "STAGE_PLUGIN_heart_effect_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_heart_effect_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_heart_effect_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_heart_effect_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_heart_effect_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_heart_effect_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_heart_effect_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:heart_effect": {
      "title": "Heart（ハート上昇）の設定",
      "tab": "effects",
      "plugin": "heart_effect",
      "fields": {
        "FX_HEART_COUNT": {
          "type": "range-number",
          "min": 1,
          "max": 60,
          "step": 1,
          "default": 18,
          "label": "ハートの数（標準強度）"
        },
        "FX_HEART_SIZE": {
          "type": "range-number",
          "min": 24,
          "max": 200,
          "step": 2,
          "default": 80,
          "label": "ハートの基本サイズ (px)"
        },
        "FX_HEART_COLOR": {
          "type": "color",
          "default": "#ff598b",
          "label": "ハートの色"
        },
        "FX_HEART_SPEED": {
          "type": "range-number",
          "min": 20,
          "max": 240,
          "step": 10,
          "default": 100,
          "label": "上昇速度 (px/秒)"
        }
      }
    },
    "layout:stars_effect": {
      "title": "Stars（流星）の配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "stars_effect",
      "plugin": "stars_effect",
      "fields": {
        "STAGE_PLUGIN_stars_effect_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_stars_effect_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_stars_effect_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_stars_effect_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_stars_effect_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_stars_effect_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_stars_effect_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:stars_effect": {
      "title": "Stars（流星）の設定",
      "tab": "effects",
      "plugin": "stars_effect",
      "fields": {
        "FX_STARS_COUNT": {
          "type": "range-number",
          "min": 1,
          "max": 60,
          "step": 1,
          "default": 24,
          "label": "星の数（標準強度）"
        },
        "FX_STARS_SIZE": {
          "type": "range-number",
          "min": 16,
          "max": 160,
          "step": 2,
          "default": 48,
          "label": "星の基本サイズ (px)"
        },
        "FX_STARS_COLOR": {
          "type": "color",
          "default": "#ffe89c",
          "label": "星と尾の色"
        },
        "FX_STARS_SPEED": {
          "type": "range-number",
          "min": 60,
          "max": 800,
          "step": 20,
          "default": 300,
          "label": "落下速度・縦方向 (px/秒)"
        },
        "FX_STARS_DIRECTION": {
          "type": "select",
          "default": "right",
          "options": [
            "right",
            "left",
            "random"
          ],
          "labels": {
            "right": "右下",
            "left": "左下",
            "random": "演出ごとにランダム"
          },
          "label": "流れる方向"
        }
      }
    },
    "layout:confetti_effect": {
      "title": "紙吹雪の配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "confetti_effect",
      "plugin": "confetti_effect",
      "fields": {
        "STAGE_PLUGIN_confetti_effect_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_confetti_effect_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_confetti_effect_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_confetti_effect_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_confetti_effect_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_confetti_effect_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_confetti_effect_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:confetti_effect": {
      "title": "紙吹雪の設定",
      "tab": "effects",
      "plugin": "confetti_effect",
      "fields": {
        "FX_CONFETTI_COUNT": {
          "type": "range-number",
          "min": 1,
          "max": 60,
          "step": 1,
          "default": 60,
          "label": "紙片の数（標準強度・最大60）"
        },
        "FX_CONFETTI_SIZE": {
          "type": "range-number",
          "min": 4,
          "max": 40,
          "step": 1,
          "default": 16,
          "label": "紙片の基本サイズ (px)"
        },
        "FX_CONFETTI_COLORS": {
          "type": "text",
          "default": "#ff6685,#ffd166,#68dfb0,#69bfff,#bc94ff",
          "label": "紙片の色（#rrggbbをカンマ区切り）"
        },
        "FX_CONFETTI_SPEED": {
          "type": "range-number",
          "min": 20,
          "max": 400,
          "step": 10,
          "default": 140,
          "label": "落下速度 (px/秒)"
        }
      }
    },
    "layout:sparkle_effect": {
      "title": "Sparkle（きらめき）の配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "sparkle_effect",
      "plugin": "sparkle_effect",
      "fields": {
        "STAGE_PLUGIN_sparkle_effect_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_sparkle_effect_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sparkle_effect_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sparkle_effect_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sparkle_effect_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_sparkle_effect_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_sparkle_effect_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:sparkle_effect": {
      "title": "Sparkle（きらめき）の設定",
      "tab": "effects",
      "plugin": "sparkle_effect",
      "fields": {
        "FX_SPARKLE_COUNT": {
          "type": "range-number",
          "min": 1,
          "max": 60,
          "step": 1,
          "default": 24,
          "label": "光の数（標準強度）"
        },
        "FX_SPARKLE_SIZE": {
          "type": "range-number",
          "min": 16,
          "max": 160,
          "step": 2,
          "default": 64,
          "label": "光の基本サイズ (px)"
        },
        "FX_SPARKLE_COLOR": {
          "type": "color",
          "default": "#fff1b8",
          "label": "光の色"
        }
      }
    },
    "layout:christmas_tree": {
      "title": "クリスマスツリーの配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_tree",
      "plugin": "christmas_tree",
      "fields": {
        "STAGE_PLUGIN_christmas_tree_ENABLED": {
          "type": "checkbox",
          "label": "常設表示を有効にする",
          "default": false
        },
        "STAGE_PLUGIN_christmas_tree_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_tree_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_tree_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_tree_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_tree_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_christmas_tree_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:christmas_tree": {
      "title": "クリスマスツリーの設定（AI生成画像を同梱）",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_tree",
      "fields": {
        "CHRISTMAS_TREE_STAGES": {
          "type": "select",
          "label": "成長の細かさ",
          "default": "10",
          "options": [
            "10",
            "20",
            "30"
          ],
          "labels": {
            "10": "大きく育つ（10段階）",
            "20": "少しずつ育つ（20段階）",
            "30": "こまめに育つ（30段階）"
          }
        },
        "CHRISTMAS_TREE_GOAL": {
          "type": "range-number",
          "label": "完成までの目標ポイント",
          "default": 500,
          "min": 10,
          "max": 1000000,
          "step": 10,
          "numberStep": 1
        },
        "CHRISTMAS_TREE_SHOW_COUNTER": {
          "type": "checkbox",
          "label": "幹の下に現在値／目標値を表示",
          "default": false
        },
        "CHRISTMAS_TREE_COUNTER_SIZE": {
          "type": "range-number",
          "label": "カウントの文字サイズ（px）",
          "default": 32,
          "min": 16,
          "max": 64,
          "step": 2,
          "numberStep": 1
        },
        "CHRISTMAS_TREE_SUPPORT_BASE": {
          "type": "range-number",
          "label": "支援ボーナスの基準ポイント（0でなし）",
          "default": 5,
          "min": 0,
          "max": 1000,
          "step": 1
        },
        "CHRISTMAS_TREE_GIFT_LIMIT": {
          "type": "range-number",
          "label": "ギフト飾りの上限数",
          "default": 30,
          "min": 1,
          "max": 120,
          "step": 1
        }
      }
    },
    "layout:christmas_snow": {
      "title": "クリスマスの雪の配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_snow",
      "plugin": "christmas_snow",
      "fields": {
        "STAGE_PLUGIN_christmas_snow_ENABLED": {
          "type": "checkbox",
          "label": "常設表示を有効にする",
          "default": false
        },
        "STAGE_PLUGIN_christmas_snow_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_snow_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_snow_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_snow_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_snow_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_christmas_snow_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "layout:christmas_lights": {
      "title": "クリスマスのイルミネーションの配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_lights",
      "plugin": "christmas_lights",
      "fields": {
        "STAGE_PLUGIN_christmas_lights_ENABLED": {
          "type": "checkbox",
          "label": "常設表示を有効にする",
          "default": false
        },
        "STAGE_PLUGIN_christmas_lights_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_lights_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_lights_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_lights_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_lights_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_christmas_lights_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:christmas_lights": {
      "title": "クリスマスのイルミネーションの設定",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_lights",
      "fields": {
        "CHRISTMAS_LIGHTS_COLOR": {
          "type": "select",
          "label": "電飾の色",
          "default": "warm",
          "options": [
            "warm",
            "colorful"
          ],
          "labels": {
            "warm": "暖かな金色",
            "colorful": "クリスマスカラー"
          }
        }
      }
    },
    "layout:christmas_present": {
      "title": "クリスマスのプレゼント開封の配置・強度",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_present",
      "plugin": "christmas_present",
      "fields": {
        "STAGE_PLUGIN_christmas_present_ENABLED": {
          "type": "checkbox",
          "label": "この演出を有効にする",
          "default": true
        },
        "STAGE_PLUGIN_christmas_present_X": {
          "type": "range-number",
          "label": "演出のX位置",
          "default": 0,
          "min": 0,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_present_Y": {
          "type": "range-number",
          "label": "演出のY位置",
          "default": 0,
          "min": 0,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_present_WIDTH": {
          "type": "range-number",
          "label": "演出領域の幅",
          "default": 1920,
          "min": 40,
          "max": 1920,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_present_HEIGHT": {
          "type": "range-number",
          "label": "演出領域の高さ",
          "default": 1080,
          "min": 40,
          "max": 1080,
          "step": 5,
          "numberStep": 1
        },
        "STAGE_PLUGIN_christmas_present_SCALE": {
          "type": "range-number",
          "label": "演出全体の倍率",
          "default": 1,
          "min": 0.1,
          "max": 3,
          "step": 0.05,
          "numberStep": 0.01
        },
        "STAGE_PLUGIN_christmas_present_INTENSITY": {
          "type": "select",
          "label": "この演出の強度",
          "default": "inherit",
          "options": [
            "inherit",
            "small",
            "standard",
            "large",
            "extra"
          ],
          "labels": {
            "inherit": "共通設定を使用",
            "small": "弱",
            "standard": "標準",
            "large": "強",
            "extra": "最大"
          }
        }
      }
    },
    "plugin:christmas_present": {
      "title": "クリスマスのプレゼント開封の設定（AI生成画像を同梱）",
      "tab": "effectPlacement",
      "layoutPlugin": "christmas_present",
      "fields": {
        "CHRISTMAS_PRESENT_AUTO": {
          "type": "checkbox",
          "label": "支援コメントで追加の開封演出を出す",
          "default": true
        },
        "CHRISTMAS_PRESENT_PARTICLE_COUNT": {
          "type": "range-number",
          "label": "飛び出す飾りの基準数",
          "default": 18,
          "min": 1,
          "max": 60,
          "step": 1
        },
        "CHRISTMAS_PRESENT_BOX_SIZE": {
          "type": "range-number",
          "label": "箱の基準サイズ（px）",
          "default": 268,
          "min": 80,
          "max": 800,
          "step": 10,
          "numberStep": 1
        },
        "CHRISTMAS_PRESENT_PARTICLE_SIZE": {
          "type": "range-number",
          "label": "飛び出す飾りの基準サイズ（px）",
          "default": 48,
          "min": 12,
          "max": 240,
          "step": 4,
          "numberStep": 1
        },
        "CHRISTMAS_PRESENT_SPREAD": {
          "type": "range-number",
          "label": "中身の飛散距離（px）",
          "default": 260,
          "min": 40,
          "max": 1600,
          "step": 20,
          "numberStep": 1
        }
      }
    }
  },
  "defaults": {
    "CHRISTMAS_COMMENT_FRAME": false,
    "CHRISTMAS_COMMENT_FRAME_BG_COLOR": "#10202b",
    "CHRISTMAS_COMMENT_FRAME_BG_OPACITY": 0,
    "DISPLAY_MODE": "stack",
    "UNDERBAR_MODE": "ticker",
    "UNDERBAR_LANES": 1,
    "UNDERBAR_LANE_MODE": "available",
    "UNDERBAR_LANE_GAP": 20,
    "UNDERBAR_SLIDE_MS": 450,
    "UNDERBAR_EXIT_CARDS": 2,
    "UNDERBAR_DIRECTION": "rtl",
    "UNDERBAR_SPEED": 140,
    "UNDERBAR_WIDTH": 600,
    "UNDERBAR_SCALE": 100,
    "UNDERBAR_BOTTOM": 28,
    "UNDERBAR_GAP": 60,
    "UNDERBAR_QUEUE": 20,
    "POPUP_PLACEMENT": "random",
    "POPUP_X": 50,
    "POPUP_Y": 50,
    "POPUP_SPREAD_X": 8,
    "POPUP_SPREAD_Y": 6,
    "POPUP_WIDTH": 420,
    "POPUP_SCALE": 100,
    "POPUP_DURATION": 6,
    "POPUP_MAX_ITEMS": 12,
    "COMMENT_EFFECT": "heart",
    "STAR_TARGET": "support-membership",
    "STAR_DIRECTION": "down-right",
    "STAR_COUNT": 12,
    "STAR_COLORS": "#fff7ad,#ffd166,#7dd3fc",
    "STAR_SIZE_MIN": 14,
    "STAR_SIZE_MAX": 28,
    "STAR_DURATION_MIN": 1.8,
    "STAR_DURATION_MAX": 3.2,
    "HEART_TARGET": "support-membership",
    "HEART_COUNT": 4,
    "HEART_SIZE": 32,
    "HEART_COLOR": "#ff416c",
    "HEART_DURATION": 2.5,
    "FLASH_TARGET": "support-membership",
    "FLASH_MODE": "shimmer",
    "FLASH_COLOR": "#ffd166",
    "FLASH_COLOR_MODE": "fixed",
    "FLASH_STRENGTH": 0.75,
    "FLASH_DURATION": 3,
    "MAX_ITEMS": 8,
    "MAX_WIDTH": "900px",
    "STACK_DIRECTION": "up",
    "ITEM_GAP_PX": 4,
    "SHOW_ICON": true,
    "SHOW_NAME": true,
    "SHOW_BADGES": true,
    "SHOW_USER_FLAGS": true,
    "COMMENT_TRANSLATION_MODE": "original",
    "MAX_COMMENT_UNITS": 0,
    "SHOW_EVENT_MESSAGES": true,
    "SHOW_EVENT_MESSAGE_SUPERCHAT": true,
    "SHOW_EVENT_MESSAGE_SUPERSTICKER": true,
    "SHOW_EVENT_MESSAGE_MEMBERSHIP_COMMENT": true,
    "SHOW_EVENT_MESSAGE_MEMBER_JOIN": true,
    "SHOW_EVENT_MESSAGE_MEMBERSHIP_GIFT": true,
    "SHOW_EVENT_MESSAGE_GIFT_RECEIVED": true,
    "FONT_FAMILY": "\"M PLUS 1p\", \"Noto Sans JP\", sans-serif",
    "FONT_SIZE": 24,
    "META_SCALE": 0.8,
    "AUTO_HIDE_MS": 0,
    "FADE_IN_MS": 300,
    "FADE_OUT_MS": 500,
    "GIFT_BG_OPACITY": 0.9,
    "GIFT_BORDER_OPACITY": 1,
    "MEMBER_BG_OPACITY": 0.9,
    "MEMBER_BORDER_OPACITY": 1,
    "BG_COLOR": "#101923",
    "BG_OPACITY": 0.45,
    "BG_BLUR": "12px",
    "BASE_BORDER_COLOR": "#ffffff",
    "BASE_BORDER_OPACITY": 0.15,
    "BASE_BORDER_WIDTH": 1,
    "SYSTEM_BORDER_OPACITY": 0.35,
    "TEXT_MAIN": "#ffffff",
    "TEXT_NAME": "#eeeeee",
    "ACCENT_COLOR": "#ffd700",
    "SHADOW_SOFT": "0 4px 12px rgba(0, 0, 0, 0.3)",
    "DEBUG": false,
    "COMMENT_BG_COLOR": "#000000",
    "STAGE_FIT": "contain",
    "SHOW_STAGE_BACKGROUND": false,
    "BACKGROUND_IMAGE": "",
    "COMMENT_X": 80,
    "COMMENT_Y": 100,
    "COMMENT_WIDTH": 760,
    "COMMENT_HEIGHT": 880,
    "COMMENT_SCALE": 1,
    "SHOW_COMMENT_FRAME": false,
    "ENABLE_STAGE_EFFECTS": true,
    "REDUCED_MOTION": false,
    "STAGE_EFFECT_POLICY": "queue",
    "STAGE_EFFECT_MAX_ACTIVE": 1,
    "STAGE_EFFECT_QUEUE_LIMIT": 6,
    "STAGE_EFFECT_ID": "sample_effect",
    "STAGE_EFFECT_INTENSITY_MODE": "fixed",
    "STAGE_EFFECT_COUNT": 12,
    "STAGE_EFFECT_DURATION_MS": 3000,
    "STAGE_EFFECT_BG_OPACITY": 0,
    "CHRISTMAS_ASSET_MODE": "generated",
    "CHRISTMAS_BACKGROUND": "legacy",
    "STAGE_PLUGIN_christmas_tree_ENABLED": true,
    "STAGE_PLUGIN_christmas_tree_X": 1340,
    "STAGE_PLUGIN_christmas_tree_Y": 160,
    "STAGE_PLUGIN_christmas_tree_WIDTH": 500,
    "STAGE_PLUGIN_christmas_tree_HEIGHT": 850,
    "STAGE_PLUGIN_christmas_lights_HEIGHT": 160,
    "STAGE_PLUGIN_christmas_present_X": 640,
    "STAGE_PLUGIN_christmas_present_Y": 300,
    "STAGE_PLUGIN_christmas_present_WIDTH": 640,
    "STAGE_PLUGIN_christmas_present_HEIGHT": 600,
    "STAGE_PLUGIN_sample_effect_ENABLED": true,
    "STAGE_PLUGIN_sample_effect_X": 0,
    "STAGE_PLUGIN_sample_effect_Y": 0,
    "STAGE_PLUGIN_sample_effect_WIDTH": 1920,
    "STAGE_PLUGIN_sample_effect_HEIGHT": 1080,
    "STAGE_PLUGIN_sample_effect_SCALE": 1,
    "STAGE_PLUGIN_sample_effect_INTENSITY": "inherit",
    "STAGE_PLUGIN_halloween_parade_effect_ENABLED": true,
    "STAGE_PLUGIN_halloween_parade_effect_X": 0,
    "STAGE_PLUGIN_halloween_parade_effect_Y": 0,
    "STAGE_PLUGIN_halloween_parade_effect_WIDTH": 1920,
    "STAGE_PLUGIN_halloween_parade_effect_HEIGHT": 1080,
    "STAGE_PLUGIN_halloween_parade_effect_SCALE": 1,
    "STAGE_PLUGIN_halloween_parade_effect_INTENSITY": "inherit",
    "HALLOWEEN_RENDER_MODE": "emoji",
    "HALLOWEEN_PATTERN": "parade",
    "STAGE_PLUGIN_heart_effect_ENABLED": true,
    "STAGE_PLUGIN_heart_effect_X": 0,
    "STAGE_PLUGIN_heart_effect_Y": 0,
    "STAGE_PLUGIN_heart_effect_WIDTH": 1920,
    "STAGE_PLUGIN_heart_effect_HEIGHT": 1080,
    "STAGE_PLUGIN_heart_effect_SCALE": 1,
    "STAGE_PLUGIN_heart_effect_INTENSITY": "inherit",
    "FX_HEART_COUNT": 18,
    "FX_HEART_SIZE": 80,
    "FX_HEART_COLOR": "#ff598b",
    "FX_HEART_SPEED": 100,
    "STAGE_PLUGIN_stars_effect_ENABLED": true,
    "STAGE_PLUGIN_stars_effect_X": 0,
    "STAGE_PLUGIN_stars_effect_Y": 0,
    "STAGE_PLUGIN_stars_effect_WIDTH": 1920,
    "STAGE_PLUGIN_stars_effect_HEIGHT": 1080,
    "STAGE_PLUGIN_stars_effect_SCALE": 1,
    "STAGE_PLUGIN_stars_effect_INTENSITY": "inherit",
    "FX_STARS_COUNT": 24,
    "FX_STARS_SIZE": 48,
    "FX_STARS_COLOR": "#ffe89c",
    "FX_STARS_SPEED": 300,
    "FX_STARS_DIRECTION": "right",
    "STAGE_PLUGIN_confetti_effect_ENABLED": true,
    "STAGE_PLUGIN_confetti_effect_X": 0,
    "STAGE_PLUGIN_confetti_effect_Y": 0,
    "STAGE_PLUGIN_confetti_effect_WIDTH": 1920,
    "STAGE_PLUGIN_confetti_effect_HEIGHT": 1080,
    "STAGE_PLUGIN_confetti_effect_SCALE": 1,
    "STAGE_PLUGIN_confetti_effect_INTENSITY": "inherit",
    "FX_CONFETTI_COUNT": 60,
    "FX_CONFETTI_SIZE": 16,
    "FX_CONFETTI_COLORS": "#ff6685,#ffd166,#68dfb0,#69bfff,#bc94ff",
    "FX_CONFETTI_SPEED": 140,
    "STAGE_PLUGIN_sparkle_effect_ENABLED": true,
    "STAGE_PLUGIN_sparkle_effect_X": 0,
    "STAGE_PLUGIN_sparkle_effect_Y": 0,
    "STAGE_PLUGIN_sparkle_effect_WIDTH": 1920,
    "STAGE_PLUGIN_sparkle_effect_HEIGHT": 1080,
    "STAGE_PLUGIN_sparkle_effect_SCALE": 1,
    "STAGE_PLUGIN_sparkle_effect_INTENSITY": "inherit",
    "FX_SPARKLE_COUNT": 24,
    "FX_SPARKLE_SIZE": 64,
    "FX_SPARKLE_COLOR": "#fff1b8",
    "STAGE_PLUGIN_christmas_tree_SCALE": 1,
    "STAGE_PLUGIN_christmas_tree_INTENSITY": "inherit",
    "CHRISTMAS_TREE_STAGES": "10",
    "CHRISTMAS_TREE_GOAL": 500,
    "CHRISTMAS_TREE_SHOW_COUNTER": false,
    "CHRISTMAS_TREE_COUNTER_SIZE": 32,
    "CHRISTMAS_TREE_SUPPORT_BASE": 5,
    "CHRISTMAS_TREE_GIFT_LIMIT": 30,
    "STAGE_PLUGIN_christmas_snow_ENABLED": false,
    "STAGE_PLUGIN_christmas_snow_X": 0,
    "STAGE_PLUGIN_christmas_snow_Y": 0,
    "STAGE_PLUGIN_christmas_snow_WIDTH": 1920,
    "STAGE_PLUGIN_christmas_snow_HEIGHT": 1080,
    "STAGE_PLUGIN_christmas_snow_SCALE": 1,
    "STAGE_PLUGIN_christmas_snow_INTENSITY": "inherit",
    "STAGE_PLUGIN_christmas_lights_ENABLED": false,
    "STAGE_PLUGIN_christmas_lights_X": 0,
    "STAGE_PLUGIN_christmas_lights_Y": 0,
    "STAGE_PLUGIN_christmas_lights_WIDTH": 1920,
    "STAGE_PLUGIN_christmas_lights_SCALE": 1,
    "STAGE_PLUGIN_christmas_lights_INTENSITY": "inherit",
    "CHRISTMAS_LIGHTS_COLOR": "warm",
    "STAGE_PLUGIN_christmas_present_ENABLED": true,
    "STAGE_PLUGIN_christmas_present_SCALE": 1,
    "STAGE_PLUGIN_christmas_present_INTENSITY": "inherit",
    "CHRISTMAS_PRESENT_AUTO": true,
    "CHRISTMAS_PRESENT_PARTICLE_COUNT": 18,
    "CHRISTMAS_PRESENT_BOX_SIZE": 268,
    "CHRISTMAS_PRESENT_PARTICLE_SIZE": 48,
    "CHRISTMAS_PRESENT_SPREAD": 260
  },
  "placement": {
    "section": "comments",
    "fullscreenWhen": [
      {
        "DISPLAY_MODE": "underbar"
      },
      {
        "DISPLAY_MODE": "popup",
        "POPUP_PLACEMENT": "random"
      }
    ]
  },
  "visibility": {
    "display": "DISPLAY_MODE",
    "effect": "COMMENT_EFFECT",
    "plugin": "STAGE_EFFECT_ID"
  }
});
if (typeof module === 'object' && module.exports) module.exports = contract; else root.VCT_TEMPLATE_SETTINGS = contract;
})(typeof window === 'object' ? window : globalThis);
