function collideAxis(e,axis,prevBottom,downThrough){
  const x0=Math.floor(e.x/TILE),y0=Math.floor(e.y/TILE);
  const x1=Math.floor((e.x+e.w-0.01)/TILE),y1=Math.floor((e.y+e.h-0.01)/TILE);
  let solidHit=false;
  for(let y=y0;y<=y1;y++){
    for(let x=x0;x<=x1;x++){
      if(!solidAt(x,y))continue;
      solidHit=true;
      if(axis==='x'){
        if(e.vx>0)e.x=x*TILE-e.w-0.01;
        else if(e.vx<0)e.x=(x+1)*TILE+0.01;
        e.vx=0;
      }else{
        if(e.vy>0){e.y=y*TILE-e.h-0.01;e.vy=0;e.onGround=true}
        else if(e.vy<0){e.y=(y+1)*TILE+0.01;e.vy=0}
      }
      break;
    }
    if(solidHit)break;
  }
  if(axis==='y'&&!solidHit){
    e.onGround=false;
    if(e.vy>0&&!downThrough){
      const footY=Math.floor((e.y+e.h-0.01)/TILE);
      for(let x=x0;x<=x1;x++){
        if(platformAt(x,footY)){
          const platTop=footY*TILE;
          if(prevBottom<=platTop+3){
            e.y=platTop-e.h-0.01;e.vy=0;e.onGround=true;
            break;
          }
        }
      }
    }
  }
}
function moveEntity(e,dt,downThrough){
  const prevBottom=e.y+e.h;
  e.vy=Math.min(e.vy+GRAVITY*dt,620);
  e.x+=e.vx*dt;
  collideAxis(e,'x',prevBottom);
  e.y+=e.vy*dt;
  collideAxis(e,'y',prevBottom,downThrough);
  if(e.x<0){e.x=0;e.vx=0}

  const maxX=WORLD_W*TILE-e.w;
  if(e.x>maxX){e.x=maxX;e.vx=0}
}
function overlap(a,b){
  return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

class Player{
  constructor(x,y){
    this.x=x-6;this.y=y-28;this.w=12;this.h=28;
    this.vx=0;this.vy=0;this.onGround=false;
    this.facing=1;this.walkT=0;this.moving=false;
    this.hp=PLAYER.HP;this.maxHp=PLAYER.HP;
    this.iframes=0;this.dead=false;this.deadT=0;
    this.swingT=-1;this.swingCd=0;this.useCd=0;
    this.regenT=0;this.combatT=0;
    this.dig=null;this.jumpBuf=0;this.coyote=0;
    this.jumpHeld=false;
  }
  get cx(){return this.x+this.w/2}
  get cy(){return this.y+this.h/2}
  update(dt,input){
    if(this.dead){this.deadT+=dt;return}
    if(this.iframes>0)this.iframes-=dt;
    if(this.swingCd>0)this.swingCd-=dt;
    if(this.useCd>0)this.useCd-=dt;
    if(this.combatT>0){this.combatT-=dt}else{
      if(this.hp<this.maxHp){
        this.regenT+=dt;
        if(this.regenT>1){this.regenT=0;this.hp=Math.min(this.maxHp,this.hp+1)}
      }
    }
    const dir=(input.right?1:0)-(input.left?1:0);
    if(dir!==0){
      this.facing=dir;
      const acc=this.onGround?1900:900;
      this.vx=Math.max(-PLAYER.SPEED,Math.min(PLAYER.SPEED,this.vx+dir*acc*dt));
      this.moving=true;
    }else{
      const fric=this.onGround?2400:300;
      if(Math.abs(this.vx)<=fric*dt)this.vx=0;
      else this.vx-=Math.sign(this.vx)*fric*dt;
      this.moving=false;
    }
    if(this.onGround)this.coyote=0.09;
    else if(this.coyote>0)this.coyote-=dt;
    if(input.jump&&!this.jumpHeld){this.jumpBuf=0.1;snd.jump()}
    this.jumpHeld=input.jump;
    if(this.jumpBuf>0){
      this.jumpBuf-=dt;
      if(this.coyote>0){
        this.vy=PLAYER.JUMP;
        this.onGround=false;this.coyote=0;this.jumpBuf=0;
      }
    }
    if(!input.jump&&this.vy<-160)this.vy=-160;
    moveEntity(this,dt,input.down);
    if(this.moving&&this.onGround)this.walkT+=dt*9;
    if(this.y>WORLD_H*TILE+40)this.hurt(9999,0);
  }
  hurt(dmg,kx){
    if(this.iframes>0||this.dead)return;
    this.hp-=dmg;
    this.iframes=PLAYER.IFRAME;
    this.combatT=8;this.regenT=0;
    this.vx=kx*190;this.vy=-190;
    spawnText(this.cx,this.y-6,'-'+dmg,'#ff4a3a',15);
    spawnParticles(this.cx,this.y+10,'#c22',6,90);
    snd.hurt();
    if(game)game.shake=Math.max(game.shake,5);
    if(this.hp<=0){
      this.hp=0;this.dead=true;this.deadT=0;
      spawnParticles(this.cx,this.cy,'#c22',26,160);
      snd.die();
    }
  }
  startSwing(){
    this.swingT=0;this.swingCd=this.swingCdMax;
  }
}

class Zombie{
  constructor(x,y){
    this.x=x;this.y=y;this.w=14;this.h=28;
    this.vx=0;this.vy=0;this.onGround=false;
    this.hp=ENEMY_DEF.zombie.hp;this.maxHp=ENEMY_DEF.zombie.hp;this.dmg=ENEMY_DEF.zombie.dmg;
    this.speed=ENEMY_DEF.zombie.speed*(0.85+rnd()*0.3);
    this.walkT=0;this.hitFlash=0;this.jumpCd=0;
    this.dir=rnd()<0.5?1:-1;
    this.animOff=rnd()*10;
  }
  get cx(){return this.x+this.w/2}
  update(dt,p){
    if(this.hitFlash>0)this.hitFlash-=dt;
    this.jumpCd-=dt;
    if(!p.dead){
      this.dir=p.cx>this.cx?1:-1;
    }
    this.vx=this.dir*this.speed;
    if(this.onGround&&this.jumpCd<=0){
      const aheadX=Math.floor((this.dir>0?this.x+this.w+3:this.x-3)/TILE);
      const footY=Math.floor((this.y+this.h-2)/TILE);
      const bodyY=Math.floor((this.y+this.h-10)/TILE);
      if(solidAt(aheadX,footY)||solidAt(aheadX,bodyY)){
        this.vy=-395;this.jumpCd=0.55;
      }
    }
    moveEntity(this,dt,false);
    this.walkT+=dt*7;
    if(!p.dead&&this.iframes!==0&&overlap(this,p)){
      p.hurt(this.dmg,this.dir);
    }
  }
  hurt(dmg,kx){
    this.hp-=dmg;this.hitFlash=0.18;
    this.vx=kx*160;this.vy=-170;
    spawnParticles(this.cx,this.y+8,'#9b2f2f',5,80);
    snd.hit();
    if(this.hp<=0)return true;
    return false;
  }
}

class Slime{
  constructor(x,y,blue){
    this.x=x;this.y=y;this.w=20;this.h=15;
    this.vx=0;this.vy=0;this.onGround=false;
    const def=blue?ENEMY_DEF.slime_blue:ENEMY_DEF.slime;
    this.hp=def.hp;this.maxHp=def.hp;this.dmg=def.dmg;this.speed=def.speed;
    this.blue=blue;
    this.jumpCd=0.4+rnd();this.hitFlash=0;this.squash=0;
    this.dir=rnd()<0.5?1:-1;
  }
  get cx(){return this.x+this.w/2}
  update(dt,p){
    if(this.hitFlash>0)this.hitFlash-=dt;
    if(this.squash>0)this.squash-=dt;
    if(this.onGround){
      this.vx=0;
      this.jumpCd-=dt;
      if(this.jumpCd<=0){
        if(!p.dead)this.dir=p.cx>this.cx?1:-1;
        this.vy=-(215+rnd()*70);
        this.vx=this.dir*(this.speed*0.9+rnd()*40);
        this.jumpCd=0.9+rnd()*0.8;
        this.squash=0;
      }
    }
    const wasAir=!this.onGround;
    moveEntity(this,dt,false);
    if(wasAir&&this.onGround)this.squash=0.22;
    if(!p.dead&&overlap(this,p)){
      p.hurt(this.dmg,this.dir);
    }
  }
  hurt(dmg,kx){
    this.hp-=dmg;this.hitFlash=0.18;
    this.vx=kx*130;this.vy=-150;
    spawnParticles(this.cx,this.cy,this.blue?'#4fa8e8':'#6cc24a',6,90);
    snd.hit();
    return this.hp<=0;
  }
}

const drops=[];
function spawnDrop(x,y,id,count,vx,vy){
  drops.push({
    id,count,
    x:x-7,y:y-7,w:14,h:14,
    vx:vx!==undefined?vx:(rnd()*80-40),
    vy:vy!==undefined?vy:(-120-rnd()*60),
    onGround:false,age:0,life:240,bob:rnd()*6.28
  });
}
function updateDrops(dt,p,inv){
  for(let i=drops.length-1;i>=0;i--){
    const d=drops[i];
    d.age+=dt;d.bob+=dt*3;
    if(d.age>d.life){drops.splice(i,1);continue}
    let magnet=false;
    if(d.age>0.5&&!p.dead){
      const dx=p.cx-(d.x+7),dy=p.cy-(d.y+7);
      const dist=Math.hypot(dx,dy);
      if(dist<56&&dist>0.5){
        magnet=true;
        const pull=Math.min(520,260+dist*5);
        d.vx=dx/dist*pull;
        d.vy=dy/dist*pull;
        d.x+=d.vx*dt;
        d.y+=d.vy*dt;
        d.onGround=false;
      }
      if(dist<16){
        const rest=addItem(inv,d.id,d.count);
        if(rest===0){
          const it=ITEMS[d.id];
          spawnText(d.x+7,d.y-4,'+'+d.count+' '+it.name,'#9be24a',12);
          snd.pickup();
          drops.splice(i,1);
          continue;
        }else d.count=rest;
      }
    }
    if(!magnet){
      d.vx*=d.onGround?0.86:0.995;
      if(d.onGround&&Math.abs(d.vx)<2)d.vx=0;
      moveEntity(d,dt,false);
    }
  }
}
function drawDrop(g,d){
  const icon=tex.icons[d.id];
  if(!icon)return;
  const fl=Math.sin(d.bob)*2;
  g.drawImage(icon,d.x-1,d.y-1+fl,16,16);
}

const particles=[];
function spawnParticles(x,y,color,n,spd){
  for(let i=0;i<n;i++){
    const a=rnd()*6.28;
    const s=spd*(0.3+rnd()*0.7);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,life:0.35+rnd()*0.4,color,size:1+rnd()*2.5,grav:true});
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life-=dt;
    if(p.life<=0){particles.splice(i,1);continue}
    if(p.grav)p.vy+=GRAVITY*0.55*dt;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
  }
}
function drawParticles(g){
  for(const p of particles){
    g.globalAlpha=Math.min(1,p.life*2.5);
    g.fillStyle=p.color;
    g.fillRect(p.x,p.y,p.size,p.size);
  }
  g.globalAlpha=1;
}

const floatTexts=[];
function spawnText(x,y,text,color,size){
  floatTexts.push({x,y,text,color,size:size||13,life:1.1,vy:-46});
}
function updateTexts(dt){
  for(let i=floatTexts.length-1;i>=0;i--){
    const t=floatTexts[i];
    t.life-=dt;
    if(t.life<=0){floatTexts.splice(i,1);continue}
    t.y+=t.vy*dt;
    t.vy*=0.94;
  }
}
function drawTexts(g){
  for(const t of floatTexts){
    g.globalAlpha=Math.min(1,t.life*1.6);
    g.font='bold '+t.size+'px "Microsoft YaHei",sans-serif';
    g.textAlign='center';
    g.strokeStyle='rgba(0,0,0,0.75)';g.lineWidth=3;
    g.strokeText(t.text,t.x,t.y);
    g.fillStyle=t.color;
    g.fillText(t.text,t.x,t.y);
  }
  g.globalAlpha=1;
  g.textAlign='left';
}

function drawPlayer(g,p,inv,selected){
  if(p.dead)return;
  if(p.iframes>0&&Math.floor(p.iframes*14)%2===0)g.globalAlpha=0.35;
  const px=Math.round(p.x-2),py=Math.round(p.y);
  g.save();
  g.translate(px+8,py);
  if(p.facing<0){g.scale(-1,1)}
  const SKIN='#eab98c',SKIN_D='#c9976a',HAIR='#5a3a22';
  const SHIRT='#3a6ea5',SHIRT_D='#2c5480',PANTS='#2e4a68',PANTS_D='#243a52',BOOT='#6a4a2a';
  const legA=Math.sin(p.walkT)*3;
  const legB=Math.sin(p.walkT+Math.PI)*3;
  g.fillStyle=SHIRT;
  g.fillRect(1,10,12,9);
  g.fillStyle=SHIRT_D;
  g.fillRect(1,17,12,2);
  g.fillStyle=HAIR;
  g.fillRect(1,0,10,3);
  g.fillRect(1,0,2,6);
  g.fillStyle=SKIN;
  g.fillRect(1,2,10,8);
  g.fillStyle='#fff';
  g.fillRect(7,4,3,3);
  g.fillStyle='#2a4a8a';
  g.fillRect(9,4,2,3);
  g.fillStyle=SKIN_D;
  g.fillRect(1,2,1,8);
  g.fillStyle=PANTS;
  g.fillRect(2+Math.max(0,legA*0.4),19,4,9);
  g.fillRect(7+Math.max(0,legB*0.4),19,4,9);
  g.fillStyle=BOOT;
  g.fillRect(2+Math.max(0,legA*0.4),26,4,2);
  g.fillRect(7+Math.max(0,legB*0.4),26,4,2);
  let armAng=0.35+Math.sin(p.walkT)*0.25;
  if(p.swingT>=0){
    const f=Math.min(1,p.swingT/0.2);
    armAng=-1.9+f*2.6;
  }
  g.save();
  g.translate(6,12);
  g.rotate(armAng);
  g.fillStyle=SHIRT;
  g.fillRect(-1.5,-1,3,4);
  g.fillStyle=SKIN;
  g.fillRect(-1.5,3,3,5);
  const sel=inv&&inv[selected];
  const it=sel&&ITEMS[sel.id];
  const holds=it&&(it.weapon||it.tool);
  if(holds){
    g.rotate(-0.72);
    g.drawImage(tex.icons[sel.id],-2,-23,18,18);
  }
  g.restore();
  if(holds&&p.swingT>=0){
    const f=Math.min(1,p.swingT/0.2);
    g.globalAlpha=Math.max(0,0.5-f*0.5);
    g.fillStyle='rgba(255,255,255,0.45)';
    g.beginPath();
    g.moveTo(6,12);
    g.arc(6,12,30,-1.9+f*2.6-0.95,-1.9+f*2.6+0.28);
    g.closePath();
    g.fill();
    g.globalAlpha=1;
  }
  g.restore();
  g.globalAlpha=1;
}

function drawZombie(g,z){
  const px=Math.round(z.x-1),py=Math.round(z.y);
  g.save();
  g.translate(px+8,py);
  if(z.dir<0){g.scale(-1,1)}
  const SKIN=z.hitFlash>0?'#d8e8a0':'#7a9b4e',SKIN_D='#5d7838';
  const SHIRT=z.hitFlash>0?'#8a94a8':'#4a5568',PANTS='#3a4455',BOOT='#2a3038';
  const legA=Math.sin(z.walkT)*3;
  const legB=Math.sin(z.walkT+Math.PI)*3;
  g.fillStyle=SHIRT;
  g.fillRect(1,10,12,9);
  g.fillStyle='#5a6578';
  g.fillRect(4,13,2,2);g.fillRect(9,15,2,3);
  g.fillStyle=SKIN_D;
  g.fillRect(1,0,3,9);
  g.fillStyle=SKIN;
  g.fillRect(2,1,9,8);
  g.fillStyle='#c23';
  g.fillRect(8,4,2,2);
  g.fillStyle='#8a2a2a';
  g.fillRect(5,7,2,1);
  g.fillStyle=PANTS;
  g.fillRect(2+Math.max(0,legA*0.4),19,4,9);
  g.fillRect(7+Math.max(0,legB*0.4),19,4,9);
  g.fillStyle=BOOT;
  g.fillRect(2+Math.max(0,legA*0.4),26,4,2);
  g.fillRect(7+Math.max(0,legB*0.4),26,4,2);
  const armW=Math.sin(z.walkT*1.3)*2;
  g.fillStyle=SKIN_D;
  g.fillRect(8,-1+armW*0.5,3,5);
  g.fillStyle=SKIN;
  g.fillRect(8,4+armW*0.5,3,7);
  g.restore();
}

function drawSlime(g,s){
  let sw=s.w,sh=s.h;
  if(s.squash>0){const f=s.squash/0.22;sw=s.w*(1+0.28*f);sh=s.h*(1-0.35*f)}
  else if(!s.onGround){sw=s.w*0.86;sh=s.h*1.18}
  const x=s.cx-sw/2,y=s.y+s.h-sh;
  const col=s.hitFlash>0?'#ffffff':(s.blue?'#4fa8e8':'#6cc24a');
  const colD=s.blue?'#2f7ab8':'#4a9433';
  g.globalAlpha=0.82;
  g.fillStyle=col;
  g.fillRect(x+2,y,sw-4,2);
  g.fillRect(x+1,y+2,sw-2,sh-4);
  g.fillRect(x,y+4,sw,sh-6);
  g.globalAlpha=0.55;
  g.fillStyle=colD;
  g.fillRect(x+sw*0.3,y+sh*0.45,sw*0.4,sh*0.35);
  g.globalAlpha=0.9;
  g.fillStyle='rgba(255,255,255,0.75)';
  g.fillRect(x+3,y+3,3,2);
  g.globalAlpha=1;
}