'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const ctxStub=new Proxy({canvas:null},{
  get(t,p){
    if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}});
    if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(Math.max(4,w*h*4)),width:w,height:h});
    if(p==='measureText')return()=>({width:42});
    if(p==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(4,w*h*4)),width:w,height:h});
    if(p in t)return t[p];
    return()=>{};
  },
  set(t,p,v){t[p]=v;return true}
});
function makeCanvas(w,h){
  const c={width:w,height:h,style:{},
    addEventListener(){},
    getContext:()=>ctxStub};
  return c;
}
const mainCanvas=makeCanvas(1280,720);
ctxStub.canvas=mainCanvas;
let rafCb=null;
const sandbox={
  console,
  setTimeout,
  clearTimeout,
  Math,
  Date,
  requestAnimationFrame:cb=>{rafCb=cb},
  document:{
    getElementById:id=>id==='game'?mainCanvas:makeCanvas(300,150),
    createElement:()=>makeCanvas(300,150)
  },
  window:{addEventListener(){},innerWidth:1280,innerHeight:720},
  performance:{now:()=>0}
};
vm.createContext(sandbox);

const files=['noise.js','config.js','textures.js','sound.js','world.js','entities.js','crafting.js','ui.js','main.js'];
let code='';
for(const f of files){
  code+=fs.readFileSync(path.join(__dirname,'js',f),'utf8')+'\n;\n';
}
code+='\n;globalThis.__api={get game(){return game},update,render,T,tileAt,surfaceY,addItem,countItem,craftState,doCraft,RECIPES,items:drops,newGame:window.__newGame,attack,Zombie,Slime,canPlace};';

vm.runInContext(code,sandbox,{filename:'game-bundle.js'});
const api=sandbox.__api;

let failures=0;
function assert(cond,msg){
  if(cond){console.log('PASS: '+msg)}
  else{console.error('FAIL: '+msg);failures++}
}

let simT=0;
function step(n){
  for(let i=0;i<n;i++){
    simT+=1000/60;
    const cb=rafCb;
    rafCb=null;
    if(!cb)throw new Error('rAF 链断开 @'+i);
    cb(simT);
    if(!rafCb)throw new Error('rAF 未续注册 @'+i);
  }
}

console.log('=== 世界生成 ===');
api.newGame(20261021);
const g=api.game;
assert(g&&g.player,'游戏对象与玩家已创建');
assert(g.inv[0]&&g.inv[0].id==='pick_copper'&&g.inv[1].id==='sword_copper','初始装备:铜镐+铜剑+火把');
const stats=vm.runInContext(`(()=>{
  let nStone=0,nDirt=0,nGrass=0,nCopper=0,nIron=0,nGold=0,nTree=0,nAir=0,nWall=0;
  for(let i=0;i<WORLD_W*WORLD_H;i++){
    const t=world.tiles[i];
    if(t===T.STONE)nStone++;else if(t===T.DIRT)nDirt++;else if(t===T.GRASS)nGrass++;
    else if(t===T.COPPER)nCopper++;else if(t===T.IRON)nIron++;else if(t===T.GOLD)nGold++;
    else if(t===T.LOG)nTree++;else if(t===T.AIR)nAir++;
    if(world.walls[i])nWall++;
  }
  let caveCols=0;
  for(let x=0;x<WORLD_W;x+=3){
    for(let y=world.skyRow[x]+10;y<WORLD_H;y+=2){
      if(world.tiles[y*WORLD_W+x]===T.AIR){caveCols++;break}
    }
  }
  return{nStone,nDirt,nGrass,nCopper,nIron,nGold,nTree,nAir,nWall,caveCols};
})()`,sandbox);
assert(stats.nStone>30000,'石头层生成 ('+stats.nStone+')');
assert(stats.nDirt>10000,'泥土层生成 ('+stats.nDirt+')');
assert(stats.nGrass>300,'地表草皮生成 ('+stats.nGrass+')');
assert(stats.nCopper>800,'铜矿脉生成 ('+stats.nCopper+')');
assert(stats.nIron>400,'铁矿脉生成 ('+stats.nIron+')');
assert(stats.nGold>150,'金矿脉生成 ('+stats.nGold+')');
assert(stats.nTree>150,'树木生成 ('+stats.nTree+')');
assert(stats.nWall>50000,'地下背景墙生成 ('+stats.nWall+')');
assert(stats.caveCols>80,'洞穴系统生成 ('+stats.caveCols+' 列含洞穴)');

console.log('=== 物理与主循环 ===');
step(180);
assert(g.player.onGround,'玩家受重力落地');
assert(!g.player.dead,'玩家存活');
assert(Math.abs(g.camX-(g.player.cx-1280/2))<40,'摄像机跟随玩家');
assert(g.skyRGB&&g.skyRGB.length===3,'天光颜色已计算');

console.log('=== 挖掘系统 ===');
const p=g.player;
const ptx=Math.floor(p.cx/16);
const wy0=api.surfaceY(ptx)+2;
const wx=ptx;
const tileBefore=api.tileAt(wx,wy0);
assert(tileBefore!==0,'挖掘目标为实心方块 ('+tileBefore+')');
step(60);
g.mouse.x=wx*16+8-g.camX;
g.mouse.y=wy0*16+8-g.camY;
g.hotbarSel=0;
g.mouse.down=true;
step(120);
g.mouse.down=false;
assert(api.tileAt(wx,wy0)===0,'镐挖掘破坏了方块');
assert(api.items.length>0||g.inv.some(s=>s&&(s.id==='dirt'||s.id==='stone')),'破坏后方块掉落并产出物品');
step(240);
assert(api.items.length===0&&g.inv.some(s=>s&&(s.id==='dirt'||s.id==='stone')),'掉落物全部被拾取入背包');

console.log('=== 合成系统 ===');
vm.runInContext("addItem(game.inv,'wood',60)",sandbox);
vm.runInContext("addItem(game.inv,'gel',20)",sandbox);
const r0=vm.runInContext("RECIPES[0]",sandbox);
assert(r0.out==='workbench','基础配方存在');
const st0=vm.runInContext("craftState(RECIPES[0],game.inv,{})",sandbox);
assert(st0.ok,'徒手可合成工作台');
vm.runInContext("doCraft(RECIPES[0],game.inv,{})",sandbox);
assert(api.countItem(g.inv,'workbench')>=1,'合成获得工作台');
vm.runInContext("doCraft(RECIPES[1],game.inv,{})",sandbox);
assert(api.countItem(g.inv,'torch')>=18,'凝胶+木合成火把');
const rWb=vm.runInContext("RECIPES.find(r=>r.st==='workbench')",sandbox);
const stWb=vm.runInContext("craftState(RECIPES.find(r=>r.st==='workbench'),game.inv,{})",sandbox);
assert(!stWb.stationOk,'远离工作台时高级配方被锁定');

console.log('=== 放置系统 ===');
let putX=ptx+1,putY=0;
for(let dx=1;dx<=6;dx++){
  const cand=ptx+dx;
  const cy=api.surfaceY(cand)-1;
  if(api.tileAt(cand,cy)===0){putX=cand;putY=cy;break}
}
assert(putY>0,'找到可放置的空位');
g.hotbarSel=1;
vm.runInContext("game.inv[1]={id:'plank',count:20}",sandbox);
g.mouse.x=putX*16+8-g.camX;
g.mouse.y=putY*16+8-g.camY;
g.mouse.down=true;
step(20);
g.mouse.down=false;
assert(api.tileAt(putX,putY)===6,'木板块放置成功');
assert(api.countItem(g.inv,'plank')<=19,'放置消耗了材料');

console.log('=== 昼夜与敌怪 ===');
vm.runInContext('game.time=0.95',sandbox);
let spawned=false;
for(let i=0;i<40&&!spawned;i++){
  step(60);
  spawned=g.enemies.length>0;
}
assert(spawned,'夜晚敌怪已生成 ('+g.enemies.length+')');
assert(g.enemies.some(e=>e instanceof api.Zombie),'僵尸在夜晚出现');
vm.runInContext('game.time=0.5',sandbox);
step(60*10);
assert(g.skyRGB[0]>0.9,'正午天光恢复全亮');

console.log('=== 战斗与死亡重生 ===');
vm.runInContext('game.player.hurt(999,1)',sandbox);
assert(g.player.dead,'玩家受到致命伤害死亡');
step(60*4);
assert(!g.player.dead&&g.player.hp===100,'死亡后自动于出生点重生');
vm.runInContext('game.enemies.length=0;game.enemies.push(new Zombie(game.player.cx+30,game.player.y))',sandbox);
vm.runInContext('attack(30);attack(30);attack(30)',sandbox);
assert(g.enemies.length===0,'挥剑攻击击杀了附近僵尸');

console.log('=== 长时间模拟 ===');
const t0=Date.now();
vm.runInContext('for(let i=0;i<60*600;i++)update(1/60)',sandbox);
assert(true,'600 秒模拟完成,无异常 (耗时 '+((Date.now()-t0)/1000).toFixed(1)+'s)');
assert(typeof rafCb==='function','rAF 循环保持存活');

if(failures>0){
  console.error('\nSMOKE FAILED: '+failures+' 项未通过');
  process.exit(1);
}
console.log('\nSMOKE OK: 全部冒烟测试通过');