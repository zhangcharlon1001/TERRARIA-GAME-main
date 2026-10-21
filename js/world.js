const world={
  tiles:new Uint8Array(WORLD_W*WORLD_H),
  walls:new Uint8Array(WORLD_W*WORLD_H),
  skyRow:new Int16Array(WORLD_W),
  spawnX:0,spawnY:0
};
const light={canvas:null,ctx:null,img:null,tw:0,th:0,gx0:0,gy0:0};

function idx(x,y){return y*WORLD_W+x}
function tileAt(x,y){
  if(x<0||x>=WORLD_W)return T.STONE;
  if(y<0)return T.AIR;
  if(y>=WORLD_H)return T.STONE;
  return world.tiles[idx(x,y)];
}
function wallAt(x,y){
  if(x<0||y<0||x>=WORLD_W||y>=WORLD_H)return 0;
  return world.walls[idx(x,y)];
}
function tileInfo(x,y){return TILE_INFO[tileAt(x,y)]||null}
function solidAt(x,y){
  const ti=tileInfo(x,y);
  return ti?!!ti.solid:false;
}
function platformAt(x,y){
  const ti=tileInfo(x,y);
  return ti?!!ti.platform:false;
}
function opaqueAt(x,y){
  const ti=tileInfo(x,y);
  return ti?!!ti.solid:false;
}
function recomputeSkyCol(x){
  for(let y=0;y<WORLD_H;y++){
    if(opaqueAt(x,y)){world.skyRow[x]=y;return}
  }
  world.skyRow[x]=WORLD_H;
}
function setTile(x,y,t){
  if(x<0||y<0||x>=WORLD_W||y>=WORLD_H)return;
  world.tiles[idx(x,y)]=t;
  recomputeSkyCol(x);
}
function setWall(x,y,w){
  if(x<0||y<0||x>=WORLD_W||y>=WORLD_H)return;
  world.walls[idx(x,y)]=w;
}
function surfaceY(x){
  for(let y=0;y<WORLD_H;y++)if(solidAt(x,y))return y;
  return WORLD_H;
}

const rng={s:1};
function srand(seed){rng.s=seed>>>0||1}
function rnd(){
  rng.s^=rng.s<<13;rng.s>>>=0;
  rng.s^=rng.s>>>17;rng.s>>>=0;
  rng.s^=rng.s<<5;rng.s>>>=0;
  return rng.s/4294967296;
}

world.generate=function(seed){
  srand(seed);
  const S=seed%1000;
  const surf=new Int16Array(WORLD_W);
  for(let x=0;x<WORLD_W;x++){
    const base=fbm(x*0.012,0.5,S)*46-23;
    const detail=fbm(x*0.05,7.3,S+200)*8-4;
    const mount=Math.abs(fbm(x*0.004,3.7,S+90)-0.5)*2;
    surf[x]=Math.round(96+base+detail-mount*mount*30);
    surf[x]=Math.max(40,Math.min(150,surf[x]));
  }
  for(let x=0;x<WORLD_W;x++){
    const dirtD=14+Math.round(fbm(x*0.03,11.1,S+400)*8);
    for(let y=0;y<WORLD_H;y++){
      let t=T.AIR;
      if(y===surf[x])t=T.GRASS;
      else if(y>surf[x]&&y<surf[x]+dirtD)t=T.DIRT;
      else if(y>=surf[x]+dirtD){
        if(y<surf[x]+dirtD+4&&fbm(x*0.09,y*0.09,S+600)>0.5)t=T.DIRT;
        else t=T.STONE;
      }
      world.tiles[idx(x,y)]=t;
    }
  }
  for(let x=0;x<WORLD_W;x++){
    for(let y=surf[x]+4;y<WORLD_H-4;y++){
      const depth=y-surf[x];
      const n1=fbm(x*0.02,y*0.05,S+1000);
      const tunnelW=0.028+Math.min(0.028,depth/2600);
      if(Math.abs(n1-0.5)<tunnelW){
        world.tiles[idx(x,y)]=T.AIR;
        continue;
      }
      if(depth>18){
        const n2=fbm(x*0.045,y*0.045,S+2000);
        if(n2>0.745)world.tiles[idx(x,y)]=T.AIR;
      }
    }
  }
  function veins(tile,count,yMinFn,yMaxFn,sizeMax){
    for(let i=0;i<count;i++){
      const cx=(rnd()*WORLD_W)|0;
      const yMin=yMinFn(),yMax=yMaxFn();
      if(yMax<=yMin)continue;
      const cy=yMin+((rnd()*(yMax-yMin))|0);
      const n=3+((rnd()*sizeMax)|0);
      let x=cx,y=cy;
      for(let j=0;j<n;j++){
        if(x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&world.tiles[idx(x,y)]===T.STONE){
          world.tiles[idx(x,y)]=tile;
        }
        const r=rnd();
        if(r<0.35)x+=rnd()<0.5?1:-1;
        else if(r<0.8)y+=rnd()<0.5?1:-1;
        else{x+=rnd()<0.5?1:-1;y+=rnd()<0.5?1:-1}
      }
    }
  }
  veins(T.COPPER,430,()=>surf[(rnd()*WORLD_W)|0]+6,()=>240,7);
  veins(T.IRON,300,()=>surf[(rnd()*WORLD_W)|0]+25,()=>265,6);
  veins(T.GOLD,185,()=>130,()=>285,6);
  for(let x=0;x<WORLD_W;x++){
    const dStart=surf[x]+3;
    const dirtEnd=surf[x]+18;
    for(let y=dStart;y<WORLD_H;y++){
      world.walls[idx(x,y)]=y<dirtEnd?W_DIRT:W_STONE;
    }
  }
  let x=6;
  while(x<WORLD_W-6){
    const gap=6+((rnd()*9)|0);
    x+=gap;
    if(tileAt(x,surf[x])!==T.GRASS)continue;
    if(tileAt(x,surf[x]-1)!==T.AIR)continue;
    const h=6+((rnd()*7)|0);
    const topY=surf[x]-h;
    let ok=true;
    for(let y=topY;y<surf[x];y++){
      if(tileAt(x,y)!==T.AIR){ok=false;break}
    }
    if(!ok)continue;
    for(let y=surf[x]-1;y>=topY;y--)world.tiles[idx(x,y)]=T.LOG;
    const lr=2+((rnd()*2)|0);
    for(let dy=-lr-1;dy<=lr;dy++){
      for(let dx=-lr-1;dx<=lr+1;dx++){
        const nx=x+dx,ny=topY+dy;
        if(nx<0||nx>=WORLD_W||ny<0)continue;
        if(dx*dx*0.8+dy*dy>(lr+1)*(lr+1))continue;
        if(world.tiles[idx(nx,ny)]===T.AIR)world.tiles[idx(nx,ny)]=T.LEAF;
      }
    }
    if(h>8){
      for(let k=0;k<3;k++){
        const sy=surf[x]-3-((rnd()*(h-5))|0);
        const side=rnd()<0.5?-1:1;
        const nx=x+side;
        if(nx>=0&&nx<WORLD_W&&world.tiles[idx(nx,sy)]===T.AIR&&world.tiles[idx(nx,sy+1)]===T.AIR){
          world.tiles[idx(nx,sy)]=T.LEAF;
          world.tiles[idx(nx,sy+1)]=T.LEAF;
        }
      }
    }
  }
  for(let x=1;x<WORLD_W-1;x++){
    if(tileAt(x,surf[x])===T.GRASS&&tileAt(x,surf[x]-1)===T.AIR){
      if(rnd()<0.3)world.tiles[idx(x,surf[x]-1)]=T.FLOWER;
    }
  }
  let shrooms=0;
  for(let i=0;i<4000&&shrooms<130;i++){
    const x=(rnd()*WORLD_W)|0;
    const y=(surf[x]+25+((rnd()*(WORLD_H-surf[x]-35))|0));
    if(tileAt(x,y)===T.AIR&&tileAt(x,y+1)===T.STONE&&tileAt(x,y-1)===T.AIR){
      world.tiles[idx(x,y)]=T.MUSHROOM;
      shrooms++;
    }
  }
  const sx=WORLD_W>>1;
  world.spawnX=sx*TILE+8;
  world.spawnY=(surf[sx]-2)*TILE+16;
  for(let i=0;i<WORLD_W;i++)recomputeSkyCol(i);
};

world.chopTree=function(x,y){
  if(tileAt(x,y)!==T.LOG)return [];
  let top=y;
  while(tileAt(x,top-1)===T.LOG)top--;
  const removed=[];
  let logs=0;
  for(let yy=top;yy<=y;yy++){
    if(tileAt(x,yy)===T.LOG){removed.push([x,yy]);logs++}
  }
  const leafQ=[];
  for(let dx=-3;dx<=3;dx++){
    for(let dy=-4;dy<=1;dy++){
      if(tileAt(x+dx,top+dy)===T.LEAF)leafQ.push([x+dx,top+dy]);
    }
  }
  const seen=new Set();
  while(leafQ.length){
    const[lx,ly]=leafQ.pop();
    const k=ly*WORLD_W+lx;
    if(seen.has(k))continue;
    seen.add(k);
    if(tileAt(lx,ly)!==T.LEAF)continue;
    if(Math.abs(lx-x)>4||ly<top-5||ly>top+3)continue;
    removed.push([lx,ly]);
    leafQ.push([lx+1,ly],[lx-1,ly],[lx,ly+1],[lx,ly-1]);
    if(seen.size>70)break;
  }
  for(const[rx,ry]of removed)setTile(rx,ry,T.AIR);
  return {removed,logs};
};

world.grassTick=function(){
  for(let i=0;i<140;i++){
    const x=(rnd()*WORLD_W)|0;
    const y=(rnd()*200+40)|0;
    if(y>=WORLD_H)continue;
    const t=tileAt(x,y);
    if(t===T.DIRT){
      if(tileAt(x,y-1)===T.AIR&&(tileAt(x-1,y)===T.GRASS||tileAt(x+1,y)===T.GRASS||tileAt(x,y+1)===T.GRASS)){
        world.tiles[idx(x,y)]=T.GRASS;
      }
    }else if(t===T.GRASS){
      if(opaqueAt(x,y-1)&&tileAt(x,y-1)!==T.GRASS){
        world.tiles[idx(x,y)]=T.DIRT;
      }
    }
  }
};

const LPAD=20;
const MAXLW=260,MAXLH=170;
const bufR=new Float32Array(MAXLW*MAXLH);
const bufG=new Float32Array(MAXLW*MAXLH);
const bufB=new Float32Array(MAXLW*MAXLH);

function updateLight(camX,camY,vw,vh,skyRGB){
  const gx0=Math.max(0,Math.floor(camX/TILE)-LPAD);
  const gy0=Math.max(0,Math.floor(camY/TILE)-LPAD);
  const gx1=Math.min(WORLD_W-1,Math.ceil((camX+vw)/TILE)+LPAD);
  const gy1=Math.min(WORLD_H-1,Math.ceil((camY+vh)/TILE)+LPAD);
  const lw=gx1-gx0+1,lh=gy1-gy0+1;
  const skyR=skyRGB[0],skyG=skyRGB[1],skyB=skyRGB[2];
  for(let y=gy0;y<=gy1;y++){
    const row=(y-gy0)*lw;
    for(let x=gx0;x<=gx1;x++){
      const li=row+(x-gx0);
      const t=world.tiles[y*WORLD_W+x];
      let r=0,g=0,b=0;
      if(y<world.skyRow[x]&&!opaqueAt(x,y)){
        r=skyR;g=skyG;b=skyB;
      }
      const em=TILE_INFO[t]&&TILE_INFO[t].light;
      if(em){
        if(em[0]>r)r=em[0];
        if(em[1]>g)g=em[1];
        if(em[2]>b)b=em[2];
      }
      bufR[li]=r;bufG[li]=g;bufB[li]=b;
    }
  }
  function att(x,y){
    return opaqueAt(x,y)?0.56:0.91;
  }
  for(let pass=0;pass<2;pass++){
    for(let y=gy0+1;y<=gy1;y++){
      const row=(y-gy0)*lw,up=row-lw;
      for(let x=gx0;x<=gx1;x++){
        const li=row+(x-gx0);
        const a=att(x,y);
        const r=bufR[up+(x-gx0)]*a,g=bufG[up+(x-gx0)]*a,b=bufB[up+(x-gx0)]*a;
        if(r>bufR[li])bufR[li]=r;
        if(g>bufG[li])bufG[li]=g;
        if(b>bufB[li])bufB[li]=b;
      }
    }
    for(let y=gy1-1;y>=gy0;y--){
      const row=(y-gy0)*lw,dn=row+lw;
      for(let x=gx0;x<=gx1;x++){
        const li=row+(x-gx0);
        const a=att(x,y);
        const r=bufR[dn+(x-gx0)]*a,g=bufG[dn+(x-gx0)]*a,b=bufB[dn+(x-gx0)]*a;
        if(r>bufR[li])bufR[li]=r;
        if(g>bufG[li])bufG[li]=g;
        if(b>bufB[li])bufB[li]=b;
      }
    }
    for(let x=gx0+1;x<=gx1;x++){
      for(let y=gy0;y<=gy1;y++){
        const li=(y-gy0)*lw+(x-gx0);
        const a=att(x,y);
        const r=bufR[li-1]*a,g=bufG[li-1]*a,b=bufB[li-1]*a;
        if(r>bufR[li])bufR[li]=r;
        if(g>bufG[li])bufG[li]=g;
        if(b>bufB[li])bufB[li]=b;
      }
    }
    for(let x=gx1-1;x>=gx0;x--){
      for(let y=gy0;y<=gy1;y++){
        const li=(y-gy0)*lw+(x-gx0);
        const a=att(x,y);
        const r=bufR[li+1]*a,g=bufG[li+1]*a,b=bufB[li+1]*a;
        if(r>bufR[li])bufR[li]=r;
        if(g>bufG[li])bufG[li]=g;
        if(b>bufB[li])bufB[li]=b;
      }
    }
  }
  const vx0=Math.max(gx0,Math.floor(camX/TILE)-1);
  const vy0=Math.max(gy0,Math.floor(camY/TILE)-1);
  const tw=Math.min(gx1-vx0+1,Math.ceil(vw/TILE)+2);
  const th=Math.min(gy1-vy0+1,Math.ceil(vh/TILE)+2);
  if(!light.canvas||light.tw!==tw||light.th!==th){
    light.canvas=document.createElement('canvas');
    light.canvas.width=tw;light.canvas.height=th;
    light.ctx=light.canvas.getContext('2d');
    light.img=light.ctx.createImageData(tw,th);
    light.tw=tw;light.th=th;
  }
  const d=light.img.data;
  for(let y=0;y<th;y++){
    const wy=vy0+y;
    for(let x=0;x<tw;x++){
      const wx=vx0+x;
      const li=(wy-gy0)*lw+(wx-gx0);
      const i=(y*tw+x)*4;
      d[i]=Math.min(255,bufR[li]*255)|0;
      d[i+1]=Math.min(255,bufG[li]*255)|0;
      d[i+2]=Math.min(255,bufB[li]*255)|0;
      d[i+3]=255;
    }
  }
  light.ctx.putImageData(light.img,0,0);
  light.gx0=vx0;light.gy0=vy0;
  return light;
}

world.stationNear=function(px,py,stationId){
  const cx=Math.floor(px/TILE),cy=Math.floor(py/TILE);
  for(let y=cy-4;y<=cy+4;y++){
    for(let x=cx-6;x<=cx+6;x++){
      const ti=tileInfo(x,y);
      if(ti&&ti.station===stationId)return true;
    }
  }
  return false;
};