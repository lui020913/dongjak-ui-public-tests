// Use mapped site/landuse polygons only; no synthetic lots or building recoloring.
import {IMPORTANT_PLACES} from './important-place-click.js';
export const SITE_LANDUSE_PALETTE=Object.freeze({
 light:Object.freeze({residential:'#ddd4c8',commercial:'#f0e5cb',education:'#dbe6ee',industrial:'#e0dce6',hospital:'#f3dfda',public:'#d1d1cd'})
});
const PREFIX='dj-site-use-fill-';
// Prefer specific institutional uses over generic mixed-use classifications.
const groups=[
 ['hospital',['hospital','clinic','healthcare','medical','medical_centre','doctors']],
 ['public',['public','civic','government','governmental','public_building','public_service','townhall','town_hall','city_hall','government_office','administration','municipal','municipal_office','police','police_station','police_substation','police_box','fire_station','fire_substation','courthouse','community_centre','community_center','library','post','post_office','social_facility','welfare','nursing_home','senior_centre','senior_center','health_centre','health_center','administrative','public_facility']],
 ['education',['school','college','university','kindergarten','childcare','education','educational']],
 ['commercial',['commercial','retail','shopping','marketplace']],
 ['industrial',['industrial','warehouse']],
 ['residential',['apartments','apartment','apartment_complex','residential_complex','housing_estate','housing_complex']]
];
const anyTag=values=>['any',...['class','subclass','type','amenity','landuse','healthcare','office','building'].map(k=>['in',['coalesce',['get',k],''],['literal',values]])];
const civicNames=['동작구청','동작구청사','동작구청 신청사','동작구청신청사','동작구보건소','동작구정신건강복지센터','동작도서관'];
const publicName=['any',...['name:ko','name:nonlatin','name','name_ko'].map(k=>['any',['in',['coalesce',['get',k],''],['literal',civicNames]],...['구청','시청','군청','주민센터','행정복지센터','보건소','경찰서','소방서','우체국','도서관','복지센터'].map(suffix=>['==',['slice',['coalesce',['get',k],''],-suffix.length],suffix])])];
const publicTag=['any',anyTag(groups[1][1]),publicName];
const publicPaint=['any',publicTag,['boolean',['feature-state','verifiedCivicSite'],false]];
const filter=['any',publicName,...groups.map(([,values])=>anyTag(values))];
export function siteLandusePaint(){
 const palette=SITE_LANDUSE_PALETTE.light;
 return ['case',publicPaint,palette.public,...groups.filter(([kind])=>kind!=='public').flatMap(([kind,values])=>[anyTag(values),palette[kind]]),'rgba(0,0,0,0)'];
}
export function repaintSiteLanduse(map,app){
 const paint=siteLandusePaint();
 const visibility=app?.dataset?.sangdoNight==='on'?'none':'visible';
 for(const l of map.getStyle?.()?.layers||[])if(l.id.startsWith(PREFIX)){
  try{if(JSON.stringify(map.getPaintProperty(l.id,'fill-color'))!==JSON.stringify(paint))map.setPaintProperty(l.id,'fill-color',paint);if(map.getLayoutProperty?.(l.id,'visibility')!==visibility)map.setLayoutProperty?.(l.id,'visibility',visibility);}catch{}
 }
}
export function installSiteLanduse({map,app}){
 const layers=map.getStyle?.()?.layers||[],sources=new Map();
 for(const l of layers)if(l.type==='fill'&&l.source&&l['source-layer']==='landuse'&&!l.id.startsWith(PREFIX))sources.set(l.source,{source:l.source,'source-layer':l['source-layer']});
 // Paint over the original landuse background but beneath roads, water,
 // all building geometry, vegetation overlays and map labels.
 const lastLand=layers.reduce((n,l,i)=>l.type==='fill'&&l['source-layer']==='landuse'?i:n,-1);
 const before=layers.slice(lastLand+1).find(l=>l.type==='symbol'||l.type==='fill-extrusion'||['transportation','water','building','landcover'].includes(l['source-layer'])||/road|water|building|forest-shade|district-exterior/.test(l.id))?.id;
 const ids=[];
 for(const [i,src] of [...sources.values()].entries()){
  const id=PREFIX+i;ids.push(id);if(map.getLayer(id))continue;
  map.addLayer({id,type:'fill',...src,minzoom:13.2,filter,layout:{visibility:app?.dataset?.sangdoNight==='on'?'none':'visible'},paint:{'fill-color':siteLandusePaint(),'fill-opacity':['case',['any',anyTag(groups[groups.length-1][1]),publicPaint],1,.88],'fill-antialias':true}},before);
 }
 installCivicSiteIdentity(map,ids);
 return ids;
}

// A known civic anchor can identify a misclassified commercial parcel only
// if it falls inside an already rendered mapped landuse polygon. No new geometry.
const installedMaps=new WeakSet();
const genericClasses=new Set(['commercial','retail','shopping','marketplace']);
function polygonArea(g){
 const polys=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
 let total=0;
 for(const poly of polys){const r=poly[0]||[],o=r[0];if(!o)continue;let a=0;for(let i=1;i<r.length;i++){const p=r[i-1],q=r[i];a+=(p[0]-o[0])*(q[1]-o[1])-(q[0]-o[0])*(p[1]-o[1]);}total+=Math.abs(a)*88300*111320/2;}
 return total;
}
export function civicParcelCandidate(features,place){
 const norm=v=>String(v||'').replace(/\s/g,'');
 const candidates=(features||[]).filter(f=>{
  const p=f.properties||{},name=p['name:ko']||p['name:nonlatin']||p.name||'';
  return f.id!=null&&['class','subclass','landuse'].some(k=>genericClasses.has(p[k]))&&(!name||norm(name)===norm(place.name))&&polygonArea(f.geometry)>=200&&polygonArea(f.geometry)<=60000;
 }).sort((a,b)=>polygonArea(a.geometry)-polygonArea(b.geometry));
 return candidates[0]||null;
}
function installCivicSiteIdentity(map,ids){
 if(!ids.length||!map.on||!map.queryRenderedFeatures||!map.setFeatureState||!map.project||installedMaps.has(map))return;
 installedMaps.add(map);const applied=new Set();
 function refresh(){
  if(map.isMoving?.()||(map.getZoom?.()??0)<15)return;
  for(const place of IMPORTANT_PLACES.filter(p=>p.type==='공공기관')){
   const point=map.project([place.lng,place.lat]);
   const canvas=map.getCanvas?.();if(!canvas||point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)continue;
   try{
    const f=civicParcelCandidate(map.queryRenderedFeatures(point,{layers:ids.filter(id=>map.getLayer(id))}),place);
    if(!f)continue;
    const source=f.source||f.layer?.source,sourceLayer=f.sourceLayer||f.layer?.['source-layer'];if(!source||!sourceLayer)continue;
    const key=source+'|'+sourceLayer+'|'+f.id;if(applied.has(key))continue;
    map.setFeatureState({source,sourceLayer,id:f.id},{verifiedCivicSite:true});applied.add(key);
   }catch{}
  }
 }
 map.on('idle',refresh);map.on('style.load',()=>applied.clear());refresh();
}
