import {officialStaticBusPlaces} from './static-bus-stops.js';
import {stationsGeojson} from './fixed-rail-data.js';
import {transitPointInScope} from './transit-exterior-scope.mjs';
const CELL=.012;
export function makeTransitViewportIndex(places,cell=CELL){
 const cells=new Map();
 for(const p of places){if(!Number.isFinite(p.lng)||!Number.isFinite(p.lat))continue;const key=Math.floor(p.lng/cell)+':'+Math.floor(p.lat/cell);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
 return {query(bounds,zoom){
  if(!bounds||zoom<12)return [];
  const [w,s,e,n]=bounds,dx=(e-w)*.18,dy=(n-s)*.18;
  const west=w-dx,east=e+dx,south=s-dy,north=n+dy,cx=(w+e)/2,cy=(s+n)/2;
  const result=[];
  for(let i=Math.floor(west/cell);i<=Math.floor(east/cell);i++)for(let j=Math.floor(south/cell);j<=Math.floor(north/cell);j++)for(const p of cells.get(i+':'+j)||[]){
   if(p.lng<west||p.lng>east||p.lat<south||p.lat>north||p.kind==='bus'&&zoom<14)continue;
   result.push(p);
  }
  result.sort((a,b)=>Number(a.kind==='bus')-Number(b.kind==='bus')||(a.lng-cx)**2+(a.lat-cy)**2-(b.lng-cx)**2-(b.lat-cy)**2);
  return result.slice(0,zoom>=16?260:zoom>=14?150:90);
 }};
}
const empty=()=>({type:'FeatureCollection',features:[]});
export function installTransitViewportPicker({map,isActive,onReady}){
 const source='dj-seoul-picker-stops',layers=[source+'-circle',source+'-icon',source+'-name'];
 let index=null,loading=null,last='',wasActive=false,all=[];
 const ensure=()=>{
  if(!map.isStyleLoaded?.())return false;
  if(!map.getSource(source))map.addSource(source,{type:'geojson',data:empty()});
  if(!map.getLayer(layers[0]))map.addLayer({id:layers[0],source,type:'circle',minzoom:12,paint:{'circle-radius':['case',['==',['get','kind'],'bus'],7,8],'circle-color':['case',['==',['get','kind'],'bus'],'#3167a8','#247765'],'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  if(!map.getLayer(layers[1]))map.addLayer({id:layers[1],source,type:'symbol',minzoom:12,layout:{'text-field':['case',['==',['get','kind'],'bus'],'B','M'],'text-font':['Noto Sans Bold','Open Sans Semibold'],'text-size':9,'text-allow-overlap':true,'text-ignore-placement':true},paint:{'text-color':'#fff'}});
  if(!map.getLayer(layers[2]))map.addLayer({id:layers[2],source,type:'symbol',minzoom:15,layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':11,'text-offset':[0,1.2],'text-anchor':'top','text-allow-overlap':false,'text-padding':4},paint:{'text-color':'#233f35','text-halo-color':'#fff','text-halo-width':1.2}});
  return true;
 };
 async function load(){
  if(index)return;
  if(loading)return loading;
  loading=(async()=>{
   const res=await fetch('/data/transport/seoul-bus-stops.json',{cache:'force-cache'});if(!res.ok)throw Error('bus index unavailable');
   const buses=officialStaticBusPlaces(await res.json(),(lng,lat)=>transitPointInScope({lng,lat}));
   const rail=stationsGeojson.features.flatMap(f=>{const [lng,lat]=f.geometry.coordinates||[];const name=String(f.properties?.name||f.properties?.station||'');return name&&transitPointInScope({lng,lat})?[{id:'rail:'+name+':'+lng+':'+lat,kind:'subway',name:name.endsWith('역')?name:name+'역',lng,lat,lines:[]}]:[];});
   all=[...buses,...rail];index=makeTransitViewportIndex(all);onReady?.();
  })().catch(e=>console.warn('[서울 교통 위치 선택 자료]',e)).finally(()=>{loading=null;refresh();});
  return loading;
 }
 function refresh(){
  if(!isActive()){if(wasActive){map.getSource(source)?.setData(empty());last='';wasActive=false;}return;}
  wasActive=true;if(!index){if(!loading)void load();return;}
  if(map.isMoving?.()||!ensure())return;
  const b=map.getBounds(),z=map.getZoom(),bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];
  const rows=index.query(bounds,z),key=rows.map(p=>p.id).join('|');
  if(key===last)return;last=key;
  map.getSource(source)?.setData({type:'FeatureCollection',features:rows.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{...p,lines:(p.lines||[]).join(',')}}))});
 }
 map.on('moveend',refresh);map.on('style.load',()=>{last='';refresh();});
 return {refresh,search(query){const q=String(query).trim().replace(/\s/g,'');return q.length<2?[]:all.filter(p=>p.name.replace(/\s/g,'').includes(q)||String(p.arsId||'')===q).sort((a,b)=>Number(b.name===q)-Number(a.name===q)).slice(0,25);},layers};
}
