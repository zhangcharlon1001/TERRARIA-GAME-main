const tex={tiles:{},walls:{},icons:{},crack:[],ready:false};
(function(){
  function mk(w,h){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    return c;
  }
  function pxCanvas(seed,fn){
    const c=mk(16,16);
    const g=c.getContext('2d');
    const img=g.createImageData(16,16);
    const d=img.data;
    const R=(x,y,s)=>hash2(x,y,seed*7.13+(s||0));
    fn((x,y,r,gr,b,a)=>{
      if(x<0||x>15||y<0||y>15)return;
      const i=(y*16+x)*4;
      d[i]=Math.max(0,Math.min(255,r))|0;
      d[i+1]=Math.max(0,Math.min(255,gr))|0;
      d[i+2]=Math.max(0,Math.min(255,b))|0;
      d[i+3]=(a===undefined?255:a)|0;
    },R);
    g.putImageData(img,0,0);
    return c;
  }
  function noisy(set,x,y,base,vary,R,ch){
    const v=1-vary+R(x,y,ch)*vary*2;
    set(x,y,base[0]*v,base[1]*v,base[2]*v);
  }
  function variants(n,fn){
    const out=[];
    for(let i=0;i<n;i++)out.push(pxCanvas(i+3.7,fn));
    return out;
  }

  function genTiles(){
    tex.tiles[T.DIRT]=variants(4,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let v=0.82+R(x,y,1)*0.36;
        if(R(x,y,2)<0.07)v*=0.62;
        s(x,y,138*v,90*v,59*v);
      }
    });
    tex.tiles[T.GRASS]=variants(4,(s,R)=>{
      const edge=3+((R(0,0,9)*3)|0);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let v=0.82+R(x,y,1)*0.34;
        const gThr=edge+(R(x,0,5)*2-1)*1.5;
        if(y<gThr-1){
          const gv=0.85+R(x,y,3)*0.4;
          s(x,y,74*gv,168*gv,50*gv);
        }else if(y<gThr){
          s(x,y,124,214,88);
        }else if(y<gThr+1&&R(x,y,4)<0.55){
          const gv=0.85+R(x,y,3)*0.3;
          s(x,y,74*gv,168*gv,50*gv);
        }else{
          if(R(x,y,2)<0.07)v*=0.62;
          s(x,y,138*v,90*v,59*v);
        }
      }
    });
    tex.tiles[T.STONE]=variants(4,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let v=0.8+R(x,y,1)*0.34;
        if(R(x,y,2)<0.05)v*=0.55;
        s(x,y,125*v,125*v,128*v);
      }
      for(let k=0;k<3;k++){
        let cx=(R(k,0,6)*15)|0,cy=(R(0,k,7)*15)|0;
        for(let j=0;j<4;j++){
          s(cx,cy,72,72,76);
          cx+=R(k,j,8)<0.5?1:0;cy+=1;
          if(cx>15||cy>15)break;
        }
      }
    });
    tex.tiles[T.LOG]=variants(4,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        const band=(Math.sin(x*1.35)>0)?1:0.82;
        let v=band*(0.88+R(x,y,1)*0.22);
        if(R(x,y,2)<0.05)v*=0.6;
        s(x,y,120*v,82*v,49*v);
      }
      const kx=3+((R(0,0,3)*10)|0),ky=3+((R(1,1,4)*10)|0);
      s(kx,ky,66,44,26);s(kx+1,ky,66,44,26);s(kx,ky+1,52,34,20);s(kx+1,ky+1,52,34,20);
    });
    tex.tiles[T.LEAF]=variants(4,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        if(R(x,y,0)<0.14){s(x,y,0,0,0,0);continue}
        let v=0.72+R(x,y,1)*0.5;
        s(x,y,58*v,140*v,40*v);
      }
    });
    tex.tiles[T.PLANK]=variants(3,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let v=0.88+R(x,y,1)*0.2;
        s(x,y,176*v,138*v,85*v);
      }
      for(const y of[5,11])for(let x=0;x<16;x++)s(x,y,132,96,58);
      const nx=2+((R(0,0,2)*11)|0);
      for(let y=0;y<5;y++)s(nx,y,132,96,58);
      const nx2=2+((R(1,0,3)*11)|0);
      for(let y=12;y<16;y++)s(nx2,y,132,96,58);
    });
    tex.tiles[T.WORKBENCH]=variants(1,(s,R)=>{
      for(let x=1;x<15;x++){
        let v=0.9+R(x,0,1)*0.18;
        for(let y=2;y<6;y++)s(x,y,196*v,158*v,105*v);
        s(x,5,148,112,68);
      }
      for(let y=6;y<16;y++){
        const w=y<8?2:3;
        for(let x=2;x<2+w;x++)s(x,y,150,112,68);
        for(let x=14-w;x<14;x++)s(x,y,150,112,68);
      }
    });
    tex.tiles[T.FURNACE]=variants(2,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let v=0.78+R(x,y,1)*0.3;
        s(x,y,105*v,105*v,108*v);
      }
      for(let y=8;y<14;y++)for(let x=5;x<11;x++){
        const f=(y-8)/6;
        s(x,y,255-f*80,140-f*90,50-f*30);
      }
      for(let x=4;x<12;x++){s(x,7,60,60,62);s(x,14,60,60,62)}
      for(let y=8;y<14;y++){s(4,y,60,60,62);s(11,y,60,60,62)}
    });
    tex.tiles[T.ANVIL]=variants(1,(s,R)=>{
      for(let x=1;x<15;x++)for(let y=2;y<5;y++)s(x,y,110,116,125);
      for(let x=5;x<11;x++)for(let y=5;y<7;y++)s(x,y,95,100,110);
      for(let x=3;x<13;x++)for(let y=7;y<9;y++)s(x,y,110,116,125);
      for(let x=1;x<15;x++)for(let y=9;y<13;y++)s(x,y,88,92,100);
      for(let x=1;x<15;x++)s(x,2,150,156,168);
    });
    const oreTile=(r,g,b,hl)=>{
      return variants(4,(s,R)=>{
        for(let y=0;y<16;y++)for(let x=0;x<16;x++){
          let v=0.8+R(x,y,1)*0.32;
          s(x,y,118*v,118*v,122*v);
        }
        for(let k=0;k<4;k++){
          const cx=2+((R(k,5,2)*11)|0),cy=2+((R(6,k,3)*11)|0);
          const n=3+((R(k,0,4)*4)|0);
          let x=cx,y=cy;
          for(let j=0;j<n;j++){
            s(x,y,r,g,b);
            if(R(k,j,5)<0.4)s(x+1,y,r*0.8,g*0.8,b*0.8);
            if(j===0)s(x,y-1,hl[0],hl[1],hl[2]);
            x+=R(k,j,6)<0.5?1:0;
            y+=R(k,j,7)<0.6?1:0;
            if(x>14||y>14)break;
          }
        }
      });
    };
    tex.tiles[T.COPPER]=oreTile(225,123,74,[255,180,130]);
    tex.tiles[T.IRON]=oreTile(200,205,212,[245,248,252]);
    tex.tiles[T.GOLD]=oreTile(245,212,66,[255,245,160]);
    tex.tiles[T.TORCH]=variants(2,(s,R)=>{
      for(let y=6;y<16;y++){s(7,y,120,82,49);s(8,y,138,96,58)}
      const tall=R(0,0,1)>0.5;
      const fy0=tall?0:2;
      for(let y=fy0;y<6;y++)for(let x=5;x<11;x++){
        const dx=x-7.5,dy=y-3;
        const d=dx*dx+dy*dy*1.6;
        if(d<7){
          s(x,y,255,150+(5-y)*12,60);
        }else if(d<11){
          s(x,y,200,80,30);
        }
      }
      s(7,1,255,235,150);s(8,1,255,235,150);
      if(tall){s(7,0,255,240,170);s(8,0,255,240,170)}
    });
    tex.tiles[T.PLATFORM]=variants(2,(s,R)=>{
      for(let y=0;y<6;y++)for(let x=0;x<16;x++){
        let v=0.88+R(x,y,1)*0.2;
        s(x,y,176*v,138*v,85*v);
      }
      for(let x=0;x<16;x++)s(x,5,132,96,58);
      for(let x=0;x<16;x++)s(x,0,205,168,115);
      for(const x of[3,12])for(let y=6;y<9;y++)s(x,y,120,88,52);
    });
    tex.tiles[T.FLOWER]=variants(4,(s,R)=>{
      const kind=R(0,0,8);
      if(kind<1.6){
        for(let k=0;k<4;k++){
          const bx=3+((R(k,0,1)*10)|0),h=4+((R(k,1,2)*5)|0);
          for(let y=15;y>15-h;y--)s(bx,y,74,168,50);
          s(bx,15-h,110,200,80);
        }
      }else if(kind<2.8){
        for(let y=8;y<16;y++)s(7,y,74,168,50);
        s(6,10,74,168,50);
        const petals=[[6,4],[7,3],[8,4],[5,5],[9,5],[6,6],[8,6],[7,7]];
        for(const[p,q]of petals)s(p,q,215,70,60);
        s(7,5,240,200,90);s(7,4,240,200,90);
      }else{
        for(let y=9;y<16;y++)s(8,y,74,168,50);
        const petals=[[7,5],[8,4],[9,5],[6,6],[10,6],[7,7],[9,7],[8,8]];
        for(const[p,q]of petals)s(p,q,235,200,70);
        s(8,6,250,230,120);
      }
    });
    tex.tiles[T.MUSHROOM]=variants(2,(s,R)=>{
      for(let y=9;y<16;y++){s(7,y,210,228,255);s(8,y,235,245,255)}
      for(let x=4;x<12;x++){
        const h=(x<6||x>9)?1:2;
        for(let y=9-h;y<9;y++)s(x,y,90,190,255);
      }
      for(let x=5;x<11;x++)s(x,7,140,220,255);
      s(6,5,190,240,255);s(7,5,190,240,255);s(8,5,190,240,255);
      s(5,6,160,225,255);s(10,6,160,225,255);
    });
  }

  function genWalls(){
    const wallCv=(seed,base,gap)=>{
      return pxCanvas(seed,(s,R)=>{
        for(let y=0;y<16;y++)for(let x=0;x<16;x++){
          let v=0.78+R(x,y,1)*0.3;
          s(x,y,base[0]*v,base[1]*v,base[2]*v);
        }
        for(let x=0;x<16;x++){s(x,7,gap[0],gap[1],gap[2]);s(x,15,gap[0],gap[1],gap[2])}
        for(let y=0;y<16;y++){s(7,y,gap[0],gap[1],gap[2]);s(15,y,gap[0],gap[1],gap[2])}
      });
    };
    tex.walls[W_DIRT]=wallCv(11,[88,56,36],[52,32,20]);
    tex.walls[W_STONE]=wallCv(12,[74,74,78],[46,46,50]);
    tex.walls[W_WOOD]=pxCanvas(13,(s,R)=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let v=0.8+R(x,y,1)*0.24;
        s(x,y,110*v,86*v,52*v);
      }
      for(let x of[5,10])for(let y=0;y<16;y++)s(x,y,70,52,30);
    });
  }

  function genIcons(){
    const METAL={wood:[176,138,85],stone:[150,150,158],copper:[225,123,74],iron:[205,210,218],gold:[245,212,66]};
    for(const id in ITEMS){
      const it=ITEMS[id];
      if(it.block!==undefined&&it.block!==null){tex.icons[id]=tex.tiles[it.block][0];continue}
      if(it.wall!==undefined){tex.icons[id]=tex.walls[it.wall];continue}
    }
    tex.icons.wood=pxCanvas(21,(s,R)=>{
      for(let y=4;y<12;y++)for(let x=1;x<15;x++){
        let v=0.86+R(x,y,1)*0.2+((x%5===0)?-0.15:0);
        s(x,y,150*v,106*v,62*v);
      }
      for(const x of[4,9,13])for(let y=4;y<12;y++)s(x,y,96,66,38);
      for(let x=1;x<15;x++){s(x,4,185,140,92);s(x,11,110,76,44)}
    });
    tex.icons.gel=pxCanvas(22,(s,R)=>{
      for(let y=4;y<13;y++)for(let x=4;x<13;x++){
        const edge=(x===4||x===12||y===4||y===12);
        s(x,y,80,170,235,edge?200:235);
      }
      s(6,6,220,245,255,220);s(7,6,220,245,255,220);s(6,7,220,245,255,220);
    });
    const bar=(seed,c)=>{
      return pxCanvas(seed,(s)=>{
        for(let y=6;y<13;y++){
          const inset=Math.floor((12-y)/2.2);
          for(let x=3+inset;x<13-inset;x++)s(x,y,c[0],c[1],c[2]);
        }
        for(let x=4;x<12;x++)s(x,6,Math.min(255,c[0]+40),Math.min(255,c[1]+40),Math.min(255,c[2]+40));
        for(let x=4;x<12;x++)s(x,12,c[0]*0.62,c[1]*0.62,c[2]*0.62);
      });
    };
    tex.icons.copper_bar=bar(31,[210,112,66]);
    tex.icons.iron_bar=bar(32,[195,200,210]);
    tex.icons.gold_bar=bar(33,[240,205,60]);
    tex.icons.copper_ore=tex.tiles[T.COPPER][0];
    tex.icons.iron_ore=tex.tiles[T.IRON][0];
    tex.icons.gold_ore=tex.tiles[T.GOLD][0];
    tex.icons.mushroom=tex.tiles[T.MUSHROOM][0];
    const pick=(seed,c)=>{
      return pxCanvas(seed,(s)=>{
        let px0=12,py0=13;
        for(let i=0;i<9;i++){
          const x=12-i,y=13-i;
          s(x,y,124,88,52);s(x+1,y,150,108,66);
        }
        const head=[[2,4],[2,3],[3,2],[4,1],[5,1],[6,1],[7,1],[8,1],[9,2],[10,3],[10,4],[11,5],[11,6]];
        for(const[x,y]of head){s(x,y,c[0],c[1],c[2]);s(x+1,y,Math.min(255,c[0]+35),Math.min(255,c[1]+35),Math.min(255,c[2]+35))}
        s(3,3,255,255,255);
      });
    };
    tex.icons.pick_wood=pick(41,METAL.wood);
    tex.icons.pick_stone=pick(42,METAL.stone);
    tex.icons.pick_copper=pick(43,METAL.copper);
    tex.icons.pick_iron=pick(44,METAL.iron);
    tex.icons.pick_gold=pick(45,METAL.gold);
    const sword=(seed,c)=>{
      return pxCanvas(seed,(s)=>{
        for(let i=0;i<8;i++){
          const x=4+i,y=12-i;
          s(x,y,c[0],c[1],c[2]);
          s(x+1,y,Math.min(255,c[0]+30),Math.min(255,c[1]+30),Math.min(255,c[2]+30));
          s(x,y-1,Math.min(255,c[0]+55),Math.min(255,c[1]+55),Math.min(255,c[2]+55));
        }
        s(12,3,255,255,255);
        s(3,10,90,64,40);s(4,11,90,64,40);s(5,10,90,64,40);s(4,9,90,64,40);
        s(2,13,124,88,52);s(3,12,124,88,52);s(1,14,90,64,40);
      });
    };
    tex.icons.sword_wood=sword(51,METAL.wood);
    tex.icons.sword_stone=sword(52,METAL.stone);
    tex.icons.sword_copper=sword(53,METAL.copper);
    tex.icons.sword_iron=sword(54,METAL.iron);
    tex.icons.sword_gold=sword(55,METAL.gold);
  }

  function genCracks(){
    for(let stage=0;stage<3;stage++){
      const c=mk(16,16);
      const g=c.getContext('2d');
      g.fillStyle='rgba(10,8,6,0.55)';
      const R=(x,y)=>hash2(x,y,77+stage*13);
      const lines=2+stage*2;
      for(let k=0;k<lines;k++){
        let x=4+((R(k,1)*8)|0),y=4+((R(k,2)*8)|0);
        const steps=3+stage*2;
        for(let j=0;j<steps;j++){
          g.fillRect(x,y,1,1);
          if(stage>0)g.fillRect(x+1,y,1,1);
          x+=R(k,j+3)<0.5?1:-1;
          y+=R(k,j+9)<0.6?1:0;
        }
      }
      tex.crack.push(c);
    }
  }

  tex.init=function(){
    if(tex.ready)return;
    genTiles();genWalls();genIcons();genCracks();
    tex.ready=true;
  };
})();