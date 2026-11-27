// A single active background: local safety geometry, or that same geometry extended to Seoul.
import {buildExtendedCityRail} from './city-rail-extension.mjs';
export const CITY_RAIL_ID='dj-city-transit-rail';
export const LOCAL_RAIL_LINE_IDS=Object.freeze(['transport-schematic-subway-casing','transport-schematic-subway','transport-real-rail-overview-casing','transport-real-rail-overview']);
const ID=CITY_RAIL_ID,LOCAL=LOCAL_RAIL_LINE_IDS;
export function cityRailOwnsBackground(map,active){return Boolean(active&&map.getLayer?.(ID)&&map.getSource?.(ID));}
export function clipCityRail(collection,geometry,isInside,colors){
 const features=[];
 for(const f of collection?.features||[]){
  const line=f.properties?.line,coords=f.geometry?.coordinates;
  if(!colors[line]||f.geometry?.type!=='LineString'||!Array.isArray(coords))continue;
  // Keep mapped vertices; never join disjoint track fragments by invented chords.
  let run=[];const flush=()=>{if(run.length>1)features.push({type:'Feature',properties:{line,color:colors[line]},geometry:{type:'LineString',coordinates:run}});run=[];};
  for(const p of coords){if(Array.isArray(p)&&p.length===2&&isInside(p[0],p[1],geometry))run.push(p);else flush();}flush();
 }
 return {type:'FeatureCollection',features};
}
export function installCityTransitRail({map,app,colors,getBoundary,isInside,getLocalCollection=()=>null,fetchFn=globalThis.fetch}){
 let pending=null,raw=null,appliedBoundary=null,appliedLocal=null,displayedCollection=null,ready=false,active=false,waitingMove=false;
 const localVisibility=()=>app?.dataset?.baseMetro==='off'?'none':'visible';
 const setVisible=(id,v)=>{if(map.getLayer?.(id)&&(map.getLayoutProperty?.(id,'visibility')||'visible')!==v)map.setLayoutProperty?.(id,'visibility',v);};
 function sync(){
  active=app?.dataset?.djTransitExterior==='true';
  const boundary=getBoundary();
  if(!active){for(const id of [ID,ID+'-casing'])setVisible(id,'none');for(const id of LOCAL)setVisible(id,localVisibility());return;}
  if(!ready)for(const id of LOCAL)setVisible(id,'visible');
  if(!boundary)return;
  const local=getLocalCollection();
  if(raw&&(appliedBoundary!==boundary||appliedLocal!==local)){
   // Do not publish geometry while the user is moving the camera.
   if(map.isMoving?.()){if(!waitingMove){waitingMove=true;map.once('moveend',()=>{waitingMove=false;sync();});}return;}
   const data=buildExtendedCityRail(raw,local,boundary,isInside,colors);
   if(!data.features.length)return;
   if(!map.getSource(ID)){
    map.addSource(ID,{type:'geojson',data,tolerance:0,maxzoom:19,attribution:'© OpenStreetMap contributors (ODbL)'});
    const layers=map.getStyle().layers;
    const before=layers.find(l=>l.id.startsWith('dj-transit-comparison-route')||l.id.startsWith('dj-transit-rail-')||l.id.startsWith('dj815-transit-')||l.id.startsWith('dj-transit-multi-'))?.id||layers.find(l=>l.type==='symbol')?.id;
    const layout={'line-cap':'round','line-join':'round'};
    map.addLayer({id:ID,type:'line',source:ID,minzoom:8,layout,paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],8,1,10.2,2.9,13,4.3,17,3.8],'line-opacity':['get','opacity'],'line-blur':['interpolate',['linear'],['get','opacity'],0,.95,.18,.62,.45,.38,1,.30]}},before);
   }else map.getSource(ID).setData(data);
   displayedCollection=data;appliedBoundary=boundary;appliedLocal=local;ready=true;
  }
  if(ready){for(const id of LOCAL)setVisible(id,'none');setVisible(ID+'-casing','none');setVisible(ID,'visible');}
  else if(!pending&&typeof fetchFn==='function'){
   pending=fetchFn('/data/transport/seoul-rail-network-single-fa75e12.geojson',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('rail network '+r.status);return r.json();}).then(data=>{raw=data;if(active)sync();}).catch(error=>console.warn('[서울 철도 배경 선형]',error.message)).finally(()=>{pending=null;});
  }
 }
 return {sync,getCollection:()=>displayedCollection};
}
