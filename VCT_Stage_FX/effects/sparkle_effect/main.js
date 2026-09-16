// Stage固有の設定と登録。きらめきの描画は共有部品を使う。
(function () {
  'use strict';
  class SparkleEffect {
    static manifest = {stageApi:1, lifecycle:'host', name:'Sparkle（きらめき）', usesCommonCount:false,
      settings: {
        FX_SPARKLE_COUNT:{type:'range-number',min:1,max:60,step:1,default:24,label:'光の数（標準強度）'},
        FX_SPARKLE_SIZE:{type:'range-number',min:16,max:160,step:2,default:64,label:'光の基本サイズ (px)'},
        FX_SPARKLE_COLOR:{type:'color',default:'#fff1b8',label:'光の色'}
      }};
    constructor(context,params) {this.context=context;this.params=params;}
    start() {const s=this.params.settings||{};window.VCTCelebration.play('sparkle',this.context,{
      count:s.FX_SPARKLE_COUNT??24,size:s.FX_SPARKLE_SIZE??64,colors:s.FX_SPARKLE_COLOR,
      duration:this.params.duration,intensity:this.params.intensity});}
    destroy() { /* 解放はContextへ任せる。 */ }
  }
  window.VCTStage.registry.register('sparkle_effect',SparkleEffect);
})();
