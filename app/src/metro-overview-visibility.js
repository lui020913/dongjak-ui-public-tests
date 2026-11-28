import {LOCAL_RAIL_LINE_IDS,cityRailOwnsBackground} from './city-transit-rail.mjs';
/**
 * Responsive metro overview visibility.
 *
 * MapLibre constrains a wide desktop viewport to a higher effective minimum zoom
 * when maxBounds is set. An absolute minzoom (e.g. 12.2) consequently cannot
 * guarantee "hide the subway at maximum zoom-out" on both desktop and mobile.
 * The boundary below combines the normal cartographic threshold with the
 * theoretical minimum camera zoom imposed by maxBounds and viewport geometry.
 */
export const METRO_OVERVIEW_ABSOLUTE_CUTOFF=12.2;
export const METRO_OVERVIEW_MIN_ZOOM_BUFFER=0.46;

export const METRO_OVERVIEW_LAYERS=Object.freeze([
  'transport-schematic-subway-casing',
  'transport-schematic-subway',
  // The duplicate OSM overview is intentionally hidden by liveTransit/integrate.js.
  // Do not turn it back on during zoom or layer-preference changes.
  'dj-metro-summary-mobile-hubs-icon',
  'dj-metro-summary-icon',
  'dj-metro-summary-name',
  'dj-metro-detail-icon',
  'dj-metro-detail-name',
  'dj-metro-detail-name-very-close'
]);

function geographicBounds(raw){
  if(!raw)return null;
  if(Array.isArray(raw)&&raw.length===2){
    const [sw,ne]=raw;
    if(sw?.length>=2&&ne?.length>=2)return {w:Number(sw[0]),s:Number(sw[1]),e:Number(ne[0]),n:Number(ne[1])};
  }
  if(typeof raw.getWest==='function')return {
    w:raw.getWest(),s:raw.getSouth(),e:raw.getEast(),n:raw.getNorth()
  };
  return null;
}
function mercatorFraction(lat){
  const phi=Math.max(-85.051129,Math.min(85.051129,lat))*Math.PI/180;
  return (1-Math.log(Math.tan(Math.PI/4+phi/2))/Math.PI)/2;
}

/** Minimum zoom at which the entire constrained geographic bounds fit into the viewport. */
export function minimumZoomForBounds(bounds,width,height){
  const b=geographicBounds(bounds);
  if(!b||![b.w,b.s,b.e,b.n,width,height].every(Number.isFinite)||width<=0||height<=0 ||
     b.e<=b.w||b.n<=b.s)return null;
  const lonSpan=(b.e-b.w)/360;
  const mercSpan=Math.abs(mercatorFraction(b.s)-mercatorFraction(b.n));
  if(lonSpan<=0||mercSpan<=0)return null;
  return Math.max(Math.log2(width/(512*lonSpan)),Math.log2(height/(512*mercSpan)));
}

export function responsiveMetroCutoff({bounds,width,height,absoluteCutoff=METRO_OVERVIEW_ABSOLUTE_CUTOFF,
  margin=METRO_OVERVIEW_MIN_ZOOM_BUFFER}={}){
  const effectiveMin=minimumZoomForBounds(bounds,width,height);
  return Number.isFinite(effectiveMin)?Math.max(absoluteCutoff,effectiveMin+margin):absoluteCutoff;
}

/** Returns the effective visibility decision; exported for tests. */
export function metroVisibleAtZoom({zoom,bounds,width,height,enabled=true}={}){
  return enabled && Number(zoom)>=responsiveMetroCutoff({bounds,width,height});
}

/**
 * All map-size variants call the same zoom rule. Existing MapLibre minzoom/maxzoom
 * on individual layers remain in effect; we only control extra visibility.
 */
export function installResponsiveMetroVisibility({map,app}={}){
  if(!map?.getZoom||!map?.getContainer)return ()=>{};
  let disposed=false,cutoff=METRO_OVERVIEW_ABSOLUTE_CUTOFF,lastDecision='',dirty=false;
  function applyVisibility(){
    if(disposed)return;
    const transitActive=app?.dataset?.djTransitExterior==='true';
    const cityOwns=cityRailOwnsBackground(map,transitActive);
    const enabled=transitActive||app?.dataset?.baseMetro!=='off';
    const visible=enabled&&Number(map.getZoom())>=cutoff;
    const decision=(cityOwns?'city':'local')+'|'+visible;
    // A zoom frame within the same visibility band never needs a DOM read
    // or a per-layer layout lookup. Threshold crossings remain immediate.
    if(decision===lastDecision)return;
    lastDecision=decision;
    for(const id of METRO_OVERVIEW_LAYERS){
      const desired=cityOwns&&LOCAL_RAIL_LINE_IDS.includes(id)?'none':visible?'visible':'none';
      if(!map.getLayer?.(id))continue;
      try{
        const current=map.getLayoutProperty?.(id,'visibility')||'visible';
        if(current!==desired)map.setLayoutProperty?.(id,'visibility',desired);
      }catch(error){console.debug('[지하철 광역 가시성]',id,error);}
    }
  }
  function sync(){
    if(disposed)return;
    const container=map.getContainer();
    const width=container?.clientWidth||container?.getBoundingClientRect?.().width||0;
    const height=container?.clientHeight||container?.getBoundingClientRect?.().height||0;
    cutoff=responsiveMetroCutoff({bounds:map.getMaxBounds?.(),width,height});
    lastDecision='';dirty=false;applyVisibility();
  }
  const invalidate=()=>{dirty=true;};
  const reconcile=()=>{if(dirty&&!map.isMoving?.())sync();};
  const syncAfterPreferences=()=>queueMicrotask(sync);
  map.on?.('zoom',applyVisibility);
  map.on?.('resize',sync);
  map.on?.('moveend',sync);
  map.on?.('style.load',sync);
  map.on?.('styledata',invalidate);
  map.on?.('idle',reconcile);
  if(typeof document!=='undefined')document.addEventListener('dongjak-base-layer-change',syncAfterPreferences);
  if(typeof window!=='undefined')window.addEventListener('dongjak:transit-stream-scope',syncAfterPreferences);
  sync();
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(sync);
  return ()=>{
    disposed=true;
    map.off?.('zoom',applyVisibility);map.off?.('resize',sync);map.off?.('moveend',sync);
    map.off?.('style.load',sync);map.off?.('styledata',invalidate);map.off?.('idle',reconcile);
    if(typeof document!=='undefined')document.removeEventListener('dongjak-base-layer-change',syncAfterPreferences);
    if(typeof window!=='undefined')window.removeEventListener('dongjak:transit-stream-scope',syncAfterPreferences);
  };
}
