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
export function shouldAutoReroute({offRouteMeters,accuracy,consecutiveSamples,now,lastAttemptAt=-Infinity,pending=false}){
  return !pending && Number.isFinite(accuracy) && accuracy<=40 &&
    offRouteMeters>Math.max(30,Math.min(68,accuracy*2)) && consecutiveSamples>=3 &&
    now-lastAttemptAt>=30000;
}
// Announce each relevant distance threshold once per maneuver.
export function voiceCueKey(maneuverIndex,remainingMeters){
  if(!Number.isFinite(remainingMeters) || remainingMeters>130)return '';
  const stage=remainingMeters>45?'100':remainingMeters>18?'30':'now';
  return `turn-${maneuverIndex}-${stage}`;
}
