const { test } = require('node:test');
const assert = require('node:assert/strict');
const { snapshot, normalizeGoal, eligible, pointsFor, stageKind, stagePositions, normalizeGiftLimit, Progress } = require('../runtime/christmas-progress.js');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const scope = { window: { VCTStage: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../triggers.js'), 'utf8'), scope);
const classify = parsed => scope.window.VCTStage.intensity(parsed, 'value');
test('10段階固定でゴール比率を使い、完成後は1段階分ごとに発光の区切りを数える', () => {
  for (let stage = 0; stage <= 10; stage++) assert.equal(snapshot(stage * 50, 500).stage, stage);
  assert.equal(snapshot(499, 500).completed, false);
  assert.equal(snapshot(500, 500).completed, true);
  assert.equal(snapshot(549, 500).celebrations, 0);
  assert.equal(snapshot(550, 500).celebrations, 1);
  assert.equal(snapshot(700, 500).celebrations, 4);
  assert.equal(snapshot(100000, 500).stage, 10);
  assert.equal(snapshot(2, 13).stage, 1);
  assert.equal(snapshot(14, 13).celebrations, 0);
  assert.equal(snapshot(15, 13).celebrations, 1);
  assert.equal(normalizeGoal(0), 500); assert.equal(normalizeGoal(5), 10);
});
test('10・20・30段階でも完成30個を保ち、完成後の発光間隔は目標の10％のまま', () => {
  for (const stages of [10,20,30]) {
    let previous = 0;
    for (let i=1;i<=stages;i++) {
      const p=snapshot(i*30,stages*30,stages);
      assert.equal(p.stage,i);
      assert.equal(p.ornaments-previous,stages===10?3:stages===30?1:(i%2?1:2));previous=p.ornaments;
    }
    const p=snapshot(900,900,stages);assert.equal(p.ornaments,30);assert.equal(p.lights,20);assert.equal(p.completed,true);
    assert.equal(snapshot(989,900,stages).celebrations,0);assert.equal(snapshot(990,900,stages).celebrations,1);
  }
  assert.equal(snapshot(100,900,100).stages,10);
  assert.equal(snapshot(10,10,'30').stage,30);
});
test('本文・絵文字の判定は通知や固定を除き、支援を含むかは入力側で選択できる', () => {
  const comment = { message: { text: 'コメント' } };
  assert.equal(eligible(comment, false), true);
  assert.equal(eligible({ ...comment, system: { sticky: true } }, true), false);
  assert.equal(eligible({ event: { isSupport: true } }, true), false);
  assert.equal(eligible({ message: { text: '   ', parts: [] } }, true), false);
  assert.equal(eligible({ message: { parts: [{ type: 'emoji', content: '🎄' }] } }, false), true);
  assert.equal(eligible({ ...comment, event: { isSupport: true } }, false), false);
  assert.equal(eligible({ ...comment, event: { isSupport: true } }, true), true);
});
test('保存復元・重複除去・手動リセットは表示と独立し、リセット後も古い受信を数えない', () => {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) };
  const p = new Progress({ storage, key: 'tree' });
  for (let i = 0; i < 100; i++) assert.equal(p.accept(`a-${i}`), true);
  assert.equal(p.accept('a-99'), false); assert.equal(p.accept(null), false); p.destroy();
  const restored = new Progress({ storage, key: 'tree' });
  assert.equal(restored.count, 100); assert.equal(restored.accept('a-99'), false);
  restored.reset(); assert.equal(restored.count, 0); assert.equal(restored.accept('a-99'), false);
  assert.equal(restored.accept('new'), true); restored.destroy();
  const last = new Progress({ storage, key: 'tree' }); assert.equal(last.count, 1); last.destroy();
  const other = new Progress({ storage, key: 'another-profile' }); assert.equal(other.count, 0); other.destroy();
});
test('重複履歴は上限を持ち、保存失敗・壊れたデータでも画面内の進行を継続する', () => {
  const errors = [], storage = { getItem: () => '{bad', setItem: () => { throw Error('保存不可'); } };
  const p = new Progress({ storage, key: 'tree', onError: e => errors.push(e) });
  for (let i = 0; i < 2500; i++) p.accept(String(i));
  assert.equal(p.count, 2500); assert.equal(p.seen.size, 2000); p.destroy();
  assert.equal(errors.length, 2);
});
test('通常1Pと支援基準×既存4段階を合算し、受取通知・固定・空通知は加算しない', () => {
  const normal = { message: { text: '参加' } };
  const support = (amount, currency = 'JPY', text = '応援') => ({ message: { text }, event: { isSupport: true, kind: 'superchat' }, monetization: { money: { amount, currency } } });
  assert.equal(pointsFor(normal, 5, classify), 1);
  for (const [amount, expected] of [[999,6],[1000,11],[5000,16],[10000,26]]) assert.equal(pointsFor(support(amount),5,classify),expected);
  assert.equal(pointsFor(support(5,'USD'),5,classify),11);
  assert.equal(pointsFor(support(1,'XXX'),5,classify),11);
  assert.equal(pointsFor(support(10000,'JPY',''),5,classify),25);
  assert.equal(pointsFor(support(10000),0,classify),1);
  assert.equal(pointsFor(support(10000,'JPY',''),0,classify),0);
  assert.equal(pointsFor({ ...support(10000), system: { sticky: true } },5,classify),0);
  assert.equal(pointsFor({ ...normal, event: { isMembership: true, kind: 'member_milestone' } },5,classify),1);
  assert.equal(pointsFor({ ...normal, event: { isMembership: true, shouldShowMessage: false } },5,classify),0);
  assert.equal(pointsFor({ ...support(10000), membership: { isGiftReceiver: true } },5,classify),0);
  const gift = { event: { kind: 'membership_gift', isSupport: true }, membership: { giftCount: 20 } };
  assert.equal(pointsFor(gift,5,classify),25);
  assert.equal(pointsFor({ event: { kind: 'jewel', isSupport: true }, monetization: { jewels: { count: 1000 } } },5,classify),15);
});
test('支援ポイントをまとめて保存復元し、1イベントは再受信や再起動後も一度だけ加算', () => {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) };
  const p = new Progress({ storage, key: 'points' });
  p.accept('normal',1);p.accept('gift',26);assert.equal(p.count,27);
  assert.equal(p.accept('gift',26),false);assert.equal(p.accept('zero',0),false);assert.equal(p.accept('invalid',1.5),false);
  p.destroy();const restored=new Progress({storage,key:'points'});
  assert.equal(restored.count,27);assert.equal(restored.accept('gift',26),false);restored.destroy();
});
test('段階の3種は偏りを抑えて抽選し、同じseedと位置では再描画しても変わらない', () => {
  const first = Array.from({length:30},(_,i)=>stageKind(1234,i));
  assert.deepEqual(first,Array.from({length:30},(_,i)=>stageKind(1234,i)));
  for(let i=0;i<30;i+=3) assert.deepEqual([...new Set(first.slice(i,i+3))].sort(),['gold','red','ribbon']);
  assert.notDeepEqual(first,Array.from({length:30},(_,i)=>stageKind(5678,i)));
});
test('段階飾りの順序と揺らぎはseedで再現でき、30か所の範囲と間隔を保つ', () => {
  for(let seed=1;seed<=100;seed++) {
    const points=stagePositions(seed);assert.equal(points.length,30);assert.deepEqual(points,stagePositions(seed));
    for(let i=0;i<points.length;i++) {
      const [x,y]=points[i];assert.ok(x>=10&&x<=86&&y>=18&&y<=92);
      for(let j=0;j<i;j++)assert.ok(Math.hypot(x-points[j][0],(y-points[j][1])*1.5)>=7);
    }
  }
  assert.notDeepEqual(stagePositions(123),stagePositions(456));
  const ys=stagePositions(123).map(p=>p[1]);assert.notDeepEqual(ys,[...ys].sort((a,b)=>a-b));
});
test('ギフト飾りはポイント0でも追加され、上限では古い順に押し出し、保存で種類と位置を保持', () => {
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const p=new Progress({storage,key:'gift'});
  for(let i=1;i<=5;i++)assert.equal(p.accept('gift-'+i,0,{gift:true,limit:3,rank:'large'}),true);
  assert.equal(p.count,0);assert.deepEqual(p.gifts.map(g=>g.id),[3,4,5]);assert.equal(new Set(p.gifts.map(g=>g.slot)).size,3);
  assert.equal(p.accept('gift-5',0,{gift:true,limit:3}),false);
  const expected=JSON.parse(JSON.stringify(p.gifts)),seed=p.seed;p.destroy();
  const restored=new Progress({storage,key:'gift'});assert.deepEqual(restored.gifts,expected);assert.equal(restored.seed,seed);
  restored.trimGifts(1);assert.deepEqual(restored.gifts.map(g=>g.id),[5]);restored.reset();assert.equal(restored.gifts.length,0);assert.equal(restored.count,0);restored.destroy();
});
test('ギフト飾りは設定外の入力でも120個を超えず、旧保存データのポイントと重複履歴を引き継ぐ', () => {
  let raw=JSON.stringify({version:1,count:27,seen:['old']});const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};
  const p=new Progress({storage,key:'legacy'});assert.equal(p.count,27);assert.equal(p.gifts.length,0);assert.equal(p.accept('old',1),false);
  for(let i=0;i<200;i++)p.accept(String(i),0,{gift:true,limit:99999});
  assert.equal(p.gifts.length,120);assert.equal(new Set(p.gifts.map(g=>g.slot)).size,120);
  assert.equal(normalizeGiftLimit(99999),120);assert.equal(normalizeGiftLimit(-4),1);p.destroy();
  assert.equal(JSON.parse(raw).version,2);const restored=new Progress({storage,key:'legacy'});assert.equal(restored.count,27);assert.equal(restored.gifts.length,120);restored.destroy();
});
