// Numbered station exits only. Never render underground passage or platform geometry.
export const STATION_ACCESS_SNAPSHOT='/data/transport/dongjak-station-access-v1.json';
let sharedSnapshot=null;
export function fetchStationAccessSnapshot(fetcher=globalThis.fetch){
 if(fetcher!==globalThis.fetch)return loadStationAccessFile(fetcher);
 if(!sharedSnapshot)sharedSnapshot=loadStationAccessFile(fetcher).catch(e=>{sharedSnapshot=null;throw e;});
 return sharedSnapshot;
}
async function loadStationAccessFile(fetcher){
 const r=await fetcher(STATION_ACCESS_SNAPSHOT);
 if(!r.ok)throw Error('snapshot '+r.status);
 const d=await r.json();
 if(d.schema!==1||!Array.isArray(d.elements)||!d.elements.length)throw Error('invalid station snapshot');
 return d;
}
export const STATION_ACCESS_ZOOM=16.2;
export const STATION_PASSAGE_ZOOM=16.65;
const SOURCE='dj-metro-station-access',X=88300,Y=111320;
const ids=[SOURCE+'-exit-circle',SOURCE+'-exit-label'];
const empty=()=>({type:'FeatureCollection',features:[]});
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const distance=(a,b)=>Math.hypot((a[0]-b[0])*X,(a[1]-b[1])*Y);
const pointOf=e=>[Number(e.lon??e.center?.lon),Number(e.lat??e.center?.lat)];
const coordinates=e=>(e.geometry||[]).map(p=>[Number(p.lon),Number(p.lat)]).filter(valid);
export function normalizeExitStation(s){const plain=String(s||'').normalize('NFKC').replace(/\s*\([^)]*\)\s*/g,'').replace(/\s|역$/g,'');return plain==='총신대입구'?'이수':plain;}
const normalized=normalizeExitStation;
const number=t=>{const n=String(t.ref||t['exit:ref']||t['entrance:ref']||'').trim();return /^[0-9]{1,2}[A-Za-z]?(?:[-·][0-9A-Za-z]+)?$/.test(n)?n:'';};
function nearest(p,path){
 let best=null,d=Infinity;
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y,len=dx*dx+dy*dy;if(!len)continue;
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*X*dx+(p[1]-a[1])*Y*dy)/len)),q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],m=distance(p,q);if(m<d){best=q;d=m;}
 }
 return best?{point:best,distance:d}:null;
}
function stationAt(p,stations,tag=''){
 let best=null;const name=normalized(tag);let d=name?450:300;
 for(const s of stations){const m=distance(p,[s.lng,s.lat]);if(m<d&&(!name||normalized(s.name)===name)){d=m;best=s;}}
 return best;
}
function lineColor(s,colors){return colors[s.lines?.[0]]||'#718b7b';}
function feature(type,coordinates,properties){return {type:'Feature',geometry:{type,coordinates},properties};}
export function buildStationAccess(elements,stations,colors,railPaths=new Map(),allow=()=>true){
 const result=[],seen=new Set();
 for(const e of elements||[]){const t=e.tags||{};
  if(e.type!=='node'||!(t.railway==='subway_entrance'||t.subway==='yes'&&t.entrance))continue;
  const p=pointOf(e);if(!valid(p)||!allow(...p))continue;
  const officialName=normalized(t.station||t['station:name']||'');
  const named=stationAt(p,stations,t.station||t['station:name']||'');
  const isOfficial=String(t.source||'').startsWith('MOIS')&&officialName;
  const line=String(t.station||'').match(/\((\d+호선)\)/)?.[1];
  const station=named||(isOfficial?{name:officialName,lng:p[0],lat:p[1],lines:line?[line]:[]}:stationAt(p,stations));if(!station)continue;
  const n=number(t),key=normalized(station.name)+'|'+(n||e.id)+'|'+p.map(v=>v.toFixed(5)).join(',');if(seen.has(key))continue;seen.add(key);
  const props={kind:'exit',station:station.name,number:n,label:n||'출입구',color:colors[line]||lineColor(station,colors),quality:'mapped',source:t.source||'OpenStreetMap'};
  result.push(feature('Point',p,props));
 }
 return {type:'FeatureCollection',features:result};
}
export function stationAccessQuery(b,kind='all'){
 const box=b.map(x=>x.toFixed(6)).join(',');
 const exits='node["railway"="subway_entrance"]('+box+');node["subway"="yes"]["entrance"]('+box+');';
 const passages='way["railway"="platform"]('+box+');way["public_transport"="platform"]["subway"="yes"]('+box+');way["highway"="footway"]["tunnel"="yes"]('+box+');way["highway"="footway"]["location"="underground"]('+box+');way["indoor"="corridor"]('+box+');way["highway"="steps"]["level"]('+box+');';
 return '[out:json][timeout:10];('+(kind==='exits'?exits:kind==='passages'?passages:exits+passages)+');out body geom;';
}
export function installMetroStationAccess({map,app,getStations,getRailPaths,colors,allow,fetcher=globalThis.fetch}){
 if(!map?.getBounds||!map?.getZoom||!map?.addSource)return {request(){}};
 let snapshot=null,pending=null,timer=0,last='',initialized=false,failedAt=0;
 function loadSnapshot(){
  if(snapshot||pending||Date.now()-failedAt<30000)return;
  pending=fetchStationAccessSnapshot(fetcher).then(data=>{snapshot=data.elements;request();}).catch(error=>{failedAt=Date.now();console.warn('[지하철 정적 출입구]',error?.message);}).finally(()=>{pending=null;});
 }
 const enabled=()=>app?.dataset?.djTransitExterior==='true'||app?.dataset?.baseMetro!=='off';
 function setup(){
  if(map.getSource(SOURCE))return;
  map.addSource(SOURCE,{type:'geojson',data:empty(),attribution:'MOIS public subway entrance data; © OpenStreetMap contributors (ODbL)'});
  const add=l=>map.addLayer(l);
  add({id:ids[0],type:'circle',source:SOURCE,minzoom:STATION_ACCESS_ZOOM,filter:['==',['get','kind'],'exit'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16.2,6.5,20,10],'circle-color':'#fff6d7','circle-stroke-color':['get','color'],'circle-stroke-width':1.5}});
  add({id:ids[1],type:'symbol',source:SOURCE,minzoom:STATION_ACCESS_ZOOM,filter:['==',['get','kind'],'exit'],layout:{'text-field':['get','label'],'text-font':['Noto Sans Bold','Open Sans Semibold'],'text-size':['interpolate',['linear'],['zoom'],16.2,9,20,12],'text-allow-overlap':true,'text-ignore-placement':true,'text-padding':1},paint:{'text-color':'#534d31'}});
  initialized=true;
 }
 function publish(data){if(map.isMoving?.())return;setup();const sig=JSON.stringify(data);if(sig!==last){map.getSource(SOURCE)?.setData(data);last=sig;}}
 function refresh(){
  if(map.isMoving?.())return;
  if(!map.isStyleLoaded?.()&&typeof map.isStyleLoaded==='function'){map.once?.('idle',request);return;}
  if(!enabled()||map.getZoom()<STATION_ACCESS_ZOOM){if(initialized&&last)publish(empty());return;}
  const b=map.getBounds();if(!b?.getWest)return;
  const w=b.getWest(),s=b.getSouth(),e=b.getEast(),n=b.getNorth(),pad=.004,eBound=e;
  const center=map.getCenter?.()||{lng:(w+e)/2,lat:(s+n)/2};
  const stations=(getStations()||[]).filter(p=>p.lng>=w-pad&&p.lng<=e+pad&&p.lat>=s-pad&&p.lat<=n+pad).sort((a,b)=>distance([a.lng,a.lat],[center.lng,center.lat])-distance([b.lng,b.lat],[center.lng,center.lat])).slice(0,8);
  // Official named exits are independent of station marker streaming.
  if(!snapshot){loadSnapshot();return;}
  const rows=snapshot.filter(e=>{
   if(e.type==='node'){const [x,y]=pointOf(e);return x>=w-pad&&x<=eBound+pad&&y>=s-pad&&y<=n+pad;}
   return false;
  });
  publish(buildStationAccess(rows,stations,colors,new Map(),allow));
 }
 function request(){clearTimeout(timer);timer=setTimeout(refresh,220);}
 map.on?.('moveend',request);map.on?.('zoomend',request);
 globalThis.window?.addEventListener?.('dongjak:transit-stream-scope',request);
 globalThis.document?.addEventListener?.('dongjak-base-layer-change',request);
 request();
 return {request};
}
