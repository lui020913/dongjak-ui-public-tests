// A separate route-context overlay; the selected route and safety-map settings are independent.
const ID='dj-city-transit-rail',LOCAL=['transport-schematic-subway-casing','transport-schematic-subway','transport-real-rail-overview-casing','transport-real-rail-overview'];
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
export function installCityTransitRail({map,app,colors,getBoundary,isInside,fetchFn=globalThis.fetch}){
 let pending=null,raw=null,appliedBoundary=null,ready=false,active=false,waitingMove=false;
 const localVisibility=()=>app?.dataset?.baseMetro==='off'?'none':'visible';
 const setVisible=(id,v)=>{if(map.getLayer?.(id)&&(map.getLayoutProperty?.(id,'visibility')||'visible')!==v)map.setLayoutProperty?.(id,'visibility',v);};
 function sync(){
  active=app?.dataset?.djTransitExterior==='true';
  const boundary=getBoundary();
  if(!active){for(const id of [ID,ID+'-casing'])setVisible(id,'none');for(const id of LOCAL)setVisible(id,localVisibility());return;}
  if(!ready)for(const id of LOCAL)setVisible(id,'visible');
  if(!boundary)return;
  if(raw&&appliedBoundary!==boundary){
   // Do not publish geometry while the user is moving the camera.
   if(map.isMoving?.()){if(!waitingMove){waitingMove=true;map.once('moveend',()=>{waitingMove=false;sync();});}return;}
   const data=clipCityRail(raw,boundary,isInside,colors);
   if(!data.features.length)return;
   if(!map.getSource(ID)){
    map.addSource(ID,{type:'geojson',data,tolerance:.65,maxzoom:16,attribution:'© OpenStreetMap contributors (ODbL)'});
    const layers=map.getStyle().layers;
    const before=layers.find(l=>l.id.startsWith('dj-transit-comparison-route')||l.id.startsWith('dj-transit-rail-')||l.id.startsWith('dj815-transit-')||l.id.startsWith('dj-transit-multi-'))?.id||layers.find(l=>l.type==='symbol')?.id;
    const layout={'line-cap':'round','line-join':'round'};
    map.addLayer({id:ID+'-casing',type:'line',source:ID,minzoom:8,layout,paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],8,2,13,4.2,18,3.8],'line-opacity':.65}},before);
    map.addLayer({id:ID,type:'line',source:ID,minzoom:8,layout,paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],8,1,13,2.7,18,2.2],'line-opacity':.82}},before);
   }else map.getSource(ID).setData(data);
   appliedBoundary=boundary;ready=true;
  }
  if(ready){for(const id of LOCAL)setVisible(id,'none');for(const id of [ID,ID+'-casing'])setVisible(id,'visible');}
  else if(!pending&&typeof fetchFn==='function'){
   pending=fetchFn('/data/transport/seoul-rail-network.geojson',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('rail network '+r.status);return r.json();}).then(data=>{raw=data;if(active)sync();}).catch(error=>console.warn('[서울 철도 배경 선형]',error.message)).finally(()=>{pending=null;});
  }
 }
 return {sync};
}
