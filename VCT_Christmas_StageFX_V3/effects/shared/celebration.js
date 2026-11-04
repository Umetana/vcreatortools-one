// 描画だけを担当する共有部品。登録方式・設定キー・Hostの終了処理には依存しない。
(function () {
  'use strict';
  const number = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const palettes = { sparkle: ['#fff1b8'], heart: ['#ff598b'], stars: ['#ffe89c'], confetti: ['#ff6685','#ffd166','#68dfb0','#69bfff','#bc94ff'] };
  const colors = (value, fallback) => {
    const valid = String(value || '').split(',').map(x => x.trim()).filter(x => /^#[0-9a-f]{6}$/i.test(x));
    return valid.length ? valid : fallback;
  };
  function plan(kind, options, size, random = Math.random) {
    if (!palettes[kind]) throw new Error('未対応の演出です');
    const rand = (a,b) => a + random() * (b-a);
    const width = number(size.width,1920,1,16384), height = number(size.height,1080,1,16384);
    const duration = number(options.duration,3000,1200,10000);
    const strength = ({ small:.6, standard:1, large:1.45, extra:2 })[options.intensity] || 1;
    const count = Math.round(number(number(options.count,18,1,60)*strength,18,1,60));
    const baseSize = number(options.size,80,4,200), speed = number(options.speed,100,20,800);
    const palette = colors(options.colors, palettes[kind]);
    const direction = options.direction === 'left' ? -1 : options.direction === 'random' ? (random()<.5 ? -1 : 1) : 1;
    return Array.from({length:count}, () => {
      const particleSize = Math.min(260,baseSize*rand(.8,1.2));
      const delay = rand(0,duration*(kind === 'sparkle' ? .62 : .22));
      // 最後の粒もHost終了より前にフェードを終え、速さと寿命を独立させる。
      const life = Math.min(duration-delay-60,duration*(kind === 'sparkle' ? rand(.24,.36) : rand(.64,.76)));
      const distance = speed * life / 1000 * rand(.85,1.15), sway=rand(18,52);
      const rotation=rand(-12,12), spin=rand(540,1260);
      const offsets=[0,.12,.38,.66,.84,1];
      const frames=offsets.map((t,i)=>{
        if (kind === 'sparkle') return {offset:t,opacity:[0,.65,1,.8,.3,0][i],transform:'scale('+[.08,.55,1.12,.85,.4,0][i]+')'};
        const dx = kind === 'stars' ? direction*distance*.65*t : Math.sin(t*Math.PI*2)*sway + (kind === 'confetti' ? 65*t : 0);
        const dy = (kind === 'heart' ? -1 : 1)*distance*t;
        const scale = kind === 'confetti' ? 1 : i===0 ? .65 : i===1 ? 1 : .95;
        const turn = kind === 'confetti' ? ' rotateX('+spin*t+'deg) rotateZ('+(rotation+spin*.3*t)+'deg)' : ' rotate('+(kind==='heart'?rotation*Math.sin(t*Math.PI*2):0)+'deg)';
        return {offset:t,opacity:i===0||i===5?0:kind==='stars'&&i===3?.7:1,
          transform:'translate3d('+dx+'px,'+dy+'px,0)'+turn+' scale('+scale+')'};
      });
      return {x:rand(.05,.95)*width,y:rand(.08,.9)*height,size:particleSize,
        color:palette[Math.floor(random()*palette.length)],angle:Math.atan2(1,direction*.65)*180/Math.PI,
        aspect:kind==='confetti'?rand(.4,1):1,delay,duration:life,frames};
    });
  }
  function play(kind, context, options) {
    const doc=context.root.ownerDocument || document;
    context.root.classList.add('fx-celebration-root');
    for (const item of plan(kind,options,context.size)) {
      const particle=doc.createElement('span');
      particle.className='fx-celebration-particle fx-celebration-'+kind;
      Object.assign(particle.style,{left:item.x+'px',top:item.y+'px',width:item.size+'px',height:item.size*item.aspect+'px',color:item.color});
      if(kind==='heart' || kind==='stars' || kind==='sparkle') {
        const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
        const shape=doc.createElementNS('http://www.w3.org/2000/svg','path');shape.setAttribute('d',kind==='sparkle' ? 'M12 0C13.4 8.6 15.4 10.6 24 12C15.4 13.4 13.4 15.4 12 24C10.6 15.4 8.6 13.4 0 12C8.6 10.6 10.6 8.6 12 0Z' : kind==='stars' ? 'M12 1L15.4 8L23 9.1L17.5 14.5L18.8 22L12 18.4L5.2 22L6.5 14.5L1 9.1L8.6 8Z' : 'M12 21C9 18 2 13.5 2 7.8C2 2.8 8.3 1.8 12 6C15.7 1.8 22 2.8 22 7.8C22 13.5 15 18 12 21Z');
        if(kind==='stars') {
          const direction=doc.createElement('span');direction.className='fx-celebration-tail-direction';direction.style.transform='rotate('+item.angle+'deg)';
          const tail=doc.createElement('span');tail.className='fx-celebration-tail';direction.append(tail);particle.append(direction);
        }
        svg.append(shape);particle.append(svg);
      }
      if(kind==='confetti') particle.style.backgroundColor=item.color;
      context.root.appendChild(particle);
      context.animations.animate(particle,item.frames,{duration:item.duration,delay:item.delay,easing:'linear',fill:'both'});
    }
  }
  window.VCTCelebration=Object.freeze({plan,play});
})();
