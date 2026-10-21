const ui={
  invOpen:false,
  slotRects:[],
  recipeRects:[],
  hoverSlot:-1,
  hoverRecipe:-1,
  toastText:'',
  toastT:0,
  tipT:14,
  mouseItem:null,
  recipeScroll:0,
  _gridX:9999,
  _panelY0:0,
  _panelY1:0
};
(function(){
  const colCache={};
  function tileRGB(hex){
    if(colCache[hex])return colCache[hex];
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    colCache[hex]=[r,g,b];
    return colCache[hex];
  }
  function rr(g,x,y,w,h,r){
    g.beginPath();
    g.moveTo(x+r,y);
    g.arcTo(x+w,y,x+w,y+h,r);
    g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);
    g.arcTo(x,y,x+w,y,r);
    g.closePath();
  }
  ui.toast=function(text){ui.toastText=text;ui.toastT=2.6};

  const HEART=[
    '.##..##.',
    '########',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...'
  ];
  function drawHeart(g,x,y,scale,frac){
    const w=8*scale,h=7*scale;
    g.save();
    g.beginPath();
    g.rect(x,y,w*frac,h);
    g.clip();
    for(let r=0;r<7;r++)for(let c=0;c<8;c++){
      if(HEART[r][c]!=='#')continue;
      let col='#b51f14';
      if(r===1&&c<3)col='#ff5a4a';
      if(r===0)col='#ff7a6a';
      g.fillStyle=col;
      g.fillRect(x+c*scale,y+r*scale,scale,scale);
    }
    g.restore();
    g.strokeStyle='rgba(0,0,0,0.6)';
    g.lineWidth=1;
    g.strokeRect(x-0.5,y-0.5,w+1,h+1);
  }

  function timeString(game){
    const t=game.time;
    const totalMin=Math.floor(t*24*60);
    const hh=Math.floor(totalMin/60),mm=totalMin%60;
    return'第 '+game.day+' 天 '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }

  ui.drawHotbar=function(g,game,inv,sel){
    for(let i=0;i<10;i++){
      const x=12+i*49,y=44;
      const s=inv[i];
      const isSel=i===sel;
      g.fillStyle=isSel?'rgba(70,62,40,0.92)':'rgba(30,34,46,0.82)';
      rr(g,x,y,44,44,6);g.fill();
      g.lineWidth=2;
      g.strokeStyle=isSel?'#f2c84b':'#565b6e';
      g.stroke();
      if(s){
        const icon=tex.icons[s.id];
        if(icon)g.drawImage(icon,x+4,y+4,36,36);
        if(s.count>1){
          g.font='bold 12px "Microsoft YaHei",sans-serif';
          g.textAlign='right';
          g.strokeStyle='rgba(0,0,0,0.8)';g.lineWidth=3;
          g.strokeText(s.count,x+41,y+42);
          g.fillStyle='#fff';
          g.fillText(s.count,x+41,y+42);
          g.textAlign='left';
        }
      }
      g.font='bold 10px "Microsoft YaHei",sans-serif';
      g.fillStyle=isSel?'#f2c84b':'#7a8499';
      g.fillText(i===9?'0':String(i+1),x+3,y+11);
    }
    const s=inv[sel];
    if(s){
      g.font='bold 14px "Microsoft YaHei",sans-serif';
      g.strokeStyle='rgba(0,0,0,0.75)';g.lineWidth=3;
      g.strokeText(ITEMS[s.id].name,14,110);
      g.fillStyle='#ffe9b0';
      g.fillText(ITEMS[s.id].name,14,110);
    }
  };

  ui.drawHUD=function(g,game,inv,sel){
    const p=game.player;
    for(let i=0;i<5;i++){
      const frac=Math.max(0,Math.min(1,(p.hp-i*20)/20));
      if(frac>0)drawHeart(g,12+i*26,10,3,frac);
      else{
        g.globalAlpha=0.25;
        drawHeart(g,12+i*26,10,3,1);
        g.globalAlpha=1;
      }
    }
    ui.drawHotbar(g,game,inv,sel);
    const isDay=game.time>0.22&&game.time<0.78;
    const tx=12,ty=130;
    if(isDay){
      g.fillStyle='#ffd94a';
      g.beginPath();g.arc(tx+8,ty+8,7,0,6.29);g.fill();
      g.strokeStyle='rgba(255,220,80,0.5)';g.lineWidth=2;
      g.beginPath();g.arc(tx+8,ty+8,10,0,6.29);g.stroke();
    }else{
      g.fillStyle='#e8ecf5';
      g.beginPath();g.arc(tx+8,ty+8,7,0,6.29);g.fill();
      g.fillStyle='rgba(20,26,50,0.9)';
      g.beginPath();g.arc(tx+12,ty+5,6,0,6.29);g.fill();
    }
    g.font='bold 13px "Microsoft YaHei",sans-serif';
    g.strokeStyle='rgba(0,0,0,0.75)';g.lineWidth=3;
    g.strokeText(timeString(game),tx+24,ty+12);
    g.fillStyle='#e8dcc0';
    g.fillText(timeString(game),tx+24,ty+12);
    if(ui.toastT>0){
      const a=Math.min(1,ui.toastT);
      g.globalAlpha=a;
      g.font='bold 15px "Microsoft YaHei",sans-serif';
      const w=g.measureText(ui.toastText).width;
      g.fillStyle='rgba(12,14,24,0.85)';
      rr(g,g.canvas.width/2-w/2-16,g.canvas.height*0.5-110,w+32,34,8);g.fill();
      g.strokeStyle='#4a3a28';g.lineWidth=2;g.stroke();
      g.fillStyle='#ffe9b0';
      g.textAlign='center';
      g.fillText(ui.toastText,g.canvas.width/2,g.canvas.height*0.5-87);
      g.textAlign='left';
      g.globalAlpha=1;
    }
    if(ui.tipT>0&&game.timeSec<ui.tipT){
      g.globalAlpha=Math.min(1,ui.tipT-game.timeSec);
      g.font='13px "Microsoft YaHei",sans-serif';
      const msg='A/D 移动 · 空格 跳跃 · 鼠标 挖掘/放置/攻击 · 滚轮 切换物品 · E 背包合成';
      g.textAlign='center';
      g.strokeStyle='rgba(0,0,0,0.7)';g.lineWidth=3;
      g.strokeText(msg,g.canvas.width/2,g.canvas.height-16);
      g.fillStyle='#d8cfa8';
      g.fillText(msg,g.canvas.width/2,g.canvas.height-16);
      g.textAlign='left';
      g.globalAlpha=1;
    }
  };

  let mmCanvas=null,mmCtx=null,mmImg=null;
  ui.drawMinimap=function(g,game){
    const mw=160,mh=112;
    if(!mmCanvas||mmCanvas.width!==mw){
      mmCanvas=document.createElement('canvas');
      mmCanvas.width=mw;mmCanvas.height=mh;
      mmCtx=mmCanvas.getContext('2d');
      mmImg=mmCtx.createImageData(mw,mh);
    }
    const p=game.player;
    const pcx=Math.floor(p.cx/TILE),pcy=Math.floor(p.cy/TILE);
    const sky=game.skyRGB;
    const d=mmImg.data;
    for(let y=0;y<mh;y++){
      const wy=pcy-56+y;
      for(let x=0;x<mw;x++){
        const wx=pcx-80+x;
        const i=(y*mw+x)*4;
        let r=0,gg=0,b=0;
        if(wx<0||wx>=WORLD_W||wy<0||wy>=WORLD_H){
          r=10;gg=10;b=16;
        }else{
          const t=world.tiles[wy*WORLD_W+wx];
          if(t!==T.AIR){
            const info=TILE_INFO[t];
            const c=tileRGB(info.color);
            r=c[0];gg=c[1];b=c[2];
          }else{
            const w=world.walls[wy*WORLD_W+wx];
            if(w===W_DIRT){r=70;gg=45;b=30}
            else if(w===W_STONE){r=56;gg=56;b=62}
            else if(w===W_WOOD){r=96;gg=76;b=48}
            else{r=sky[0]*160;gg=sky[1]*170;b=sky[2]*200}
          }
        }
        d[i]=Math.min(255,r);d[i+1]=Math.min(255,gg);d[i+2]=Math.min(255,b);d[i+3]=255;
      }
    }
    mmCtx.putImageData(mmImg,0,0);
    for(const e of game.enemies){
      const ex=Math.floor(e.cx/TILE)-(pcx-80),ey=Math.floor((e.y+e.h/2)/TILE)-(pcy-56);
      if(ex>=0&&ex<mw&&ey>=0&&ey<mh){
        mmCtx.fillStyle='#ff3a2a';
        mmCtx.fillRect(ex-1,ey-1,3,3);
      }
    }
    mmCtx.fillStyle='#fff';
    mmCtx.fillRect(79,55,3,3);
    const bx=g.canvas.width-mw-12,by=10;
    g.fillStyle='rgba(10,12,20,0.85)';
    rr(g,bx-4,by-4,mw+8,mh+8,6);g.fill();
    g.strokeStyle='#4a3a28';g.lineWidth=2;g.stroke();
    g.drawImage(mmCanvas,bx,by);
  };

  ui.layout=function(g,game){
    ui.slotRects=[];
    ui.recipeRects=[];
    const W=g.canvas.width,H=g.canvas.height;
    const cols=10,rows=4,cell=46,gap=4;
    const gridW=cols*cell+(cols-1)*gap;
    const panelW=gridW+270;
    const panelH=rows*cell+(rows-1)*gap+66;
    const px0=Math.round(W/2-panelW/2),py0=Math.round(H/2-panelH/2);
    ui._gridX=px0+250;
    ui._panelY0=py0+36;
    ui._panelY1=py0+panelH;
    const gridX=px0+250,gridY=py0+52;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      ui.slotRects.push({x:gridX+c*(cell+gap),y:gridY+r*(cell+gap),w:cell,h:cell,slot:r*10+c});
    }
    const visH=ui._panelY1-ui._panelY0-8;
    const maxScroll=Math.max(0,RECIPES.length*50-visH);
    ui.recipeScroll=Math.max(-maxScroll,Math.min(0,ui.recipeScroll));
    let ry=py0+40+ui.recipeScroll;
    for(let i=0;i<RECIPES.length;i++){
      ui.recipeRects.push({x:px0+12,y:ry,w:224,h:46,recipe:i});
      ry+=50;
    }
  };
  ui.scrollRecipes=function(dir){
    ui.recipeScroll-=dir*50;
    ui.recipeScroll=Math.min(0,ui.recipeScroll);
  };

  ui.drawInventory=function(g,game,inv){
    ui.layout(g,game);
    const W=g.canvas.width,H=g.canvas.height;
    const cols=10,rows=4,cell=46,gap=4;
    const gridW=cols*cell+(cols-1)*gap;
    const panelW=gridW+270;
    const panelH=rows*cell+(rows-1)*gap+66;
    const px0=Math.round(W/2-panelW/2),py0=Math.round(H/2-panelH/2);
    g.fillStyle='rgba(8,10,18,0.55)';
    g.fillRect(0,0,W,H);
    g.fillStyle='rgba(14,17,28,0.96)';
    rr(g,px0,py0,panelW,panelH+8,10);g.fill();
    g.strokeStyle='#4a3a28';g.lineWidth=3;g.stroke();
    g.font='bold 15px "Microsoft YaHei",sans-serif';
    g.fillStyle='#f2c84b';
    g.fillText('合成',px0+14,py0+28);
    g.fillStyle='#8a94a8';
    g.font='12px "Microsoft YaHei",sans-serif';
    g.fillText('滚动查看配方 · 点击合成',px0+60,py0+28);
    g.fillStyle='#f2c84b';
    g.font='bold 15px "Microsoft YaHei",sans-serif';
    g.fillText('背包',px0+250,py0+28);
    g.fillStyle='#667';
    g.font='12px "Microsoft YaHei",sans-serif';
    g.fillText('E 关闭',px0+panelW-56,py0+28);
    const stations=nearStations(game.player);
    g.save();
    g.beginPath();
    g.rect(px0+6,ui._panelY0,242,ui._panelY1-ui._panelY0);
    g.clip();
    for(const rc of ui.recipeRects){
      if(rc.y+rc.h<ui._panelY0||rc.y>ui._panelY1)continue;
      const r=RECIPES[rc.recipe];
      const st=craftState(r,inv,stations);
      const hov=ui.hoverRecipe===rc.recipe;
      g.fillStyle=st.ok?(hov?'rgba(64,96,50,0.9)':'rgba(42,56,38,0.85)'):'rgba(34,36,46,0.85)';
      rr(g,rc.x,rc.y,rc.w,rc.h,5);g.fill();
      g.lineWidth=2;
      g.strokeStyle=st.ok?'#79b356':'#3a3e4c';
      g.stroke();
      const icon=tex.icons[r.out];
      if(icon)g.drawImage(icon,rc.x+7,rc.y+7,32,32);
      g.font='bold 13px "Microsoft YaHei",sans-serif';
      g.fillStyle=st.ok?'#ffe9b0':'#9aa0b0';
      let label=ITEMS[r.out].name;
      if(r.n>1)label+=' x'+r.n;
      g.fillText(label,rc.x+46,rc.y+18);
      let mx=rc.x+46;
      g.font='11px "Microsoft YaHei",sans-serif';
      for(const m of st.mats){
        const mic=tex.icons[m.id];
        if(mic)g.drawImage(mic,mx,rc.y+23,16,16);
        g.fillStyle=m.enough?'#9fb4d8':'#ff7a6a';
        g.fillText(m.need,mx+18,rc.y+36);
        mx+=44;
      }
      if(r.st&&!st.stationOk){
        g.fillStyle='#c9a2ff';
        g.font='11px "Microsoft YaHei",sans-serif';
        g.fillText('需'+({workbench:'工作台',furnace:'熔炉',anvil:'铁砧'})[r.st],rc.x+rc.w-64,rc.y+44);
      }
    }
    g.restore();
    for(const src of ui.slotRects){
      const s=inv[src.slot];
      const isHot=src.slot<10;
      const hov=ui.hoverSlot===src.slot;
      g.fillStyle=hov?'rgba(64,68,86,0.95)':'rgba(36,40,54,0.9)';
      rr(g,src.x,src.y,src.w,src.h,5);g.fill();
      g.lineWidth=2;
      g.strokeStyle=isHot?'#8a94a8':'#565b6e';
      if(hov)g.strokeStyle='#f2c84b';
      g.stroke();
      if(s){
        const icon=tex.icons[s.id];
        if(icon)g.drawImage(icon,src.x+5,src.y+5,src.w-10,src.h-10);
        if(s.count>1){
          g.font='bold 11px "Microsoft YaHei",sans-serif';
          g.textAlign='right';
          g.strokeStyle='rgba(0,0,0,0.8)';g.lineWidth=3;
          g.strokeText(s.count,src.x+src.w-4,src.y+src.h-4);
          g.fillStyle='#fff';
          g.fillText(s.count,src.x+src.w-4,src.y+src.h-4);
          g.textAlign='left';
        }
      }
    }
    if(ui.hoverSlot>=0&&inv[ui.hoverSlot]&&!ui.mouseItem){
      const s=inv[ui.hoverSlot];
      g.font='bold 13px "Microsoft YaHei",sans-serif';
      const label=ITEMS[s.id].name;
      const tw=g.measureText(label).width;
      const src=ui.slotRects[ui.hoverSlot];
      g.fillStyle='rgba(10,12,20,0.92)';
      rr(g,src.x+4,src.y-24,tw+14,20,4);g.fill();
      g.fillStyle='#ffe9b0';
      g.fillText(label,src.x+11,src.y-9);
    }
    if(ui.mouseItem){
      const icon=tex.icons[ui.mouseItem.id];
      if(icon)g.drawImage(icon,game.mouse.x-16,game.mouse.y-16,32,32);
      if(ui.mouseItem.count>1){
        g.font='bold 12px "Microsoft YaHei",sans-serif';
        g.strokeStyle='rgba(0,0,0,0.8)';g.lineWidth=3;
        g.strokeText(ui.mouseItem.count,game.mouse.x+12,game.mouse.y+16);
        g.fillStyle='#fff';
        g.fillText(ui.mouseItem.count,game.mouse.x+12,game.mouse.y+16);
      }
    }
  };

  ui.drawCursor=function(g,mx,my){
    g.fillStyle='#f2c84b';
    g.strokeStyle='rgba(0,0,0,0.7)';
    g.lineWidth=1.5;
    g.beginPath();
    g.moveTo(mx,my);
    g.lineTo(mx,my+16);
    g.lineTo(mx+4.5,my+11.5);
    g.lineTo(mx+8,my+17);
    g.lineTo(mx+11,my+15.5);
    g.lineTo(mx+7.5,my+10);
    g.lineTo(mx+13,my+8.5);
    g.closePath();
    g.fill();g.stroke();
  };

  ui.pickSlot=function(mx,my){
    for(const rc of ui.slotRects){
      if(mx>=rc.x&&mx<rc.x+rc.w&&my>=rc.y&&my<rc.y+rc.h)return rc.slot;
    }
    return-1;
  };
  ui.pickRecipe=function(mx,my){
    for(const rc of ui.recipeRects){
      if(rc.y+rc.h<ui._panelY0||rc.y>ui._panelY1)continue;
      if(mx>=rc.x&&mx<rc.x+rc.w&&my>=rc.y&&my<rc.y+rc.h)return rc.recipe;
    }
    return-1;
  };
  ui.updateHover=function(mx,my){
    ui.hoverSlot=ui.pickSlot(mx,my);
    ui.hoverRecipe=ui.pickRecipe(mx,my);
  };
  ui.clickSlot=function(inv,slot,button,shift){
    const s=inv[slot];
    const m=ui.mouseItem;
    if(shift&&button===0&&s&&!m){
      const target=slot<10?[10,39]:[0,9];
      const total=[];
      for(let i=target[0];i<=target[1];i++)total.push(i);
      for(const i of total){
        const t=inv[i];
        if(t&&t.id===s.id&&t.count<ITEMS[s.id].max){
          const take=Math.min(s.count,ITEMS[s.id].max-t.count);
          t.count+=take;s.count-=take;
          if(s.count<=0){inv[slot]=null;return}
        }
      }
      for(const i of total){
        if(!inv[i]){inv[i]={id:s.id,count:s.count};inv[slot]=null;return}
      }
      return;
    }
    if(button===0){
      if(!m){
        if(s){ui.mouseItem={id:s.id,count:s.count};inv[slot]=null}
      }else{
        if(!s){
          inv[slot]={id:m.id,count:m.count};
          ui.mouseItem=null;
        }else if(s.id===m.id){
          const take=Math.min(m.count,ITEMS[s.id].max-s.count);
          s.count+=take;m.count-=take;
          if(m.count<=0)ui.mouseItem=null;
        }else{
          inv[slot]={id:m.id,count:m.count};
          ui.mouseItem={id:s.id,count:s.count};
        }
      }
    }else if(button===2){
      if(!m){
        if(s){
          const half=Math.ceil(s.count/2);
          ui.mouseItem={id:s.id,count:half};
          s.count-=half;
          if(s.count<=0)inv[slot]=null;
        }
      }else{
        if(!s){
          inv[slot]={id:m.id,count:1};
          m.count--;
        }else if(s.id===m.id&&s.count<ITEMS[s.id].max){
          s.count++;m.count--;
        }
        if(m.count<=0)ui.mouseItem=null;
      }
    }
  };
  ui.close=function(inv,game){
    ui.invOpen=false;
    if(ui.mouseItem){
      const rest=addItem(inv,ui.mouseItem.id,ui.mouseItem.count);
      if(rest>0)spawnDrop(game.player.cx,game.player.cy,ui.mouseItem.id,rest);
      ui.mouseItem=null;
    }
  };
})();