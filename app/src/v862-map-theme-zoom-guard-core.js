import {lightMapLandRole} from './ui-environment.js';
import {nativeBuildingFootprint} from './map-appearance.js';

let latestMapInstance=null;

/** Reapply the current base-map land palette after MapLibre finishes a zoom,
 * pitch or style transition. Only native base-map ground/vegetation layers are
 * eligible; route, transit, safety, district and custom building layers stay
 * under their original owners. */
export function applyBaseLandPalette(map,app){
  if(!map||!app)return 0;
  if(typeof map.isStyleLoaded==='function'&&!map.isStyleLoaded())return 0;
  const theme=app.dataset?.theme==='dark'?'dark':'light';
  const layers=map.getStyle?.()?.layers||[];
  let changed=0;
  for(const layer of layers){
    if(!layer)continue;
    const id=String(layer.id||'').toLowerCase();
    if(/^(?:dongjak|dj-|transport-|night-|sangdo|route-|gps-|walk-)/.test(id))continue;
    if(layer.type==='background'){
      const color=theme==='dark'?'#142128':'#e2e4dc';
      try{
        if(map.getLayer?.(layer.id)&&map.getPaintProperty?.(layer.id,'background-color')!==color){
          map.setPaintProperty(layer.id,'background-color',color);changed++;
        }
      }catch{}
      continue;
    }
    if(layer.type!=='fill'||nativeBuildingFootprint(layer))continue;
    const role=lightMapLandRole(layer);
    if(role!=='ground'&&role!=='vegetation')continue;
    const color=role==='ground'
      ?(theme==='dark'?'#253137':'#e1e4dc')
      :(theme==='dark'?'#34583e':'#a5ca92');
    try{
      if(!map.getLayer?.(layer.id))continue;
      if(map.getPaintProperty?.(layer.id,'fill-color')!==color){
        map.setPaintProperty(layer.id,'fill-color',color);changed++;
      }
    }catch{}
  }
  return changed;
}

/** The single MapLibre instance is captured passively from its event stream.
 * The transport share affordance uses it only to resolve the selected marker
 * back to geographic coordinates; no map initializer or renderer is changed. */
export function getLatestMapInstance(){return latestMapInstance;}

export function installMapThemeZoomGuard({MapClass,app=globalThis.document?.getElementById?.('app')}={}){
  const proto=MapClass?.prototype;
  if(!proto||typeof proto.fire!=='function'||proto.__djLandThemeZoomGuard)return ()=>{};
  const originalFire=proto.fire;
  const raf=globalThis.requestAnimationFrame?.bind(globalThis)||(fn=>setTimeout(fn,0));
  const caf=globalThis.cancelAnimationFrame?.bind(globalThis)||clearTimeout;
  const pending=new WeakMap();
  const schedule=map=>{
    const old=pending.get(map);
    if(old)caf(old);
    const id=raf(()=>{pending.delete(map);applyBaseLandPalette(map,app);});
    pending.set(map,id);
  };
  const wrapped=function(event,...args){
    latestMapInstance=this;
    const type=typeof event==='string'?event:event?.type;
    const result=originalFire.call(this,event,...args);
    if(type==='zoomend'||type==='style.load'||type==='pitchend')schedule(this);
    return result;
  };
  Object.defineProperty(proto,'fire',{configurable:true,writable:true,value:wrapped});
  Object.defineProperty(proto,'__djLandThemeZoomGuard',{configurable:true,value:true});
  return ()=>{
    if(proto.fire===wrapped){
      Object.defineProperty(proto,'fire',{configurable:true,writable:true,value:originalFire});
      delete proto.__djLandThemeZoomGuard;
    }
  };
}
