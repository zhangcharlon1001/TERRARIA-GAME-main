const TILE=16;
const WORLD_W=1000;
const WORLD_H=300;
const DAY_LENGTH=480;
const GRAVITY=1350;
const REACH=92;

const T={AIR:0,DIRT:1,GRASS:2,STONE:3,LOG:4,LEAF:5,PLANK:6,WORKBENCH:7,FURNACE:8,ANVIL:9,COPPER:10,IRON:11,GOLD:12,TORCH:13,PLATFORM:14,FLOWER:15,MUSHROOM:16};
const W_NONE=0,W_DIRT=1,W_STONE=2,W_WOOD=3;

const TILE_INFO={
  [T.DIRT]:{name:'泥土',solid:true,hp:35,drop:'dirt',pick:0,color:'#8a5a3b'},
  [T.GRASS]:{name:'草地',solid:true,hp:35,drop:'dirt',pick:0,color:'#4aa832'},
  [T.STONE]:{name:'石头',solid:true,hp:75,drop:'stone',pick:0,color:'#7d7d7d'},
  [T.LOG]:{name:'树干',solid:false,hp:60,drop:'wood',pick:0,color:'#6b4a2b'},
  [T.LEAF]:{name:'树叶',solid:false,hp:4,drop:null,pick:0,color:'#3a8c28'},
  [T.PLANK]:{name:'木板块',solid:true,hp:50,drop:'plank',pick:0,color:'#b08a55'},
  [T.WORKBENCH]:{name:'工作台',solid:false,hp:40,drop:'workbench',pick:0,station:'workbench',color:'#b08a55'},
  [T.FURNACE]:{name:'熔炉',solid:true,hp:65,drop:'furnace',pick:0,station:'furnace',light:[1.15,0.55,0.22],color:'#6a6a6a'},
  [T.ANVIL]:{name:'铁砧',solid:false,hp:50,drop:'anvil',pick:0,station:'anvil',color:'#8a8f95'},
  [T.COPPER]:{name:'铜矿',solid:true,hp:95,drop:'copper_ore',pick:30,color:'#e17b4a'},
  [T.IRON]:{name:'铁矿',solid:true,hp:105,drop:'iron_ore',pick:45,color:'#c9ccd4'},
  [T.GOLD]:{name:'金矿',solid:true,hp:115,drop:'gold_ore',pick:60,color:'#f5d442'},
  [T.TORCH]:{name:'火把',solid:false,hp:4,drop:'torch',pick:0,light:[1.4,1.05,0.65],color:'#ffb347'},
  [T.PLATFORM]:{name:'木平台',solid:false,platform:true,hp:25,drop:'platform',pick:0,color:'#b08a55'},
  [T.FLOWER]:{name:'花草',solid:false,hp:3,drop:null,pick:0,color:'#4aa832'},
  [T.MUSHROOM]:{name:'蘑菇',solid:false,hp:3,drop:'mushroom',pick:0,light:[0.30,0.55,0.95],color:'#5ac8ff'}
};

const ITEMS={
  dirt:{name:'泥土',block:T.DIRT,max:999},
  stone:{name:'石块',block:T.STONE,max:999},
  wood:{name:'木材',mat:true,max:999},
  plank:{name:'木板块',block:T.PLANK,max:999},
  platform:{name:'木平台',block:T.PLATFORM,max:999},
  torch:{name:'火把',block:T.TORCH,max:999},
  workbench:{name:'工作台',block:T.WORKBENCH,max:99},
  furnace:{name:'熔炉',block:T.FURNACE,max:99},
  anvil:{name:'铁砧',block:T.ANVIL,max:99},
  wood_wall:{name:'木墙',wall:W_WOOD,max:999},
  gel:{name:'凝胶',mat:true,max:999},
  copper_ore:{name:'铜矿石',mat:true,max:999},
  iron_ore:{name:'铁矿石',mat:true,max:999},
  gold_ore:{name:'金矿石',mat:true,max:999},
  copper_bar:{name:'铜锭',mat:true,max:999},
  iron_bar:{name:'铁锭',mat:true,max:999},
  gold_bar:{name:'金锭',mat:true,max:999},
  mushroom:{name:'蘑菇',heal:40,max:99},
  pick_wood:{name:'木镐',tool:'pick',power:35,speed:1.0,dmg:7,max:1},
  pick_stone:{name:'石镐',tool:'pick',power:45,speed:1.2,dmg:9,max:1},
  pick_copper:{name:'铜镐',tool:'pick',power:55,speed:1.4,dmg:11,max:1},
  pick_iron:{name:'铁镐',tool:'pick',power:70,speed:1.6,dmg:14,max:1},
  pick_gold:{name:'金镐',tool:'pick',power:85,speed:1.9,dmg:17,max:1},
  sword_wood:{name:'木剑',weapon:true,dmg:9,cd:0.32,max:1},
  sword_stone:{name:'石剑',weapon:true,dmg:12,cd:0.30,max:1},
  sword_copper:{name:'铜剑',weapon:true,dmg:15,cd:0.28,max:1},
  sword_iron:{name:'铁剑',weapon:true,dmg:20,cd:0.26,max:1},
  sword_gold:{name:'金剑',weapon:true,dmg:26,cd:0.24,max:1}
};

const RECIPES=[
  {out:'workbench',n:1,in:{wood:10}},
  {out:'torch',n:3,in:{wood:1,gel:1}},
  {out:'platform',n:2,in:{wood:1}},
  {out:'wood_wall',n:4,in:{wood:1}},
  {out:'pick_wood',n:1,in:{wood:9},st:'workbench'},
  {out:'sword_wood',n:1,in:{wood:7},st:'workbench'},
  {out:'pick_stone',n:1,in:{stone:10,wood:3},st:'workbench'},
  {out:'sword_stone',n:1,in:{stone:9,wood:3},st:'workbench'},
  {out:'furnace',n:1,in:{stone:20,wood:4,torch:3},st:'workbench'},
  {out:'copper_bar',n:1,in:{copper_ore:3},st:'furnace'},
  {out:'iron_bar',n:1,in:{iron_ore:3},st:'furnace'},
  {out:'gold_bar',n:1,in:{gold_ore:4},st:'furnace'},
  {out:'anvil',n:1,in:{iron_bar:5},st:'workbench'},
  {out:'pick_copper',n:1,in:{copper_bar:9,wood:3},st:'anvil'},
  {out:'sword_copper',n:1,in:{copper_bar:7},st:'anvil'},
  {out:'pick_iron',n:1,in:{iron_bar:10,wood:3},st:'anvil'},
  {out:'sword_iron',n:1,in:{iron_bar:8},st:'anvil'},
  {out:'pick_gold',n:1,in:{gold_bar:10,wood:4},st:'anvil'},
  {out:'sword_gold',n:1,in:{gold_bar:8},st:'anvil'}
];

const PLAYER={W:12,H:28,SPEED:118,JUMP:-470,HP:100,IFRAME:0.7};
const ENEMY_DEF={
  slime:{hp:32,dmg:12,speed:62,color:'#6cc24a'},
  slime_blue:{hp:60,dmg:18,speed:70,color:'#4fa8e8'},
  zombie:{hp:65,dmg:22,speed:55,jump:-390,color:'#7a9b4e'}
};
const MAX_ZOMBIE=10,MAX_SLIME=8;

const SKY_KEYS=[
  {t:0.00,top:[4,6,15],bot:[10,16,36]},
  {t:0.17,top:[4,6,15],bot:[10,16,36]},
  {t:0.21,top:[43,58,107],bot:[201,106,58]},
  {t:0.25,top:[74,127,208],bot:[168,216,240]},
  {t:0.50,top:[70,140,225],bot:[182,224,248]},
  {t:0.72,top:[74,127,208],bot:[200,176,112]},
  {t:0.77,top:[58,42,85],bot:[212,101,58]},
  {t:0.82,top:[4,6,15],bot:[10,16,36]},
  {t:1.00,top:[4,6,15],bot:[10,16,36]}
];
const SKYLIGHT_KEYS=[
  {t:0.00,rgb:[0.10,0.12,0.20]},
  {t:0.17,rgb:[0.10,0.12,0.20]},
  {t:0.20,rgb:[0.55,0.40,0.38]},
  {t:0.24,rgb:[1,1,1]},
  {t:0.74,rgb:[1,1,1]},
  {t:0.78,rgb:[0.62,0.44,0.38]},
  {t:0.83,rgb:[0.10,0.12,0.20]},
  {t:1.00,rgb:[0.10,0.12,0.20]}
];
function lerpKeys(keys,t,get){
  for(let i=0;i<keys.length-1;i++){
    if(t>=keys[i].t&&t<=keys[i+1].t){
      const f=(t-keys[i].t)/(keys[i+1].t-keys[i].t);
      const a=get(keys[i]),b=get(keys[i+1]);
      return a.map((v,k)=>v+(b[k]-v)*f);
    }
  }
  return get(keys[0]);
}