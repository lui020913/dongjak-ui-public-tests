// Use mapped site/landuse polygons only; no synthetic lots or building recoloring.
export const SITE_LANDUSE_PALETTE=Object.freeze({
 light:Object.freeze({residential:'#e9e0d2',commercial:'#eadcda',education:'#dbe6ee',industrial:'#e0dce6'}),
 dark:Object.freeze({residential:'#3a3733',commercial:'#43363a',education:'#303e4b',industrial:'#3c3646'})
});
const PREFIX='dj-site-use-fill-';
const groups=[
 ['education',['school','college','university','kindergarten','childcare','education','educational']],
 ['commercial',['commercial','retail','shopping','marketplace']],
 ['industrial',['industrial','warehouse']],
 ['residential',['residential','apartments','apartment','housing']]
];
const anyTag=values=>['any',...['class','subclass','type','amenity','landuse'].map(k=>['in',['coalesce',['get',k],''],['literal',values]])];
const filter=['any',...groups.map(([,values])=>anyTag(values))];
export function siteLandusePaint(theme='light'){
 const palette=SITE_LANDUSE_PALETTE[theme==='dark'?'dark':'light'];
 return ['case',...groups.flatMap(([kind,values])=>[anyTag(values),palette[kind]]),'rgba(0,0,0,0)'];
}
export function repaintSiteLanduse(map,app){
 const paint=siteLandusePaint(app?.dataset?.theme==='dark'||app?.dataset?.sangdoNight==='on'?'dark':'light');
 for(const l of map.getStyle?.()?.layers||[])if(l.id.startsWith(PREFIX)){
  try{if(JSON.stringify(map.getPaintProperty(l.id,'fill-color'))!==JSON.stringify(paint))map.setPaintProperty(l.id,'fill-color',paint);}catch{}
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
  map.addLayer({id,type:'fill',...src,minzoom:13.2,filter,paint:{'fill-color':siteLandusePaint(app?.dataset?.theme),'fill-opacity':.88,'fill-antialias':true}},before);
 }
 return ids;
}
