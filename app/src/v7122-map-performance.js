/** Adaptive performance during *user drag* of pitched 3D maps on desktop.
 * Temporarily hide only our heavy supplemental 3D buildings after measured
 * slow frames. Restores only previously visible layers at end of interaction.
 * Never caps frame rate, disables DEM, or affects mobile / ordinary flyTo.
 */
export function installAdaptiveMapPerformance({map,app,matchMedia=globalThis.matchMedia,now=()=>performance.now()}={}){
  if(!map?.on||!app)return ()=>{};
  const desktop=()=>typeof matchMedia==='function'&&matchMedia('(min-width:1080px) and (pointer:fine)').matches;
  let dragging=false,previous=0,slow=0,paused=false;
  const hidden=new Map();
  const is3D=id=>/^dongjak-buildings-3d-/.test(id);
  function pauseHeavyBuildings(){
    if(paused||!dragging||!desktop()||map.getPitch()<12)return;
    for(const layer of map.getStyle?.()?.layers||[]){
      if(!is3D(layer.id)||!map.getLayer?.(layer.id))continue;
      if(map.getLayoutProperty?.(layer.id,'visibility')!=='none'){
        map.setLayoutProperty?.(layer.id,'visibility','none');hidden.set(layer.id,'visible');
      }
    }
    paused=hidden.size>0;
    app.dataset.djInteractive3d=paused?'reduced':'normal';
  }
  function restore(){
    if(!dragging&&!paused&&hidden.size===0)return;
    dragging=false;previous=0;slow=0;
    for(const [id,visibility] of hidden){
      if(!map.getLayer?.(id))continue;
      try{map.setLayoutProperty?.(id,'visibility',visibility);}catch{}
    }
    hidden.clear();paused=false;
    app.dataset.djInteractive3d='normal';
  }
  function onDragStart(){dragging=desktop();previous=0;slow=0;}
  function onRender(){
    if(!dragging||paused)return;
    const stamp=now();
    if(previous){
      const ms=stamp-previous;
      if(ms>27&&ms<250)slow++;else slow=Math.max(0,slow-1);
      if(slow>=3)pauseHeavyBuildings();
    }
    previous=stamp;
  }
  map.on('dragstart',onDragStart);
  map.on('render',onRender);
  map.on('moveend',restore);
  map.on('style.load',restore);
  return ()=>{map.off?.('dragstart',onDragStart);map.off?.('render',onRender);map.off?.('moveend',restore);map.off?.('style.load',restore);restore();};
}
