// Keep PRI lines above every opaque/map-covering layer, while preserving labels and transit pins.
const COVER_TYPES=new Set(['background','raster','fill','fill-extrusion','hillshade','heatmap']);
const PRI_IDS=new Set(['dj-pri-line','dj-pri-point','dj-pri-speed-line','dj-pri-unknown-casing','dj-pri-candidate-line','dj-pri-boundary-casing','dj-pri-boundary-line','dj-pri-visual-joins']);
const isCover=layer=>layer && COVER_TYPES.has(layer.type) && !PRI_IDS.has(layer.id);
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
