// Cartographic access context only, never a routing graph. Approximation is explicitly dashed.
export const STATION_ACCESS_SNAPSHOT='/data/transport/seoul-station-access-v1.json';
export const STATION_ACCESS_ZOOM=16.2;
export const STATION_PASSAGE_ZOOM=16.65;
const SOURCE='dj-metro-station-access',X=88300,Y=111320;
const ids=[SOURCE+'-platform',SOURCE+'-passage',SOURCE+'-approximate',SOURCE+'-approximate-label',SOURCE+'-exit-circle',SOURCE+'-exit-label'];
const empty=()=>({type:'FeatureCollection',features:[]});
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const distance=(a,b)=>Math.hypot((a[0]-b[0])*X,(a[1]-b[1])*Y);
const pointOf=e=>[Number(e.lon??e.center?.lon),Number(e.lat??e.center?.lat)];
const coordinates=e=>(e.geometry||[]).map(p=>[Number(p.lon),Number(p.lat)]).filter(valid);
const normalized=s=>String(s||'').normalize('NFKC').replace(/\s|역$/g,'');
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
 const result=[],exits=[],paths=[],seen=new Set();
 for(const e of elements||[]){const t=e.tags||{};
  if(e.type!=='node'||!(t.railway==='subway_entrance'||t.subway==='yes'&&t.entrance))continue;
  const p=pointOf(e);if(!valid(p)||!allow(...p))continue;
  const station=stationAt(p,stations,t.station||t['station:name']||'')||stationAt(p,stations);if(!station)continue;
  const n=number(t),key=normalized(station.name)+'|'+(n||e.id);if(seen.has(key))continue;seen.add(key);
  const props={kind:'exit',station:station.name,number:n,label:n||'출입구',color:lineColor(station,colors),quality:'mapped',source:t.source||'OpenStreetMap'};
  result.push(feature('Point',p,props));exits.push({p,station,props});
 }
 for(const e of elements||[]){if(e.type!=='way')continue;const t=e.tags||{},p=coordinates(e);if(p.length<2||!p.every(q=>allow(...q)))continue;
  const subwayPlatform=t.railway==='platform'||t.public_transport==='platform'&&t.subway==='yes';
  const passage=t.indoor==='corridor'||t.highway==='footway'&&(t.tunnel==='yes'||t.location==='underground')||t.highway==='steps'&&Number(t.level)<0;
  if(!subwayPlatform&&!passage)continue;
  const station=stationAt(p[Math.floor(p.length/2)],stations);if(!station)continue;
  // Exclude unrelated underground walkways and above-ground platforms without a station connection.
  if(!subwayPlatform&&!exits.some(x=>x.station.name===station.name&&(nearest(x.p,p)?.distance??Infinity)<=35)&&!p.some(q=>distance(q,[station.lng,station.lat])<=45))continue;
  const props={kind:subwayPlatform?'platform':'passage',station:station.name,color:lineColor(station,colors),quality:'mapped',source:'OpenStreetMap'};
  const closed=p.length>=4&&distance(p[0],p.at(-1))<.1;
  result.push(feature(subwayPlatform&&closed?'Polygon':'LineString',subwayPlatform&&closed?[p]:p,props));
  if(passage)paths.push({station,p});
 }
 for(const x of exits){
  if(paths.some(y=>y.station.name===x.station.name&&(nearest(x.p,y.p)?.distance??Infinity)<15))continue;
  let best=null;
  for(const line of x.station.lines||[])for(const path of railPaths.get(line)||[]){const q=nearest(x.p,path);if(q&&distance(q.point,[x.station.lng,x.station.lat])<=190&&(!best||q.distance<best.distance))best={...q,line};}
  // Use mapped track geometry when available; no invented exit positions.
  if(!best||best.distance<5||best.distance>130||!allow(...best.point))continue;
  result.push(feature('LineString',[x.p,best.point],{kind:'approximate',station:x.station.name,color:colors[best.line]||x.props.color,quality:'schematic',label:'개략 통로',source:'역·출입구 좌표 기반 개략 표시'}));
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
  pending=Promise.resolve().then(()=>fetcher(STATION_ACCESS_SNAPSHOT)).then(r=>{if(!r.ok)throw Error('snapshot '+r.status);return r.json();}).then(data=>{if(data.schema!==1||!Array.isArray(data.elements)||!data.elements.length)throw Error('invalid station snapshot');snapshot=data.elements;request();}).catch(error=>{failedAt=Date.now();console.warn('[지하철 정적 출입구]',error?.message);}).finally(()=>{pending=null;});
 }
 const enabled=()=>app?.dataset?.djTransitExterior==='true'||app?.dataset?.baseMetro!=='off';
 function setup(){
  if(map.getSource(SOURCE))return;
  map.addSource(SOURCE,{type:'geojson',data:empty(),attribution:'© OpenStreetMap contributors (ODbL)'});
  const style=map.getStyle()?.layers||[],before=style.find(l=>l.id==='dj-metro-detail-icon')?.id||style.find(l=>l.type==='symbol')?.id;
  const add=l=>map.addLayer(l,l.id===ids[4]||l.id===ids[5]?undefined:before);
  add({id:ids[0],type:'fill',source:SOURCE,minzoom:STATION_PASSAGE_ZOOM,filter:['all',['==',['get','kind'],'platform'],['==',['geometry-type'],'Polygon']],paint:{'fill-color':['get','color'],'fill-opacity':.18,'fill-outline-color':['get','color']}});
  add({id:ids[1],type:'line',source:SOURCE,minzoom:STATION_PASSAGE_ZOOM,filter:['all',['in',['get','kind'],['literal',['passage','platform']]],['==',['geometry-type'],'LineString']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-opacity':.52,'line-width':['interpolate',['linear'],['zoom'],16.65,3,20,8]}});
  add({id:ids[2],type:'line',source:SOURCE,minzoom:STATION_PASSAGE_ZOOM,filter:['==',['get','kind'],'approximate'],layout:{'line-cap':'round'},paint:{'line-color':['get','color'],'line-opacity':.45,'line-width':2.5,'line-dasharray':[2,2]}});
  add({id:ids[3],type:'symbol',source:SOURCE,minzoom:18.7,filter:['==',['get','kind'],'approximate'],layout:{'symbol-placement':'line-center','text-field':['get','label'],'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':9,'text-optional':true,'text-padding':3},paint:{'text-color':'#65796e','text-halo-color':'#fff','text-halo-width':1}});
  add({id:ids[4],type:'circle',source:SOURCE,minzoom:STATION_ACCESS_ZOOM,filter:['==',['get','kind'],'exit'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],16.2,6.5,20,10],'circle-color':'#fff6d7','circle-stroke-color':['get','color'],'circle-stroke-width':1.5}});
  add({id:ids[5],type:'symbol',source:SOURCE,minzoom:STATION_ACCESS_ZOOM,filter:['==',['get','kind'],'exit'],layout:{'text-field':['get','label'],'text-font':['Noto Sans Bold','Open Sans Semibold'],'text-size':['interpolate',['linear'],['zoom'],16.2,9,20,12],'text-allow-overlap':true,'text-ignore-placement':true,'text-padding':1},paint:{'text-color':'#534d31'}});
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
  if(!stations.length){if(initialized&&last)publish(empty());return;}
  if(!snapshot){loadSnapshot();return;}
  const rows=snapshot.filter(e=>{
   if(e.type==='node'){const [x,y]=pointOf(e);return x>=w-pad&&x<=eBound+pad&&y>=s-pad&&y<=n+pad;}
   if(map.getZoom()<STATION_PASSAGE_ZOOM)return false;
   return (e.geometry||[]).some(q=>q.lon>=w-pad&&q.lon<=eBound+pad&&q.lat>=s-pad&&q.lat<=n+pad);
  });
  let rail=new Map();try{rail=getRailPaths()||rail;}catch{}
  publish(buildStationAccess(rows,stations,colors,rail,allow));
 }
 function request(){clearTimeout(timer);timer=setTimeout(refresh,220);}
 map.on?.('moveend',request);map.on?.('zoomend',request);
 globalThis.window?.addEventListener?.('dongjak:transit-stream-scope',request);
 globalThis.document?.addEventListener?.('dongjak-base-layer-change',request);
 request();
 return {request};
}
