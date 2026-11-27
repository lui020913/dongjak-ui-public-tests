// Use mapped site/landuse polygons only; no synthetic lots or building recoloring.
export const SITE_LANDUSE_PALETTE=Object.freeze({
 light:Object.freeze({residential:'#b58b68',commercial:'#f0e5cb',education:'#dbe6ee',industrial:'#e0dce6',hospital:'#f3dfda',public:'#d8e8e3'})
});
const PREFIX='dj-site-use-fill-';
// Prefer specific institutional uses over generic mixed-use classifications.
const groups=[
 ['hospital',['hospital','clinic','healthcare','medical','medical_centre','doctors']],
 ['public',['public','civic','government','governmental','public_building','public_service','townhall','police','fire_station','courthouse','community_centre','community_center','library','post_office','social_facility','administrative','public_facility']],
 ['education',['school','college','university','kindergarten','childcare','education','educational']],
 ['commercial',['commercial','retail','shopping','marketplace']],
 ['industrial',['industrial','warehouse']],
 ['residential',['apartments','apartment','apartment_complex','residential_complex','housing_estate','housing_complex']]
];
const anyTag=values=>['any',...['class','subclass','type','amenity','landuse','healthcare','office'].map(k=>['in',['coalesce',['get',k],''],['literal',values]])];
const filter=['any',...groups.map(([,values])=>anyTag(values))];
export function siteLandusePaint(){
 const palette=SITE_LANDUSE_PALETTE.light;
 return ['case',...groups.flatMap(([kind,values])=>[anyTag(values),palette[kind]]),'rgba(0,0,0,0)'];
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
  map.addLayer({id,type:'fill',...src,minzoom:13.2,filter,layout:{visibility:app?.dataset?.sangdoNight==='on'?'none':'visible'},paint:{'fill-color':siteLandusePaint(),'fill-opacity':.88,'fill-antialias':true}},before);
 }
 return ids;
}
