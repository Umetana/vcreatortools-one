// Stage固有の設定と登録だけを担当し、描画は共有部品へ渡す。
(function () {
  'use strict';
  class HeartEffect {
    static manifest = {stageApi:1, lifecycle:'host', name:'Heart（ハート上昇）', usesCommonCount:false,
      settings: {
        FX_HEART_COUNT:{type:'range-number',min:1,max:60,step:1,default:18,label:'ハートの数（標準強度）'},
        FX_HEART_SIZE:{type:'range-number',min:24,max:200,step:2,default:80,label:'ハートの基本サイズ (px)'},
        FX_HEART_COLOR:{type:'color',default:'#ff598b',label:'ハートの色'},
        FX_HEART_SPEED:{type:'range-number',min:20,max:240,step:10,default:100,label:'上昇速度 (px/秒)'}
      }};
    constructor(context,params) {this.context=context;this.params=params;}
    start() {const s=this.params.settings||{};window.VCTCelebration.play('heart',this.context,{
      count:s.FX_HEART_COUNT??18,size:s.FX_HEART_SIZE??80,colors:s.FX_HEART_COLOR,speed:s.FX_HEART_SPEED??100,
      duration:this.params.duration,intensity:this.params.intensity});}
    destroy() { /* DOMとアニメーションの解放はContextへ任せる。 */ }
  }
  window.VCTStage.registry.register('heart_effect',HeartEffect);
})();
