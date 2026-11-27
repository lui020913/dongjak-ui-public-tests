import {containsDistrictPoint,isNativeBuildingGeometry} from './district-building-scope.mjs';
const PATH='/data/redevelopment/confirmed-projects-202609.geojson';
const SOURCE='dj-confirmed-development-areas',FILL='dj-confirmed-development-fill',LINE='dj-confirmed-development-line',LABEL='dj-confirmed-development-label';
export function isConfirmedPlanLabel(p){
 if(typeof p?.label!=='string')return false;
 if(p.label.endsWith(' (예정)'))return !p.occupancy_month;
 const match=p.occupancy_month?.match(/^(20\d{2})-(0[1-9]|1[0-2])$/);
 return Boolean(match&&p.occupancy_source_url?.startsWith('https://')&&p.label.endsWith(' ('+match[1]+'년 '+Number(match[2])+'월 예정)'));
}
export async function loadConfirmedDevelopments(fetcher=globalThis.fetch){
 const response=await fetcher(PATH,{cache:'no-cache'});
 if(!response.ok)throw Error('정비사업 공간정보 HTTP '+response.status);
 const data=await response.json();
 if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length||!data.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)&&f.properties?.display_only===true&&isConfirmedPlanLabel(f.properties)))throw Error('정비사업 공간정보 형식 오류');
 return data;
}
export function createPlanLookup(plans){
 // The indexed lookup runs only while loading an existing GIS sheet.
 const cells=new Map(),size=.002;
 for(const f of plans.features){
  const parts=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const p of parts){
   let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;
   for(const [x,y] of p[0]){w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);}
   const g={type:'Polygon',coordinates:p};
   for(let x=Math.floor(w/size);x<=Math.floor(e/size);x++)for(let y=Math.floor(s/size);y<=Math.floor(n/size);y++){const key=x+':'+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(g);}
  }
 }
 return (x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&(cells.get(Math.floor(x/size)+':'+Math.floor(y/size))||[]).some(g=>containsDistrictPoint(g,x,y));
}
// Explicit interior label anchors avoid polygon placement failures.
export function developmentLabelPoints(plans){
 const features=[];
 for(const f of plans.features){
  const parts=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  const area=ring=>Math.abs(ring.slice(1).reduce((sum,p,i)=>sum+ring[i][0]*p[1]-p[0]*ring[i][1],0));
  const poly=parts.slice().sort((a,b)=>area(b[0])-area(a[0]))[0];
  if(!poly?.[0]?.length)continue;
  let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;for(const [x,y] of poly[0]){w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);}
  const g={type:'Polygon',coordinates:poly},mid=[(w+e)/2,(s+n)/2];let best=null,score=Infinity;
  for(let i=0;i<=30;i++)for(let j=0;j<=30;j++){
   const x=w+(e-w)*i/30,y=s+(n-s)*j/30;
   if(!containsDistrictPoint(g,x,y))continue;
   const d=(x-mid[0])**2+(y-mid[1])**2;if(d<score){score=d;best=[x,y];}
  }
  if(best)features.push({type:'Feature',geometry:{type:'Point',coordinates:best},properties:f.properties});
 }
 return {type:'FeatureCollection',features};
}
const LABEL_POINTS='dj-confirmed-development-label-points';
export function installConfirmedDevelopmentDisplay({map,app,plans}){
 const contains=createPlanLookup(plans);
 // Keep native buildings and the existing 2D/3D renderer everywhere else.
 // A single ground-plan polygon masks only the selected sites, below roads;
 // GIS building footprints/extrusions are excluded using the same polygons.
 const colors=()=>app.dataset.theme==='dark'?{fill:'#37453f',line:'#758a7e',text:'#dce6df',halo:'#273a32'}:{fill:'#e8e7e0',line:'#b2b9ae',text:'#52665b',halo:'#f7f8f4'};
 const applyTheme=()=>{const c=colors();for(const [id,key,v] of [[FILL,'fill-color',c.fill],[LINE,'line-color',c.line],[LABEL,'text-color',c.text],[LABEL,'text-halo-color',c.halo]])if(map.getLayer(id))map.setPaintProperty(id,key,v);};
 const install=()=>{
  const layers=map.getStyle()?.layers||[];
  const last=layers.findLastIndex(isNativeBuildingGeometry);
  // The normal OpenFreeMap building layers precede transport lines. Never
  // overlay an opaque plan on top of the road or route stack.
  const next=layers.slice(last+1).find(l=>l['source-layer']==='transportation'||l.type==='line');
  const c=colors();
  if(!map.getSource(LABEL_POINTS))map.addSource(LABEL_POINTS,{type:'geojson',data:developmentLabelPoints(plans)});
  if(!map.getLayer(LABEL))map.addLayer({id:LABEL,type:'symbol',source:LABEL_POINTS,minzoom:13.2,layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],13.2,10.5,16,12,18,14],'text-max-width':16,'text-padding':2,'text-allow-overlap':true,'text-ignore-placement':true,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},paint:{'text-color':c.text,'text-halo-color':c.halo,'text-halo-width':1.8}});
  if(last<0||!next)return;
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:plans,attribution:'서울특별시 서울플랜+ 2026-09 · 예정 부지(현황과 다를 수 있음)'});
  if(!map.getLayer(FILL))map.addLayer({id:FILL,type:'fill',source:SOURCE,minzoom:13,paint:{'fill-color':c.fill,'fill-opacity':1,'fill-antialias':false}},next.id);
  if(!map.getLayer(LINE))map.addLayer({id:LINE,type:'line',source:SOURCE,minzoom:13,paint:{'line-color':c.line,'line-width':1,'line-opacity':.75}},next.id);
  if(map.getStyle().layers.at(-1)?.id!==LABEL)map.moveLayer(LABEL);
  applyTheme();
 };
 install();
 map.on('style.load',install);
 const recover=()=>{if(!map.getLayer(FILL)||!map.getLayer(LABEL))install();};
 map.on('idle',recover);
 // Recolor only on a real theme mutation, not on map camera events.
 const observer=new MutationObserver(applyTheme);observer.observe(app,{attributes:true,attributeFilter:['data-theme']});
 return {contains,dispose(){observer.disconnect();map.off('style.load',install);map.off('idle',recover);}};
}
