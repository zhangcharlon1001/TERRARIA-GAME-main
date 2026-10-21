const snd={ctx:null,master:null,enabled:true,last:{}};
(function(){
  function ok(name,gap){
    if(!snd.enabled||!snd.ctx)return false;
    const now=snd.ctx.currentTime;
    if(snd.last[name]&&now-snd.last[name]<gap)return false;
    snd.last[name]=now;
    return true;
  }
  snd.init=function(){
    if(snd.ctx)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC){snd.enabled=false;return}
      snd.ctx=new AC();
      snd.master=snd.ctx.createGain();
      snd.master.gain.value=0.22;
      snd.master.connect(snd.ctx.destination);
    }catch(e){snd.enabled=false}
  };
  snd.resume=function(){if(snd.ctx&&snd.ctx.state==='suspended')snd.ctx.resume()};
  function tone(freq,dur,type,vol,slide){
    if(!snd.ctx)return;
    const t=snd.ctx.currentTime;
    const o=snd.ctx.createOscillator();
    const g=snd.ctx.createGain();
    o.type=type||'square';
    o.frequency.setValueAtTime(freq,t);
    if(slide)o.frequency.linearRampToValueAtTime(Math.max(30,freq+slide),t+dur);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g);g.connect(snd.master);
    o.start(t);o.stop(t+dur+0.02);
  }
  function noise(dur,vol,freq,q){
    if(!snd.ctx)return;
    const t=snd.ctx.currentTime;
    const len=Math.max(1,(dur*snd.ctx.sampleRate)|0);
    const buf=snd.ctx.createBuffer(1,len,snd.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=snd.ctx.createBufferSource();
    src.buffer=buf;
    const f=snd.ctx.createBiquadFilter();
    f.type='bandpass';
    f.frequency.value=freq||800;
    f.Q.value=q||1;
    const g=snd.ctx.createGain();
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f);f.connect(g);g.connect(snd.master);
    src.start(t);
  }
  snd.dig=function(){if(ok('dig',0.09))noise(0.05,0.4,900,0.8)};
  snd.brk=function(){if(ok('brk',0.05)){noise(0.14,0.55,420,0.7);tone(110,0.1,'triangle',0.25,-40)}};
  snd.place=function(){if(ok('place',0.06)){tone(210,0.05,'square',0.22);noise(0.03,0.2,1400)}};
  snd.hurt=function(){if(ok('hurt',0.15)){tone(240,0.18,'sawtooth',0.3,-140);noise(0.1,0.3,500)}};
  snd.hit=function(){if(ok('hit',0.06)){noise(0.07,0.5,320,0.9);tone(85,0.07,'triangle',0.3,-20)}};
  snd.kill=function(){if(ok('kill',0.1)){noise(0.2,0.5,260,0.6);tone(160,0.25,'triangle',0.25,-110)}};
  snd.pickup=function(){if(ok('pickup',0.08)){tone(784,0.06,'sine',0.22);setTimeout(()=>tone(1175,0.08,'sine',0.2),55)}};
  snd.craft=function(){if(ok('craft',0.1)){tone(660,0.07,'sine',0.25);setTimeout(()=>tone(990,0.1,'sine',0.22),70)}};
  snd.swing=function(){if(ok('swing',0.09))noise(0.1,0.16,2200,2.5)};
  snd.eat=function(){if(ok('eat',0.3)){noise(0.08,0.3,700);setTimeout(()=>noise(0.08,0.3,900),90)}};
  snd.jump=function(){if(ok('jump',0.2))tone(160,0.08,'sine',0.1,60)};
  snd.die=function(){tone(320,0.7,'sawtooth',0.3,-260);noise(0.4,0.4,300)};
})();