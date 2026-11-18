/**
 * Perspective haze for MapLibre GL JS 6.
 * MapLibre's built-in sky fog is nearly invisible below ~60 degrees pitch.
 * We therefore blend distant SCREEN pixels with a graduated, non-interactive
 * CSS overlay above the map (but below ordinary app controls), in addition to
 * the engine fog near the actual horizon. The whole overlay disappears in 2D.
 */
export const FOG_ENABLE_PITCH = 28;
export const FOG_DISABLE_PITCH = 22;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function makeDistantHazeSky(theme='light',strong=false){
  const dark=theme==='dark';
  return {
    'sky-color': dark?'#142b31':'#f0f6f3',
    'horizon-color': dark?'#243c40':'#e2ece8',
    'fog-color': dark?'#253c40':'#e0ebe8',
    'fog-ground-blend': strong?0.92:0.74,
    'horizon-fog-blend': strong?0.91:0.78,
    'sky-horizon-blend':0.62,
    'atmosphere-blend':strong?0.83:0.68
  };
}
/**
 * Screen-space haze is a desktop-only enhancement. Mobile Safari/PWA draws
 * the overlay above the upper map and can make the search/header edge appear
 * milky even when backdrop-filter is explicitly disabled in CSS.
 * Keep MapLibre's native sky fog on mobile but do not create its CSS overlay.
 */
export function shouldRenderScreenHaze(mediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? query => window.matchMedia(query)
  : null) {
  if (typeof mediaQuery !== 'function') return true; // non-browser unit tests
  try { return !mediaQuery('(max-width: 1079px)')?.matches; }
  catch { return true; }
}

/**
 * Opacity intentionally depends on pitch rather than zoom alone: the near
 * ground remains unmasked even when zoomed far out on a flat map.
 */
export function farHazeOpacity(pitch,zoom=12){
  if(!Number.isFinite(pitch)||pitch<=FOG_DISABLE_PITCH)return 0;
  const angle=clamp((pitch-FOG_DISABLE_PITCH)/23,0,1);
  const detail=zoom>=16?0.52:zoom>=14.5?0.72:1;
  return Math.round(1000*angle*detail)/1000;
}
export function installDistantHaze({map,app,themeButton}={}){
  if(!map)return {sync(){},isActive:()=>false};
  let mode='flat',lastTheme='',active=false,originalSky;
  try{originalSky=map.getSky?.();}catch{originalSky=undefined;}
  const screen=map.getContainer?.() || (typeof document!=='undefined'?document.getElementById('map'):null);
  const getTheme=()=>app?.dataset?.theme==='dark'?'dark':'light';
  const sync=()=>{
    const pitch=Number(map.getPitch?.()??0);
    const zoom=Number(map.getZoom?.()??12);
    // Screen and native horizon fog are disabled on compact/mobile viewports:
    // the iPhone PWA top edge must not acquire a milky gradient on tilt.
    const isCompact=typeof window!=='undefined' && window.matchMedia?.('(max-width: 1079px)')?.matches;
    const desired=isCompact ? 'flat' : mode==='flat'
      ? pitch>=FOG_ENABLE_PITCH ? (pitch>=52?'strong':'normal') : 'flat'
      : pitch<=FOG_DISABLE_PITCH ? 'flat' : pitch>=52?'strong':'normal';
    const theme=getTheme();
    const visible=desired!=='flat';
    // Prevent mobile CSS scrims entirely (even if an older rule is cached).
    // The native sky effect still runs below, independently of this class.
    if(screen?.classList){
      const screenHazeVisible=visible&&shouldRenderScreenHaze();
      screen.classList.toggle('dj-far-haze-active',screenHazeVisible);
      const opacity=screenHazeVisible?farHazeOpacity(pitch,zoom):0;
      const rounded=opacity.toFixed(3);
      if(screen.style.getPropertyValue('--dj-far-haze-opacity')!==rounded)
        screen.style.setProperty('--dj-far-haze-opacity',rounded);
    }
    if(desired===mode&&lastTheme===theme){active=visible;return;}
    const wasActive=active;
    mode=desired;
    lastTheme=theme;
    active=visible;
    if(typeof map.setSky==='function'){
      try{
        if(!visible){if(wasActive)map.setSky(originalSky);}
        else map.setSky(makeDistantHazeSky(theme,mode==='strong'));
      }catch(error){
        // Mobile deliberately has no screen-space fallback: avoid milky UI.
        console.info('[원거리 시야] 내장 하늘 효과 생략:',error);
      }
    }
  };
  const onStyle=()=>{mode='flat';lastTheme='';active=false;sync();};
  map.on?.('move',sync);
  map.on?.('pitchend',sync);
  map.on?.('zoomend',sync);
  map.on?.('style.load',onStyle);
  // Rotation and desktop/mobile viewport changes must re-evaluate the overlay.
  if(typeof window!=='undefined') window.addEventListener?.('resize',sync);
  themeButton?.addEventListener?.('click',sync);
  sync();
  return {sync,isActive:()=>active};
}
