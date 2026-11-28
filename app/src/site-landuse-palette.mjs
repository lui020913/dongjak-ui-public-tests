// Use mapped site/landuse polygons only; no synthetic lots or building recoloring.
import {IMPORTANT_PLACES} from './important-place-click.js';
export const SITE_LANDUSE_PALETTE=Object.freeze({
 light:Object.freeze({residential:'#ddd4c8',commercial:'#f0e5cb',education:'#dbe6ee',industrial:'#e0dce6',hospital:'#f3dfda',public:'#d1d1cd'})
});
const PREFIX='dj-site-use-fill-';
export const CIVIC_PARCEL_SOURCE='dj-verified-civic-parcels',CIVIC_PARCEL_LAYER='dj-verified-civic-parcels-fill';
// Prefer specific institutional uses over generic mixed-use classifications.
const groups=[
 ['hospital',['hospital','clinic','healthcare','medical','medical_centre','doctors']],
 ['public',['public','civic','government','governmental','public_building','public_service','townhall','town_hall','city_hall','government_office','administration','municipal','municipal_office','police','police_station','police_substation','police_box','fire_station','fire_substation','courthouse','community_centre','community_center','library','post','post_office','social_facility','welfare','nursing_home','senior_centre','senior_center','health_centre','health_center','administrative','public_facility','government_building','government_service','public_administration','public_office','tax_office','public_library','community_hall','civic_centre','civic_center','public_health','public_safety','rescue_station','public_utility']],
 ['education',['school','college','university','kindergarten','childcare','education','educational']],
 ['commercial',['commercial','retail','shopping','marketplace']],
 ['industrial',['industrial','warehouse']],
 ['residential',['apartments','apartment','apartment_complex','residential_complex','housing_estate','housing_complex']]
];
const anyTag=values=>['any',...['class','subclass','type','amenity','landuse','healthcare','office','building'].map(k=>['in',['coalesce',['get',k],''],['literal',values]])];
const civicNames=['동작구청','동작구청사','동작구청 신청사','동작구청신청사','동작구보건소','동작구정신건강복지센터','동작도서관','서울지방병무청','동작청소년경찰학교'];
const civicSuffixes=['구청','시청','군청','구청사','구의회','시의회','주민센터','행정복지센터','보건소','보건지소','경찰서','지구대','파출소','소방서','119안전센터','우체국','도서관','복지센터','복지관','세무서','병무청','등기소','법원','검찰청','공공청사','행정타운'];
const publicName=['any',...['name:ko','name:nonlatin','name','name_ko'].map(k=>['any',['in',['coalesce',['get',k],''],['literal',civicNames]],...civicSuffixes.map(suffix=>['==',['slice',['coalesce',['get',k],''],-suffix.length],suffix])])];
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
 if(map.getLayer?.(CIVIC_PARCEL_LAYER)&&map.getLayoutProperty?.(CIVIC_PARCEL_LAYER,'visibility')!==visibility)map.setLayoutProperty?.(CIVIC_PARCEL_LAYER,'visibility',visibility);
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
 installCivicSiteIdentity(map,app,ids,[...sources.values()],before);
 return ids;
}

// Use original mapped landuse polygons, including tiles without feature IDs.
// The separate overlay has its own stable GeoJSON source, so a tile refresh
// cannot reset a civic parcel to the commercial color.
const installedMaps=new WeakSet();
const genericClasses=new Set(['commercial','retail','shopping','marketplace','office','institutional','mixed_use','administrative','public_service']);
const civicClasses=new Set(groups[1][1]);
const norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,'');
const publicSuffix=new RegExp('(?:'+civicSuffixes.join('|')+')
const featureName=p=>p['name:ko']||p['name:nonlatin']||p.name_ko||p.name||'';
function polygons(g){return g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];}
function polygonArea(g){
 let total=0;
 for(const poly of polygons(g)){const r=poly[0]||[],o=r[0];if(!o)continue;let a=0;for(let i=1;i<r.length;i++){const p=r[i-1],q=r[i];a+=(p[0]-o[0])*(q[1]-o[1])-(q[0]-o[0])*(p[1]-o[1]);}total+=Math.abs(a)*88300*111320/2;}
 return total;
}
function ringContains(r,x,y){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function containsAnchor(g,place){return polygons(g).some(poly=>ringContains(poly[0]||[],place.lng,place.lat)&&!poly.slice(1).some(r=>ringContains(r,place.lng,place.lat)));}
function matchingCivicName(name,place){
 const a=norm(name),b=norm(place.name);
 if(a===b)return true;
 return b==='동작구청'&&['동작구청사','동작구청신청사','장승배기종합행정타운','동작구종합행정타운','동작구청(신청사)'].includes(a);
}
export function civicParcelCandidate(features,place){
 const hasPoint=Number.isFinite(place.lng)&&Number.isFinite(place.lat);
 const candidates=(features||[]).filter(f=>{
  const p=f.properties||{},name=featureName(p),area=polygonArea(f.geometry);
  const typeMatch=['class','subclass','landuse','amenity','office','type'].some(k=>genericClasses.has(p[k])||civicClasses.has(p[k]));
  const namedMatch=Boolean(name)&&matchingCivicName(name,place)&&isNamedCivic(name);
  return (hasPoint?containsAnchor(f.geometry,place):f.id!=null)&&(typeMatch||namedMatch)&&(!name||matchingCivicName(name,place))&&area>=200&&area<=60000;
 }).sort((a,b)=>Number(matchingCivicName(featureName(b.properties||{}),place))-Number(matchingCivicName(featureName(a.properties||{}),place))||polygonArea(a.geometry)-polygonArea(b.geometry));
 return candidates[0]||null;
}
export function civicParcelFeature(feature,place){
 if(!feature||!civicParcelCandidate([feature],place))return null;
 return {type:'Feature',geometry:feature.geometry,properties:{name:place.name,source:'existing mapped landuse / civic identity'}};
}
function installCivicSiteIdentity(map,app,ids,sources,before){
 if(!ids.length||!map.on||!map.queryRenderedFeatures||!map.project||!map.addSource||!map.getSource||installedMaps.has(map))return;
 installedMaps.add(map);const cached=new Map(),official=new Map();let dirty=true,last='';
 function setup(){
  if(!map.getSource(CIVIC_PARCEL_SOURCE))map.addSource(CIVIC_PARCEL_SOURCE,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  if(!map.getLayer(CIVIC_PARCEL_LAYER))map.addLayer({id:CIVIC_PARCEL_LAYER,type:'fill',source:CIVIC_PARCEL_SOURCE,minzoom:13.2,layout:{visibility:app?.dataset?.sangdoNight==='on'?'none':'visible'},paint:{'fill-color':SITE_LANDUSE_PALETTE.light.public,'fill-opacity':1,'fill-antialias':true}},before&&map.getLayer(before)?before:undefined);
 }
 function refresh(){
  if(!dirty||map.isMoving?.()||(map.getZoom?.()??0)<13.2)return;
  dirty=false;const canvas=map.getCanvas?.();if(!canvas)return;
  try{setup();}catch(error){dirty=true;return;}
  let raw=null;
  const poi=[];
  for(const src of sources)try{poi.push(...(map.querySourceFeatures?.(src.source,{sourceLayer:'poi'})||[]));}catch{}
  const anchors=[...IMPORTANT_PLACES.filter(p=>p.type==='공공기관'),...official.values(),...poi.flatMap(f=>{
   const p=f.properties||{},name=featureName(p);if(f.geometry?.type!=='Point'||!name||(!isNamedCivic(name)&&!['class','subclass','amenity','office'].some(k=>civicClasses.has(p[k]))))return [];
   const [lng,lat]=f.geometry.coordinates;return [{name,lng,lat}];
  })];
  const anchorKeys=new Set();
  for(const place of anchors){
   if(!Number.isFinite(place.lng)||!Number.isFinite(place.lat))continue;
   const key=norm(place.name)+'|'+place.lng.toFixed(4)+'|'+place.lat.toFixed(4);if(anchorKeys.has(key))continue;anchorKeys.add(key);
   const point=map.project([place.lng,place.lat]);if(point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)continue;
   try{
    let f=civicParcelCandidate(map.queryRenderedFeatures(point,{layers:ids.filter(id=>map.getLayer(id))}),place);
    // Some landuse tiles do not expose a rendered feature ID or are covered
    // by a building; use their unchanged source geometry as a fallback.
    if(!f){if(raw===null){raw=[];for(const src of sources)try{raw.push(...(map.querySourceFeatures?.(src.source,{sourceLayer:src['source-layer']})||[]));}catch{}}f=civicParcelCandidate(raw,place);}
    const next=civicParcelFeature(f,place);if(!next)continue;
    const old=cached.get(key);if(!old||polygonArea(next.geometry)>polygonArea(old.geometry)*1.05)cached.set(key,next);
   }catch(error){console.debug('[공공시설 부지]',error?.message);}
  }
  const features=[...new Map([...cached.values()].map(f=>[JSON.stringify(f.geometry),f])).values()];
  const signature=JSON.stringify(features);if(signature!==last){map.getSource(CIVIC_PARCEL_SOURCE)?.setData({type:'FeatureCollection',features});last=signature;}
 }
 map.on('moveend',()=>{dirty=true;});
 map.on('sourcedata',e=>{if(e.sourceId!==CIVIC_PARCEL_SOURCE&&sources.some(s=>s.source===e.sourceId)&&e.isSourceLoaded)dirty=true;});
 map.on('idle',refresh);
 map.on('style.load',()=>{last='';dirty=true;});
 app?.addEventListener?.('dongjak:official-facilities-ready',event=>{
  for(const p of event.detail||[])if(civicCategories.has(p.category)&&p.name)official.set(norm(p.name),p);
  dirty=true;if(!map.isMoving?.())refresh();
 });
 refresh();
}
);
const isNamedCivic=name=>civicNames.some(n=>norm(n)===norm(name))||publicSuffix.test(norm(name));
const civicCategories=new Set(['공공기관','공공시설','경찰서','소방서','도서관','우체국','주민시설','복지시설','보건소','행정기관','공공청사']);
const featureName=p=>p['name:ko']||p['name:nonlatin']||p.name_ko||p.name||'';
function polygons(g){return g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];}
function polygonArea(g){
 let total=0;
 for(const poly of polygons(g)){const r=poly[0]||[],o=r[0];if(!o)continue;let a=0;for(let i=1;i<r.length;i++){const p=r[i-1],q=r[i];a+=(p[0]-o[0])*(q[1]-o[1])-(q[0]-o[0])*(p[1]-o[1]);}total+=Math.abs(a)*88300*111320/2;}
 return total;
}
function ringContains(r,x,y){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function containsAnchor(g,place){return polygons(g).some(poly=>ringContains(poly[0]||[],place.lng,place.lat)&&!poly.slice(1).some(r=>ringContains(r,place.lng,place.lat)));}
function matchingCivicName(name,place){
 const a=norm(name),b=norm(place.name);
 if(a===b)return true;
 return b==='동작구청'&&['동작구청사','동작구청신청사','장승배기종합행정타운','동작구종합행정타운','동작구청(신청사)'].includes(a);
}
export function civicParcelCandidate(features,place){
 const hasPoint=Number.isFinite(place.lng)&&Number.isFinite(place.lat);
 const candidates=(features||[]).filter(f=>{
  const p=f.properties||{},name=featureName(p),area=polygonArea(f.geometry);
  const typeMatch=['class','subclass','landuse','amenity','office','type'].some(k=>genericClasses.has(p[k])||civicClasses.has(p[k]));
  return (hasPoint?containsAnchor(f.geometry,place):f.id!=null)&&typeMatch&&(!name||matchingCivicName(name,place))&&area>=200&&area<=60000;
 }).sort((a,b)=>Number(matchingCivicName(featureName(b.properties||{}),place))-Number(matchingCivicName(featureName(a.properties||{}),place))||polygonArea(a.geometry)-polygonArea(b.geometry));
 return candidates[0]||null;
}
export function civicParcelFeature(feature,place){
 if(!feature||!civicParcelCandidate([feature],place))return null;
 return {type:'Feature',geometry:feature.geometry,properties:{name:place.name,source:'existing mapped landuse / civic identity'}};
}
function installCivicSiteIdentity(map,app,ids,sources,before){
 if(!ids.length||!map.on||!map.queryRenderedFeatures||!map.project||!map.addSource||!map.getSource||installedMaps.has(map))return;
 installedMaps.add(map);const cached=new Map(),official=new Map();let dirty=true,last='';
 function setup(){
  if(!map.getSource(CIVIC_PARCEL_SOURCE))map.addSource(CIVIC_PARCEL_SOURCE,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  if(!map.getLayer(CIVIC_PARCEL_LAYER))map.addLayer({id:CIVIC_PARCEL_LAYER,type:'fill',source:CIVIC_PARCEL_SOURCE,minzoom:13.2,layout:{visibility:app?.dataset?.sangdoNight==='on'?'none':'visible'},paint:{'fill-color':SITE_LANDUSE_PALETTE.light.public,'fill-opacity':1,'fill-antialias':true}},before&&map.getLayer(before)?before:undefined);
 }
 function refresh(){
  if(!dirty||map.isMoving?.()||(map.getZoom?.()??0)<13.2)return;
  dirty=false;const canvas=map.getCanvas?.();if(!canvas)return;
  try{setup();}catch(error){dirty=true;return;}
  let raw=null;
  const poi=[];
  for(const src of sources)try{poi.push(...(map.querySourceFeatures?.(src.source,{sourceLayer:'poi'})||[]));}catch{}
  const anchors=[...IMPORTANT_PLACES.filter(p=>p.type==='공공기관'),...official.values(),...poi.flatMap(f=>{
   const p=f.properties||{},name=featureName(p);if(f.geometry?.type!=='Point'||!publicSuffix.test(norm(name))||!['class','subclass','amenity','office'].some(k=>civicClasses.has(p[k])))return [];
   const [lng,lat]=f.geometry.coordinates;return [{name,lng,lat}];
  })];
  const anchorKeys=new Set();
  for(const place of anchors){
   if(!Number.isFinite(place.lng)||!Number.isFinite(place.lat))continue;
   const key=norm(place.name)+'|'+place.lng.toFixed(4)+'|'+place.lat.toFixed(4);if(anchorKeys.has(key))continue;anchorKeys.add(key);
   const point=map.project([place.lng,place.lat]);if(point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)continue;
   try{
    let f=civicParcelCandidate(map.queryRenderedFeatures(point,{layers:ids.filter(id=>map.getLayer(id))}),place);
    // Some landuse tiles do not expose a rendered feature ID or are covered
    // by a building; use their unchanged source geometry as a fallback.
    if(!f){if(raw===null){raw=[];for(const src of sources)try{raw.push(...(map.querySourceFeatures?.(src.source,{sourceLayer:src['source-layer']})||[]));}catch{}}f=civicParcelCandidate(raw,place);}
    const next=civicParcelFeature(f,place);if(!next)continue;
    const old=cached.get(key);if(!old||polygonArea(next.geometry)>polygonArea(old.geometry)*1.05)cached.set(key,next);
   }catch(error){console.debug('[공공시설 부지]',error?.message);}
  }
  const features=[...new Map([...cached.values()].map(f=>[JSON.stringify(f.geometry),f])).values()];
  const signature=JSON.stringify(features);if(signature!==last){map.getSource(CIVIC_PARCEL_SOURCE)?.setData({type:'FeatureCollection',features});last=signature;}
 }
 map.on('moveend',()=>{dirty=true;});
 map.on('sourcedata',e=>{if(e.sourceId!==CIVIC_PARCEL_SOURCE&&sources.some(s=>s.source===e.sourceId)&&e.isSourceLoaded)dirty=true;});
 map.on('idle',refresh);
 map.on('style.load',()=>{last='';dirty=true;});
 app?.addEventListener?.('dongjak:official-facilities-ready',event=>{
  for(const p of event.detail||[])if(['공공기관','공공시설','경찰서','소방서','도서관','우체국','주민시설','복지시설'].includes(p.category)&&publicSuffix.test(norm(p.name)))official.set(norm(p.name),p);
  dirty=true;if(!map.isMoving?.())refresh();
 });
 refresh();
}
