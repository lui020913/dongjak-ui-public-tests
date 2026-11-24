// Navigation-only decisions: pure helpers for unit tests (no DOM/GPS side effects).
const toRadians=degrees=>degrees*Math.PI/180;
export function bearingDegrees(from,to){
  if(!Array.isArray(from)||!Array.isArray(to)||![...from,...to].every(Number.isFinite))return NaN;
  const lat1=toRadians(from[1]),lat2=toRadians(to[1]),diff=toRadians(to[0]-from[0]);
  const east=Math.sin(diff)*Math.cos(lat2);
  const north=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(diff);
  return (Math.atan2(east,north)*180/Math.PI+360)%360;
}
export function headingForCamera(gpsHeading,currentBearing=0){
  return Number.isFinite(gpsHeading)&&gpsHeading>=0?(gpsHeading%360):currentBearing;
}
export function offRouteThreshold(accuracy){
  return Math.max(20,Math.min(55,accuracy+8));
}
export function shouldAutoReroute({offRouteMeters,accuracy,consecutiveSamples,now,lastAttemptAt=-Infinity,pending=false}){
  return !pending && Number.isFinite(accuracy) && accuracy<=40 &&
    offRouteMeters>offRouteThreshold(accuracy) && consecutiveSamples>=3 &&
    now-lastAttemptAt>=15000;
}
// Announce each relevant distance threshold once per maneuver.
export function voiceCueKey(maneuverIndex,remainingMeters){
  if(!Number.isFinite(remainingMeters) || remainingMeters>130)return '';
  const stage=remainingMeters>45?'100':remainingMeters>18?'30':'now';
  return `turn-${maneuverIndex}-${stage}`;
}

 
// Absolute phone heading, not relative yaw. iOS exposes a clockwise compass
// heading; standards-based absolute orientation exposes counter-clockwise alpha.
export function deviceCompassHeading(event){
  const compass=event?.webkitCompassHeading;
  const accuracy=event?.webkitCompassAccuracy;
  if(Number.isFinite(compass)&&compass>=0&&compass<=360&&
    (!Number.isFinite(accuracy)||(accuracy>=0&&accuracy<=45)))return compass%360;
  if(event?.absolute===true&&Number.isFinite(event.alpha)&&event.alpha>=0&&event.alpha<=360)
    return (360-event.alpha)%360;
  return NaN;
}
export function signedHeadingDelta(target,current){
  return ((target-current+180)%360+360)%360-180;
}
export function smoothCompassHeading(previous,next,weight=.65){
  if(!Number.isFinite(next))return previous;
  if(!Number.isFinite(previous))return next;
  return ((previous+signedHeadingDelta(next,previous)*weight)%360+360)%360;
}
// One subscription per navigation session. iOS permission must be requested
// synchronously from the start-guidance gesture, before GPS awaits.
export function startNavigationCompass(win,onHeading,{now=()=>win.performance.now(),interval=100}={}){
  let active=true,attached=false,lastEmit=-Infinity,filtered=NaN,lastRaw=NaN,lastSample=-Infinity;
  const handler=event=>{
    if(!active)return;
    const heading=deviceCompassHeading(event);
    if(!Number.isFinite(heading))return;
    const time=now();
    lastRaw=heading;lastSample=time;
    if(time-lastEmit<interval)return;
    filtered=smoothCompassHeading(filtered,lastRaw);
    lastEmit=time;onHeading(filtered);
  };
  const attach=()=>{
    if(!active||attached)return;
    attached=true;
    win.addEventListener('deviceorientationabsolute',handler,true);
    win.addEventListener('deviceorientation',handler,true);
  };
  const Sensor=win.DeviceOrientationEvent;
  if(Sensor&&typeof Sensor.requestPermission==='function'){
    try{Promise.resolve(Sensor.requestPermission()).then(result=>{if(result==='granted')attach();}).catch(()=>{});}
    catch{/* GPS fallback remains available */}
  }else if(Sensor||'ondeviceorientationabsolute' in win)attach();
  return {
    heading(maxAge=2500){return active&&now()-lastSample<=maxAge?filtered:NaN;},
    stop(){active=false;if(attached){win.removeEventListener('deviceorientationabsolute',handler,true);win.removeEventListener('deviceorientation',handler,true);}attached=false;}
  };
}
