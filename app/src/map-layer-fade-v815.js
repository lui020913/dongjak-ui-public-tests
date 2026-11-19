/**
 * Fade only opt-in GeoJSON data overlays, never the basemap/road labels.
 * Keep visibility visible until opacity reaches zero, then set it to none.
 * MapLibre handles the paint transition on the GPU. Timers are guarded by a
 * generation counter so rapid off->on cannot hide an active layer later.
 */
export const DATA_LAYER_FADE_MS = 280;
const OPACITY_PROPERTIES = {
  fill:['fill-opacity'],
  line:['line-opacity'],
  circle:['circle-opacity','circle-stroke-opacity'],
  symbol:['icon-opacity','text-opacity'],
  'fill-extrusion':['fill-extrusion-opacity'],
  raster:['raster-opacity'],
  heatmap:['heatmap-opacity']
};
const nativeReducedMotion = () => {
  try {
    return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      globalThis.document?.getElementById?.('app')?.classList?.contains?.('dj-reduced-animation'));
  }
  catch { return false; }
};
export function createDataLayerFader(map, { duration=DATA_LAYER_FADE_MS, reduceMotion=nativeReducedMotion }={}) {
  const states=new Map();
  function apply(layerId, visible) {
    const layer=map.getLayer?.(layerId);
    if(!layer)return;
    const type=layer.type;
    const props=OPACITY_PROPERTIES[type];
    let state=states.get(layerId);
    if(!state){state={generation:0, originals:new Map(), hidden:true, timer:null};states.set(layerId,state);}
    state.generation++;
    const generation=state.generation;
    if(state.timer){clearTimeout(state.timer);state.timer=null;}
    // An already hidden layer must stay hidden; do not schedule a fade-out
    // that could cause a fast following 'show' to miss its visibility update.
    if(!visible && state.hidden){
      map.setLayoutProperty?.(layerId,'visibility','none');
      return;
    }
    const immediate=duration===0 || reduceMotion() || !props || typeof map.setPaintProperty!=='function';
    if(immediate){
      if(props&&typeof map.setPaintProperty==='function'){
        for(const p of props){
          if(!state.originals.has(p))state.originals.set(p,map.getPaintProperty?.(layerId,p)??1);
          try{map.setPaintProperty(layerId,p,state.originals.get(p));}catch{}
        }
      }
      map.setLayoutProperty?.(layerId,'visibility',visible?'visible':'none');
      state.hidden=!visible;
      return;
    }
    const setOpacity=(value)=>{
      for(const p of props){
        if(!state.originals.has(p))state.originals.set(p,map.getPaintProperty?.(layerId,p)??1);
        try{map.setPaintProperty(layerId,`${p}-transition`,{duration,delay:0});}catch{}
        try{map.setPaintProperty(layerId,p,value==='original'?state.originals.get(p):0);}catch{}
      }
    };
    if(visible){
      // Reset from a fully transparent state when initially hidden. When a
      // fade-out is interrupted, preserve its current transition instead.
      if(state.hidden){
        setOpacity(0);
        map.setLayoutProperty?.(layerId,'visibility','visible');
      }
      state.hidden=false;
      const timer=setTimeout(()=>{
        if(state.generation!==generation)return;
        setOpacity('original');
        state.timer=null;
      },16);
      timer.unref?.();state.timer=timer;
    }else{
      state.hidden=false;
      setOpacity(0);
      const timer=setTimeout(()=>{
        if(state.generation!==generation)return;
        map.setLayoutProperty?.(layerId,'visibility','none');
        state.hidden=true;state.timer=null;
      },duration+25);
      timer.unref?.();state.timer=timer;
    }
  }
  return {apply};
}
