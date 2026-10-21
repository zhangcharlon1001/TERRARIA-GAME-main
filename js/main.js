'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
let W=1280,H=720;
function resize(){
  W=canvas.width=window.innerWidth||1280;
  H=canvas.height=window.innerHeight||720;
}
resize();
window.addEventListener('resize',resize);

const stars=[];
for(let i=0;i<130;i++)stars.push({x:rnd()*2400,y:rnd()*480,s:rnd()<0.2?2:1,tw:rnd()*6.28});
const clouds=[];
for(let i=0;i<7;i++){
  clouds.push({
    x:rnd()*4600,y:24+rnd()*130,sc:0.7+rnd()*1.1,
    puffs:[[0,0,46],[34,-12,32],[-32,-8,30],[12,-22,26],[-12,-20,22],[48,4,24]]
  });
}
const mtn1=[],mtn2=[];
for(let i=0;i<300;i++){
  mtn1.push(55+fbm(i*0.05,0.5,555)*105);
  mtn2.push(30+fbm(i*0.033,0.5,777)*75);
}

let game=null;

function newGame(seed){
  tex.init();
  const s=seed===undefined?((Math.random()*1e9)|0):seed;
  srand(s);
  world.generate(s);
  drops.length=0;particles.length=0;floatTexts.length=0;
  game={
    camX:0,camY:0,camInit:false,shake:0,
    time:0.30,day:1,timeSec:0,
    player:new Player(world.spawnX,world.spawnY),
    enemies:[],inv:new Array(40).fill(null),
    hotbarSel:0,spawnTimer:2.5,grassTimer:0,placeCd:0,
    skyRGB:[1,1,1],
    keys:{},mouse:{x:W/2,y:H/2,down:false},
    denyT:0
  };
  addItem(game.inv,'pick_copper',1);
  addItem(game.inv,'sword_copper',1);
  addItem(game.inv,'torch',15);
  ui.invOpen=false;ui.mouseItem=null;ui.toastT=0;ui.recipeScroll=0;
  ui.toast('欢迎来到像素泰拉！白天收集资源,夜晚小心僵尸');
}

function toggleInv(){
  if(ui.invOpen)ui.close(game.inv,game);
  else ui.invOpen=true;
}

function wrapv(v,m){v%=m;return v<0?v+m:v}
function mixc(c1,c2,f){return[c1[0]+(c2[0]-c1[0])*f,c1[1]+(c2[1]-c1[1])*f,c1[2]+(c2[2]-c1[2])*f]}
function css(c){return'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'}

function drawSky(g,camX,camY){
  const t=game.time;
  const top=lerpKeys(SKY_KEYS,t,k=>k.top);
  const bot=lerpKeys(SKY_KEYS,t,k=>k.bot);
  const grad=g.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,css(top));
  grad.addColorStop(1,css(bot));
  g.fillStyle=grad;
  g.fillRect(0,0,W,H);
  const lum=(game.skyRGB[0]+game.skyRGB[1]+game.skyRGB[2])/3;
  const nightA=Math.max(0,Math.min(1,1-lum*2.6));
  if(nightA>0.02){
    for(const s of stars){
      const sx=wrapv(s.x-camX*0.05,W+40)-20;
      const a=nightA*(0.35+0.65*(0.5+0.5*Math.sin(game.timeSec*1.8+s.tw)));
      g.fillStyle='rgba(255,255,242,'+a.toFixed(3)+')';
      g.fillRect(sx,s.y,s.s,s.s);
    }
  }
  if(t>0.17&&t<0.83){
    const dp=Math.max(0,Math.min(1,(t-0.19)/0.62));
    const sx=W*(0.05+0.9*dp);
    const sy=H*0.42-Math.sin(dp*Math.PI)*H*0.30;
    const rg=g.createRadialGradient(sx,sy,4,sx,sy,95);
    rg.addColorStop(0,'rgba(255,238,160,0.55)');
    rg.addColorStop(1,'rgba(255,238,160,0)');
    g.fillStyle=rg;
    g.fillRect(sx-95,sy-95,190,190);
    g.fillStyle='#ffe27a';
    g.beginPath();g.arc(sx,sy,21,0,6.29);g.fill();
    g.fillStyle='#fff6c8';
    g.beginPath();g.arc(sx,sy,13,0,6.29);g.fill();
  }
  const np=t>0.5?(t-0.81)/0.38:(t+0.19)/0.38;
  if(np>=0&&np<=1){
    const mx=W*(0.05+0.9*np);
    const my=H*0.40-Math.sin(np*Math.PI)*H*0.30;
    const rg=g.createRadialGradient(mx,my,4,mx,my,80);
    rg.addColorStop(0,'rgba(200,220,255,0.35)');
    rg.addColorStop(1,'rgba(200,220,255,0)');
    g.fillStyle=rg;
    g.fillRect(mx-80,my-80,160,160);
    g.fillStyle='#e8ecf5';
    g.beginPath();g.arc(mx,my,17,0,6.29);g.fill();
    g.fillStyle=css(top);
    g.beginPath();g.arc(mx+6,my-5,14,0,6.29);g.fill();
  }
  const cl=0.14+lum*0.55;
  for(const c of clouds){
    const cx0=wrapv(c.x+game.timeSec*7-camX*0.22,W+360)-180;
    const cy=c.y-camY*0.06;
    g.fillStyle='rgba(255,255,255,'+cl.toFixed(2)+')';
    for(const[px,py,pr]of c.puffs){
      g.beginPath();
      g.ellipse(cx0+px*c.sc,cy+py*c.sc,pr*c.sc,pr*0.62*c.sc,0,0,6.29);
      g.fill();
    }
  }
}

function drawMountainLayer(g,arr,par,baseY,color){
  const step=16,span=arr.length*step;
  const wp=game.camX*par;
  const seg=Math.floor(wp/step);
  const startScreen=seg*step-wp;
  g.fillStyle=color;
  g.beginPath();
  g.moveTo(-20,H+20);
  const n=Math.ceil((W-startScreen)/step)+2;
  for(let i=0;i<n;i++){
    const idx=((seg+i)%arr.length+arr.length)%arr.length;
    g.lineTo(startScreen+i*step,baseY-arr[idx]);
  }
  g.lineTo(W+20,H+20);
  g.closePath();
  g.fill();
}
function drawMountains(g,camY){
  const t=game.time;
  const bot=lerpKeys(SKY_KEYS,t,k=>k.bot);
  const yOff=Math.max(0,-camY)*0.5;
  drawMountainLayer(g,mtn1,0.18,H*0.66+yOff,css(mixc(bot,[8,10,20],0.42)));
  drawMountainLayer(g,mtn2,0.34,H*0.74+yOff,css(mixc(bot,[6,8,16],0.62)));
}

const EDGE={
  [T.DIRT]:'#a5724a',[T.STONE]:'#9a9a9e',[T.COPPER]:'#a8a8ac',
  [T.IRON]:'#a8a8ac',[T.GOLD]:'#a8a8ac',[T.PLANK]:'#d0aa72',[T.FURNACE]:'#8f8f92'
};
function drawWorld(g,camX,camY){
  const tx0=Math.max(0,Math.floor(camX/TILE));
  const tx1=Math.min(WORLD_W-1,Math.ceil((camX+W)/TILE));
  const ty0=Math.max(0,Math.floor(camY/TILE));
  const ty1=Math.min(WORLD_H-1,Math.ceil((camY+H)/TILE));
  const dig=game.player.dig;
  for(let y=ty0;y<=ty1;y++){
    for(let x=tx0;x<=tx1;x++){
      const i=y*WORLD_W+x;
      const t=world.tiles[i];
      const w=world.walls[i];
      if(t===T.AIR&&w===W_NONE)continue;
      const sx=x*TILE-camX,sy=y*TILE-camY;
      if(w)g.drawImage(tex.walls[w],sx,sy);
      if(t!==T.AIR){
        const arr=tex.tiles[t];
        let v;
        if(t===T.TORCH)v=(Math.floor(game.timeSec*7)+(x*3+y*5))%arr.length;
        else v=(x*7+y*13+((x*y)&7))%arr.length;
        g.drawImage(arr[v],sx,sy);
        const info=TILE_INFO[t];
        if(info.solid){
          if(!opaqueAt(x,y-1)){
            const ec=EDGE[t];
            if(ec){g.fillStyle=ec;g.fillRect(sx,sy,16,2)}
          }
          if(!solidAt(x-1,y)){g.fillStyle='rgba(0,0,0,0.20)';g.fillRect(sx,sy,2,16)}
          if(!solidAt(x+1,y)){g.fillStyle='rgba(0,0,0,0.20)';g.fillRect(sx+14,sy,2,16)}
          if(!solidAt(x,y+1)){g.fillStyle='rgba(0,0,0,0.26)';g.fillRect(sx,sy+14,16,2)}
        }
        if(dig&&dig.x===x&&dig.y===y){
          const frac=1-dig.hp/dig.max;
          const stage=Math.min(2,Math.floor(frac*3));
          g.drawImage(tex.crack[stage],sx,sy);
        }
      }
    }
  }
}

function canPlace(x,y,blockId){
  if(tileAt(x,y)!==T.AIR)return false;
  const info=TILE_INFO[blockId];
  if(info.platform)return true;
  const support=solidAt(x-1,y)||solidAt(x+1,y)||solidAt(x,y-1)||solidAt(x,y+1)||
    platformAt(x-1,y)||platformAt(x+1,y)||platformAt(x,y+1)||wallAt(x,y)!==W_NONE;
  if(!support)return false;
  if(info.solid){
    const rect={x:x*TILE,y:y*TILE,w:TILE,h:TILE};
    if(overlap(rect,game.player))return false;
    for(const e of game.enemies)if(overlap(rect,e))return false;
  }
  return true;
}
function canPlaceWall(x,y){
  if(tileAt(x,y)!==T.AIR)return false;
  if(wallAt(x,y)!==W_NONE)return false;
  const support=tileAt(x-1,y)!==T.AIR||tileAt(x+1,y)!==T.AIR||tileAt(x,y-1)!==T.AIR||tileAt(x,y+1)!==T.AIR||
    wallAt(x-1,y)!==W_NONE||wallAt(x+1,y)!==W_NONE||wallAt(x,y-1)!==W_NONE||wallAt(x,y+1)!==W_NONE;
  return support;
}

function breakTile(x,y,t){
  const info=TILE_INFO[t];
  snd.brk();
  spawnParticles(x*TILE+8,y*TILE+8,info.color,9,120);
  if(t===T.LOG){
    const res=world.chopTree(x,y);
    if(res){
      const woodN=res.logs+2+((rnd()*4)|0);
      spawnDrop(x*TILE+8,y*TILE-4,'wood',woodN);
      for(const[rx,ry]of res.removed){
        if(rnd()<0.35)spawnParticles(rx*TILE+8,ry*TILE+8,'#3a8c28',2,60);
      }
    }
    return;
  }
  setTile(x,y,T.AIR);
  if(info.drop)spawnDrop(x*TILE+8,y*TILE+8,info.drop,1);
  const up=tileAt(x,y-1);
  if(up===T.FLOWER||up===T.MUSHROOM||up===T.TORCH){
    const uinfo=TILE_INFO[up];
    setTile(x,y-1,T.AIR);
    if(uinfo.drop)spawnDrop(x*TILE+8,(y-1)*TILE+8,uinfo.drop,1);
  }
}

function attack(dmg){
  const p=game.player;
  const hb={x:p.facing>0?p.x+p.w-8:p.x-38,y:p.y-10,w:46,h:46};
  for(let i=game.enemies.length-1;i>=0;i--){
    const e=game.enemies[i];
    if(!overlap(hb,e))continue;
    const crit=rnd()<0.08;
    const d=Math.max(1,Math.round(dmg*(0.85+rnd()*0.3)*(crit?2:1)));
    spawnText(e.cx,e.y-4,String(d),crit?'#ffd400':'#ff9a2a',crit?17:13);
    const dead=e.hurt(d,p.facing);
    if(dead)killEnemy(i,e);
  }
}
function killEnemy(i,e){
  game.enemies.splice(i,1);
  snd.kill();
  spawnParticles(e.cx,e.cy,e instanceof Zombie?'#7a9b4e':(e.blue?'#4fa8e8':'#6cc24a'),15,150);
  if(e instanceof Zombie){
    if(rnd()<0.4)spawnDrop(e.cx,e.cy,'iron_ore',1+((rnd()*2)|0));
  }else{
    spawnDrop(e.cx,e.cy,'gel',1+((rnd()*2)|0));
  }
}

function useHeld(dt){
  const p=game.player;
  if(p.dead){p.dig=null;return}
  if(!game.mouse.down||ui.invOpen){p.dig=null;return}
  const sel=game.inv[game.hotbarSel];
  const it=sel?ITEMS[sel.id]:null;
  const wx=Math.floor((game.mouse.x+game.camX)/TILE);
  const wy=Math.floor((game.mouse.y+game.camY)/TILE);
  const tcx=wx*TILE+8,tcy=wy*TILE+8;
  const dist=Math.hypot(tcx-p.cx,tcy-p.cy);
  const inReach=dist<=REACH;
  if(it&&it.tool==='pick'){
    const t=tileAt(wx,wy);
    if(inReach&&t!==T.AIR){
      const info=TILE_INFO[t];
      if(info.pick>it.power){
        if(game.denyT<=0){ui.toast('镐力不足,无法破坏「'+info.name+'」');game.denyT=1.2}
        p.dig=null;
        return;
      }
      if(!p.dig||p.dig.x!==wx||p.dig.y!==wy){
        p.dig={x:wx,y:wy,hp:info.hp,max:info.hp};
      }
      p.dig.hp-=it.power*2.3*it.speed*dt;
      if(rnd()<dt*10){
        snd.dig();
        spawnParticles(wx*TILE+8,wy*TILE+8,info.color,2,70);
      }
      if(p.dig.hp<=0){breakTile(wx,wy,t);p.dig=null}
      return;
    }
    if(p.swingCd<=0){
      p.swingT=0;p.swingCd=0.45;p.swingCdMax=0.45;
      snd.swing();attack(it.dmg);
    }
  }else if(it&&it.weapon){
    if(p.swingCd<=0){
      p.swingT=0;p.swingCd=it.cd;p.swingCdMax=it.cd;
      snd.swing();attack(it.dmg);
    }
  }else if(it&&it.block!==undefined){
    if(inReach&&game.placeCd<=0&&canPlace(wx,wy,it.block)){
      setTile(wx,wy,it.block);
      snd.place();
      spawnParticles(wx*TILE+8,wy*TILE+8,TILE_INFO[it.block].color,3,60);
      game.placeCd=0.14;
      sel.count--;
      if(sel.count<=0)game.inv[game.hotbarSel]=null;
    }
  }else if(it&&it.wall!==undefined){
    if(inReach&&game.placeCd<=0&&canPlaceWall(wx,wy)){
      setWall(wx,wy,it.wall);
      snd.place();
      game.placeCd=0.14;
      sel.count--;
      if(sel.count<=0)game.inv[game.hotbarSel]=null;
    }
  }else if(it&&it.heal){
    if(p.hp<p.maxHp&&p.useCd<=0){
      p.hp=Math.min(p.maxHp,p.hp+it.heal);
      spawnText(p.cx,p.y-6,'+'+it.heal,'#6ae24a',13);
      spawnParticles(p.cx,p.cy,'#8ae24a',9,70);
      snd.eat();
      p.useCd=0.6;
      sel.count--;
      if(sel.count<=0)game.inv[game.hotbarSel]=null;
    }
  }
}

function trySpawnEnemies(dt){
  game.spawnTimer-=dt;
  if(game.spawnTimer>0)return;
  game.spawnTimer=0.5+rnd()*0.5;
  const p=game.player;
  if(p.dead)return;
  const t=game.time;
  const night=t<0.185||t>0.815;
  const pTX=Math.max(0,Math.min(WORLD_W-1,Math.floor(p.cx/TILE)));
  const pTY=Math.max(0,Math.min(WORLD_H-1,Math.floor(p.cy/TILE)));
  const underground=pTY>world.skyRow[pTX]+8;
  let zombies=0,slimes=0;
  for(const e of game.enemies){
    if(e instanceof Zombie)zombies++;
    else slimes++;
  }
  function offscreen(px){
    return px<game.camX-32||px>game.camX+W+32;
  }
  const minG=Math.ceil(W/2/TILE)+5;
  if(night&&!underground&&zombies<MAX_ZOMBIE&&rnd()<0.8){
    for(let tr=0;tr<8;tr++){
      const dir=rnd()<0.5?-1:1;
      const x=pTX+dir*(minG+((rnd()*14)|0));
      if(x<2||x>=WORLD_W-2)continue;
      const sy=surfaceY(x);
      if(sy>=WORLD_H-3)continue;
      const px=x*TILE+8;
      if(!offscreen(px))continue;
      game.enemies.push(new Zombie(px-7,sy*TILE-28));
      return;
    }
  }
  if(slimes<MAX_SLIME&&rnd()<(night?0.4:0.32)){
    if(underground){
      for(let tr=0;tr<14;tr++){
        const x=pTX+((rnd()*40-20)|0);
        const dy=(23+((rnd()*12)|0))*(rnd()<0.5?-1:1);
        const y=pTY+dy+((rnd()*6-3)|0);
        if(x<2||x>=WORLD_W-2||y<2||y>=WORLD_H-3)continue;
        if(tileAt(x,y)===T.AIR&&solidAt(x,y+1)){
          game.enemies.push(new Slime(x*TILE,(y+1)*TILE-15,true));
          return;
        }
      }
    }else{
      for(let tr=0;tr<8;tr++){
        const dir=rnd()<0.5?-1:1;
        const x=pTX+dir*(minG+((rnd()*14)|0));
        if(x<2||x>=WORLD_W-2)continue;
        const sy=surfaceY(x);
        if(sy>=WORLD_H-3)continue;
        const px=x*TILE+8;
        if(!offscreen(px))continue;
        game.enemies.push(new Slime(px-10,sy*TILE-15,false));
        return;
      }
    }
  }
}

function update(dt){
  game.timeSec+=dt;
  game.time+=dt/DAY_LENGTH;
  if(game.time>=1){
    game.time-=1;game.day++;
    ui.toast('第 '+game.day+' 天 · 黎明将至');
  }
  game.skyRGB=lerpKeys(SKYLIGHT_KEYS,game.time,k=>k.rgb);
  if(game.denyT>0)game.denyT-=dt;
  if(game.placeCd>0)game.placeCd-=dt;
  const k=game.keys;
  const input={
    left:!!(k['a']||k['arrowleft']),
    right:!!(k['d']||k['arrowright']),
    jump:!!(k[' ']||k['w']||k['arrowup']),
    down:!!(k['s']||k['arrowdown'])
  };
  const p=game.player;
  p.update(dt,input);
  if(p.swingT>=0){
    p.swingT+=dt;
    if(p.swingT>0.22)p.swingT=-1;
  }
  useHeld(dt);
  for(let i=game.enemies.length-1;i>=0;i--){
    const e=game.enemies[i];
    e.update(dt,p);
    if(e.hp<=0){killEnemy(i,e);continue}
    if(e.y>WORLD_H*TILE+60)game.enemies.splice(i,1);
  }
  trySpawnEnemies(dt);
  updateDrops(dt,p,game.inv);
  updateParticles(dt);
  updateTexts(dt);
  game.grassTimer+=dt;
  if(game.grassTimer>0.5){
    game.grassTimer=0;
    world.grassTick();
  }
  if(ui.toastT>0)ui.toastT-=dt;
  if(p.dead&&p.deadT>3){
    p.dead=false;p.hp=p.maxHp;p.iframes=2.5;
    p.x=world.spawnX-6;p.y=world.spawnY-28;
    p.vx=0;p.vy=0;
    game.enemies.length=0;
    ui.toast('你已在出生点复活');
  }
  ui.layout(ctx,game);
  ui.updateHover(game.mouse.x,game.mouse.y);
}

function drawEnemyBars(g){
  for(const e of game.enemies){
    if(e.hp>=e.maxHp)continue;
    const bx=e.cx-13,by=e.y-9;
    g.fillStyle='rgba(0,0,0,0.55)';
    g.fillRect(bx-1,by-1,28,6);
    g.fillStyle='#c9302c';
    g.fillRect(bx,by,26*Math.max(0,e.hp/e.maxHp),4);
    g.fillStyle='#e86058';
    g.fillRect(bx,by,26*Math.max(0,e.hp/e.maxHp),2);
  }
}

function drawTileCursor(g,camX,camY){
  if(ui.invOpen||game.player.dead)return;
  const wx=Math.floor((game.mouse.x+camX)/TILE);
  const wy=Math.floor((game.mouse.y+camY)/TILE);
  const sx=wx*TILE-camX,sy=wy*TILE-camY;
  const p=game.player;
  const dist=Math.hypot(wx*TILE+8-p.cx,wy*TILE+8-p.cy);
  const inReach=dist<=REACH;
  const sel=game.inv[game.hotbarSel];
  const it=sel?ITEMS[sel.id]:null;
  let valid=false;
  if(it){
    if(it.block!==undefined)valid=canPlace(wx,wy,it.block);
    else if(it.wall!==undefined)valid=canPlaceWall(wx,wy);
  }
  const hasTile=tileAt(wx,wy)!==T.AIR||wallAt(wx,wy)!==W_NONE;
  let col;
  if(!inReach)col='rgba(255,90,70,0.45)';
  else if(valid||hasTile)col='rgba(255,220,90,0.85)';
  else col='rgba(255,255,255,0.30)';
  g.strokeStyle=col;
  g.lineWidth=2;
  g.strokeRect(sx+1,sy+1,14,14);
  if(it&&it.block!==undefined&&valid&&inReach){
    const icon=tex.icons[sel.id];
    if(icon){
      g.globalAlpha=0.45;
      g.drawImage(icon,sx,sy,16,16);
      g.globalAlpha=1;
    }
  }else if(it&&it.wall!==undefined&&valid&&inReach){
    const icon=tex.icons[sel.id];
    if(icon){
      g.globalAlpha=0.35;
      g.drawImage(icon,sx,sy,16,16);
      g.globalAlpha=1;
    }
  }
}

function render(){
  const g=ctx;
  const p=game.player;
  let tx=p.cx-W/2;
  let ty=p.cy-H*0.55;
  if(!game.camInit){game.camX=tx;game.camY=ty;game.camInit=true}
  game.camX+=(tx-game.camX)*Math.min(1,10*0.016);
  game.camY+=(ty-game.camY)*Math.min(1,10*0.016);
  game.camX=Math.max(0,Math.min(WORLD_W*TILE-W,game.camX));
  game.camY=Math.max(-120,Math.min(WORLD_H*TILE-H,game.camY));
  const shx=(rnd()*2-1)*game.shake;
  const shy=(rnd()*2-1)*game.shake;
  game.shake=Math.max(0,game.shake*0.86-0.05);
  const camX=Math.round(game.camX+shx);
  const camY=Math.round(game.camY+shy);
  g.imageSmoothingEnabled=false;
  g.fillStyle='#000';
  g.fillRect(0,0,W,H);
  drawSky(g,camX,camY);
  drawMountains(g,camY);
  drawWorld(g,camX,camY);
  g.save();
  g.translate(-camX,-camY);
  for(const d of drops)drawDrop(g,d);
  for(const e of game.enemies){
    if(e instanceof Zombie)drawZombie(g,e);
    else drawSlime(g,e);
  }
  drawEnemyBars(g);
  drawPlayer(g,p,game.inv,game.hotbarSel);
  drawParticles(g);
  drawTexts(g);
  g.restore();
  updateLight(camX,camY,W,H,game.skyRGB);
  g.globalCompositeOperation='multiply';
  g.imageSmoothingEnabled=true;
  g.drawImage(light.canvas,light.gx0*TILE-camX,light.gy0*TILE-camY,light.tw*TILE,light.th*TILE);
  g.globalCompositeOperation='source-over';
  g.imageSmoothingEnabled=false;
  drawTileCursor(g,camX,camY);
  ui.drawHUD(g,game,game.inv,game.hotbarSel);
  if(ui.invOpen)ui.drawInventory(g,game,game.inv);
  if(p.dead){
    g.fillStyle='rgba(60,0,0,0.45)';
    g.fillRect(0,0,W,H);
    g.font='bold 46px "Microsoft YaHei",sans-serif';
    g.textAlign='center';
    g.strokeStyle='rgba(0,0,0,0.8)';g.lineWidth=6;
    g.strokeText('你 死 了',W/2,H/2-20);
    g.fillStyle='#e0533d';
    g.fillText('你 死 了',W/2,H/2-20);
    g.font='16px "Microsoft YaHei",sans-serif';
    g.fillStyle='#e8c0a0';
    g.fillText(Math.max(0,3-p.deadT).toFixed(1)+' 秒后于出生点复活',W/2,H/2+22);
    g.textAlign='left';
  }
  ui.drawCursor(g,game.mouse.x,game.mouse.y);
}

function handleInvClick(button,shift){
  if(!ui.invOpen)return false;
  if(ui.hoverSlot>=0){
    ui.clickSlot(game.inv,ui.hoverSlot,button,shift);
    return true;
  }
  if(button===0&&ui.hoverRecipe>=0){
    const r=RECIPES[ui.hoverRecipe];
    const stations=nearStations(game.player);
    const st=craftState(r,game.inv,stations);
    if(!st.stationOk){
      ui.toast('需要靠近'+({workbench:'工作台',furnace:'熔炉',anvil:'铁砧'})[r.st]);
    }else if(!st.ok){
      ui.toast('材料不足');
    }else{
      doCraft(r,game.inv,stations);
    }
    return true;
  }
  return false;
}

window.addEventListener('keydown',e=>{
  if(!game)return;
  snd.init();snd.resume();
  if(e.key===' '||e.key==='Tab'||e.key.startsWith('Arrow'))e.preventDefault();
  const k=e.key===' '?' ':e.key.toLowerCase();
  game.keys[k]=true;
  if(k==='e'||e.key==='Tab'){
    toggleInv();
    e.preventDefault();
  }else if(e.key==='Escape'&&ui.invOpen){
    ui.close(game.inv,game);
  }else if(e.key>='1'&&e.key<='9'){
    game.hotbarSel=+e.key-1;
  }else if(e.key==='0'){
    game.hotbarSel=9;
  }else if(k==='h'){
    ui.toast('A/D移动 空格跳 E背包 滚轮切换 S+空格下平台');
  }
});
window.addEventListener('keyup',e=>{
  if(!game)return;
  const k=e.key===' '?' ':e.key.toLowerCase();
  game.keys[k]=false;
});
canvas.addEventListener('mousemove',e=>{
  if(!game)return;
  game.mouse.x=e.clientX;
  game.mouse.y=e.clientY;
});
canvas.addEventListener('mousedown',e=>{
  if(!game)return;
  snd.init();snd.resume();
  game.mouse.x=e.clientX;
  game.mouse.y=e.clientY;
  if(e.button===0){
    if(!handleInvClick(false,e.shiftKey)){
      game.mouse.down=true;
    }
  }else if(e.button===2){
    handleInvClick(2,false);
  }
});
window.addEventListener('mouseup',e=>{
  if(!game)return;
  if(e.button===0)game.mouse.down=false;
});
canvas.addEventListener('wheel',e=>{
  if(!game)return;
  e.preventDefault();
  const dir=e.deltaY>0?1:-1;
  if(ui.invOpen&&game.mouse.x<ui._gridX-14){
    ui.scrollRecipes(dir);
  }else{
    game.hotbarSel=(game.hotbarSel+dir+10)%10;
  }
},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

let last=0,acc=0;
const DT=1/60;
function frame(now){
  requestAnimationFrame(frame);
  if(!game)return;
  if(!last)last=now;
  let dt=(now-last)/1000;
  last=now;
  if(dt>0.1)dt=0.1;
  acc+=dt;
  let n=0;
  while(acc>=DT&&n<5){
    update(DT);
    acc-=DT;
    n++;
  }
  if(acc>=DT)acc=0;
  render();
}
newGame();
requestAnimationFrame(frame);

window.__frame=frame;
window.__newGame=newGame;
window.__getGame=()=>game;