import {containsDistrictPoint,isNativeBuildingGeometry} from './district-building-scope.mjs';
const PATH='/data/redevelopment/confirmed-projects-202609.geojson';
const SOURCE='dj-confirmed-development-areas',FILL='dj-confirmed-development-fill',LINE='dj-confirmed-development-line',LABEL='dj-confirmed-development-label';
export async function loadConfirmedDevelopments(fetcher=globalThis.fetch){
 const response=await fetcher(PATH,{cache:'force-cache'});
 if(!response.ok)throw Error('정비사업 공간정보 HTTP '+response.status);
 const data=await response.json();
 if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length||!data.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)&&f.properties?.display_only===true&&f.properties.label?.endsWith(' (예정)')))throw Error('정비사업 공간정보 형식 오류');
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
  if(last<0||!next)return;
  const c=colors();
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:plans,attribution:'서울특별시 서울플랜+ 2026-09 · 예정 부지(현황과 다를 수 있음)'});
  if(!map.getLayer(FILL))map.addLayer({id:FILL,type:'fill',source:SOURCE,minzoom:13,paint:{'fill-color':c.fill,'fill-opacity':1,'fill-antialias':false}},next.id);
  if(!map.getLayer(LINE))map.addLayer({id:LINE,type:'line',source:SOURCE,minzoom:13,paint:{'line-color':c.line,'line-width':1,'line-opacity':.75}},next.id);
  if(!map.getLayer(LABEL))map.addLayer({id:LABEL,type:'symbol',source:SOURCE,minzoom:14.5,layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14.5,10,18,13],'text-max-width':13,'text-padding':6,'text-allow-overlap':false},paint:{'text-color':c.text,'text-halo-color':c.halo,'text-halo-width':1.4}});
  applyTheme();
 };
 install();
 map.on('style.load',install);
 // Recolor only on a real theme mutation, not on map camera events.
 const observer=new MutationObserver(applyTheme);observer.observe(app,{attributes:true,attributeFilter:['data-theme']});
 return {contains,dispose(){observer.disconnect();map.off('style.load',install);}};
}
