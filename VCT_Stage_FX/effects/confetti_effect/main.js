// 全面に時間差で発生する紙吹雪。移植元の横揺れ・反転を参考に再構成。
(function () {
  'use strict';
  class ConfettiEffect {
    static manifest = {stageApi:1, lifecycle:'host', name:'紙吹雪', usesCommonCount:false,
      settings: {
        FX_CONFETTI_COUNT:{type:'range-number',min:1,max:60,step:1,default:60,label:'紙片の数（標準強度・最大60）'},
        FX_CONFETTI_SIZE:{type:'range-number',min:4,max:40,step:1,default:16,label:'紙片の基本サイズ (px)'},
        FX_CONFETTI_COLORS:{type:'text',default:'#ff6685,#ffd166,#68dfb0,#69bfff,#bc94ff',label:'紙片の色（#rrggbbをカンマ区切り）'},
        FX_CONFETTI_SPEED:{type:'range-number',min:20,max:400,step:10,default:140,label:'落下速度 (px/秒)'}
      }};
    constructor(context,params) {this.context=context;this.params=params;}
    start() {const s=this.params.settings||{};window.VCTCelebration.play('confetti',this.context,{
      count:s.FX_CONFETTI_COUNT??60,size:s.FX_CONFETTI_SIZE??16,colors:s.FX_CONFETTI_COLORS,speed:s.FX_CONFETTI_SPEED??140,
      duration:this.params.duration,intensity:this.params.intensity});}
    destroy() { /* 解放はContextへ任せる。 */ }
  }
  window.VCTStage.registry.register('confetti_effect',ConfettiEffect);
})();
