// Keep PRI lines above every opaque/map-covering layer, while preserving labels and transit pins.
const COVER_TYPES=new Set(['background','raster','fill','fill-extrusion','hillshade','heatmap']);
const PRI_IDS=new Set(['dj-pri-line','dj-pri-point','dj-pri-speed-line','dj-pri-candidate-line','dj-pri-boundary-line']);
// Native road surfaces and casings are opaque line paints too. A white
// transportation stroke above an analysis line can cut it at junctions.
// Keep application route/transit overlays independent from native roads.
const nativeRoadPaint=layer=>layer?.type==='line'&&
 /^(transportation|road|roads)$/.test(String(layer['source-layer']||''))&&
 !/(rail|subway|tram|ferry|aerialway)/i.test(String(layer.id||''));
const isCover=layer=>layer && (COVER_TYPES.has(layer.type)||nativeRoadPaint(layer)) && !PRI_IDS.has(layer.id);
export function priOverlayAnchor(layers=[]){
 if(!Array.isArray(layers))return undefined;
 const others=layers.filter(l=>l?.id&&!PRI_IDS.has(l.id));
 let afterCover=0;
 for(let i=0;i<others.length;i++)if(isCover(others[i]))afterCover=i+1;
 return others[afterCover]?.id;
}
export function priCoveredByMapLayer(layers=[],id){
 if(!Array.isArray(layers))return false;
 const index=layers.findIndex(l=>l?.id===id);
 return index>=0&&layers.some((layer,i)=>i>index&&isCover(layer));
}
