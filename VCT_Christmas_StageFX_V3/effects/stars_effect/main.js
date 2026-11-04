// Stage固有の設定と登録。星と尾の描画は共有部品を使う。
(function () {
  'use strict';
  class StarsEffect {
    static manifest = {stageApi:1, lifecycle:'host', name:'Stars（流星）', usesCommonCount:false,
      settings: {
        FX_STARS_COUNT:{type:'range-number',min:1,max:60,step:1,default:24,label:'星の数（標準強度）'},
        FX_STARS_SIZE:{type:'range-number',min:16,max:160,step:2,default:48,label:'星の基本サイズ (px)'},
        FX_STARS_COLOR:{type:'color',default:'#ffe89c',label:'星と尾の色'},
        FX_STARS_SPEED:{type:'range-number',min:60,max:800,step:20,default:300,label:'落下速度・縦方向 (px/秒)'},
        FX_STARS_DIRECTION:{type:'select',default:'right',options:['right','left','random'],labels:{right:'右下',left:'左下',random:'演出ごとにランダム'},label:'流れる方向'}
      }};
    constructor(context,params) {this.context=context;this.params=params;}
    start() {const s=this.params.settings||{};window.VCTCelebration.play('stars',this.context,{
      count:s.FX_STARS_COUNT??24,size:s.FX_STARS_SIZE??48,colors:s.FX_STARS_COLOR,speed:s.FX_STARS_SPEED??300,direction:s.FX_STARS_DIRECTION,
      duration:this.params.duration,intensity:this.params.intensity});}
    destroy() { /* 解放はContextへ任せる。 */ }
  }
  window.VCTStage.registry.register('stars_effect',StarsEffect);
})();
