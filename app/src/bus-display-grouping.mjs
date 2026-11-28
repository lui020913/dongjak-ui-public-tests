import {normalizedBusStopName,busStopMeters} from './bus-stop-dedup.js';
export const BUS_GROUP_SPLIT_ZOOM=17.8;
export const BUS_GROUP_EXPAND_ZOOM=18.2;
export const BUS_GROUP_MAX_METERS=100;
export function busDisplayGrouping(stops=[],zoom=19){
 if(zoom>=BUS_GROUP_SPLIT_ZOOM)return stops;
 const buckets=new Map(),unmatched=[];
 // Official distinct boarding IDs only. Names alone do not establish identity.
 for(const stop of stops){
  const name=normalizedBusStopName(stop.name);
  if(!name||!/^\d{5}$/.test(String(stop.arsId||''))){unmatched.push(stop);continue;}
  const key=name+'|'+Boolean(stop.median);
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(stop);
 }
 const out=[...unmatched];
 for(const bucket of buckets.values()){
  const groups=[];
  for(const p of [...bucket].sort((a,b)=>String(a.arsId).localeCompare(String(b.arsId)))){
   const group=groups.find(g=>g.every(q=>q.arsId!==p.arsId&&busStopMeters(p,q)<=BUS_GROUP_MAX_METERS));
   if(group)group.push(p);else groups.push([p]);
  }
  for(const g of groups){
   if(g.length===1){out.push(g[0]);continue;}
   const center=[0,1].map(i=>g.reduce((sum,p)=>sum+(p.displayCoords||[p.lng,p.lat])[i],0)/g.length);
   out.push({id:'bus-group:'+g.map(p=>p.arsId).join(','),kind:'bus',name:g[0].name,lines:[],lng:center[0],lat:center[1],displayCoords:center,groupCount:g.length,groupMembers:g.map(p=>p.id),median:g[0].median});
  }
 }
 return out.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
}
