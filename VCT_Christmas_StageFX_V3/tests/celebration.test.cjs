// 位置・時間・負荷上限と再利用境界を、決定的な乱数で検証する。
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../effects/shared/celebration.js'),'utf8'),scope);
const {plan}=scope.window.VCTCelebration;
function random(){let state=13;return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};}
const move=frame=>frame.transform.match(/translate3d\(([-.0-9e+]+)px,([-.0-9e+]+)px/).slice(1).map(Number);
test('全演出の粒数・サイズ・生成範囲・終了時間は上限内。最終フレームで消える',()=>{
 for(const kind of ['heart','stars','confetti','sparkle'])for(const duration of [1200,3000,10000]){
  const items=plan(kind,{duration,count:999,size:999,speed:999,intensity:'extra',colors:'invalid,#ff1234'},{width:1920,height:1080},random());
  assert.equal(items.length,60);
  for(const p of items){assert.ok(p.size<=260);assert.equal(p.color,'#ff1234');assert.ok(p.x>=0&&p.x<1920&&p.y>=0&&p.y<1080);assert.ok(p.delay>=0&&p.delay+p.duration<duration);assert.equal(p.frames.at(-1).opacity,0);assert.ok(!p.frames.some(f=>/NaN|Infinity/.test(f.transform)));}
  assert.ok(new Set(items.map(p=>Math.round(p.y))).size>10,'出現位置を横一列に揃えない');
  assert.ok(new Set(items.map(p=>Math.round(p.delay))).size>10,'少しずつ出現させる');
 }
});
test('上昇・斜め落下・紙吹雪の動きと速度、ランダム方向は実行単位で揃う',()=>{
 for(const [kind,sign] of [['heart',-1],['stars',1],['confetti',1]]){
  const slow=plan(kind,{count:12,speed:100,duration:3000,direction:'random'},{width:1920,height:1080},random());
  const fast=plan(kind,{count:12,speed:200,duration:3000,direction:'random'},{width:1920,height:1080},random());
  slow.forEach((p,i)=>{const a=move(p.frames.at(-1)),b=move(fast[i].frames.at(-1));assert.equal(Math.sign(a[1]),sign);assert.equal(b[1],a[1]*2);assert.equal(p.duration,fast[i].duration);});
  if(kind==='stars')assert.equal(new Set(slow.map(p=>Math.sign(move(p.frames.at(-1))[0]))).size,1);
 }
 const left=plan('stars',{direction:'left'},{width:1920,height:1080},random());assert.ok(move(left[0].frames.at(-1))[0]<0);
});
test('不正色は初期配色へ戻り、同じ乱数なら画面寸法だけが配置へ反映される',()=>{
 const a=plan('confetti',{colors:'oops',count:4},{width:1920,height:1080},random());
 const b=plan('confetti',{colors:'oops',count:4},{width:960,height:540},random());
 a.forEach((p,i)=>{assert.match(p.color,/^#[0-9a-f]{6}$/);assert.equal(p.x,b[i].x*2);assert.equal(p.y,b[i].y*2);assert.equal(p.size,b[i].size);});
 assert.equal(scope.window.VCTStage,undefined,'描画部品の読込はStage登録を行わない');
});

test('きらめきはその場で膨らんで縮み、時間差で出現する',()=>{
 const items=plan('sparkle',{count:24,duration:3000},{width:1920,height:1080},random());
 assert.ok(items.some(p=>p.delay>900));
 for(const p of items){
  const scales=p.frames.map(f=>Number(f.transform.match(/scale\(([^)]+)\)/)[1]));
  assert.ok(Math.max(...scales)>1);assert.equal(scales.at(-1),0);
  assert.ok(p.frames.every(f=>!f.transform.includes('translate')));
 }
});
