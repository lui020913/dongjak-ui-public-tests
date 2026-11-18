/**
 * GPS boundary alerts: the user's precise coordinates never leave the browser.
 * Do not label a near-border / low-accuracy fix as definitively outside.
 */
import {insideBoundary,distanceFromDongjakMeters} from './fixed-rail-lines.js';

export function dongjakGpsRegion(lng,lat,boundary,accuracyMeters=0){
  if(!boundary||!Number.isFinite(lng)||!Number.isFinite(lat))return 'unknown';
  if(insideBoundary([lng,lat],boundary))return 'inside';
  const distance=distanceFromDongjakMeters([lng,lat],boundary);
  const tolerance=Math.min(800,Math.max(60,Number.isFinite(accuracyMeters)?accuracyMeters:0));
  return distance<=tolerance?'border':'outside';
}

/** Notifies once when entering an outside state, then only after returning inside. */
export function createOutsideDistrictNotifier(onOutside){
  let warned=false;
  return {
    check(lng,lat,boundary,accuracyMeters){
      const state=dongjakGpsRegion(lng,lat,boundary,accuracyMeters);
      if(state==='inside')warned=false;
      if(state==='outside'&&!warned){
        warned=true;
        onOutside();
      }
      return state;
    },
    reset(){warned=false;}
  };
}
