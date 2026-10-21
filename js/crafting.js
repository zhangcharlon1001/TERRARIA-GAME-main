function addItem(inv,id,count){
  const def=ITEMS[id];
  for(let i=0;i<inv.length&&count>0;i++){
    const s=inv[i];
    if(s&&s.id===id&&s.count<def.max){
      const take=Math.min(count,def.max-s.count);
      s.count+=take;count-=take;
    }
  }
  if(count>0){
    for(let i=0;i<inv.length;i++){
      if(!inv[i]){
        const take=Math.min(count,def.max);
        inv[i]={id,count:take};
        count-=take;
        if(count<=0)break;
      }
    }
  }
  return count;
}
function countItem(inv,id){
  let n=0;
  for(const s of inv)if(s&&s.id===id)n+=s.count;
  return n;
}
function removeItems(inv,req){
  for(const id in req){
    let need=req[id];
    for(let i=inv.length-1;i>=0&&need>0;i--){
      const s=inv[i];
      if(s&&s.id===id){
        const take=Math.min(need,s.count);
        s.count-=take;need-=take;
        if(s.count<=0)inv[i]=null;
      }
    }
  }
}
function nearStations(p){
  return{
    workbench:world.stationNear(p.cx,p.cy,'workbench'),
    furnace:world.stationNear(p.cx,p.cy,'furnace'),
    anvil:world.stationNear(p.cx,p.cy,'anvil')
  };
}
function craftState(r,inv,stations){
  let ok=true;
  const mats=[];
  for(const id in r.in){
    const have=countItem(inv,id);
    const need=r.in[id];
    const enough=have>=need;
    if(!enough)ok=false;
    mats.push({id,need,have,enough});
  }
  let stationOk=true;
  if(r.st&&!stations[r.st])stationOk=false;
  return{ok:ok&&stationOk,mats,stationOk};
}
function doCraft(r,inv,stations){
  const st=craftState(r,inv,stations);
  if(!st.stationOk)return'need_station';
  if(!st.ok)return'no_mats';
  removeItems(inv,r.in);
  const rest=addItem(inv,r.out,r.n);
  if(rest>0)spawnDrop(game.player.cx,game.player.cy,r.out,rest);
  snd.craft();
  return'ok';
}