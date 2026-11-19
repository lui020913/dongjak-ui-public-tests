// Pure, dependency-free route geometry helpers. Coordinates are [longitude, latitude].
const RAD = Math.PI / 180;
export function haversineMeters(a, b) {
  const lat1 = a[1] * RAD; const lat2 = b[1] * RAD;
  const dLat = (b[1] - a[1]) * RAD; const dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
export function validLngLat(point) {
  return Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])) &&
    Number(point[0]) >= -180 && Number(point[0]) <= 180 && Number(point[1]) >= -90 && Number(point[1]) <= 90;
}
export function lineLengthMeters(line) {
  if (!Array.isArray(line)) return 0;
  let sum=0;
  for (let i=1;i<line.length;i++) sum+=haversineMeters(line[i-1],line[i]);
  return sum;
}
export function linePointAtMeters(coords, meters) {
  if (!Array.isArray(coords) || !coords.length) return null;
  if (coords.length === 1) return [...coords[0]];
  let d = Math.max(0, Number.isFinite(meters) ? meters : 0);
  for (let i=1;i<coords.length;i++) {
    const a=coords[i-1], b=coords[i], length=haversineMeters(a,b);
    if (d <= length || i === coords.length-1) {
      const ratio=length>0 ? Math.min(1,Math.max(0,d/length)) : 0;
      return [a[0]+(b[0]-a[0])*ratio, a[1]+(b[1]-a[1])*ratio];
    }
    d-=length;
  }
  return [...coords[coords.length-1]];
}
// Approximate local tangent-plane projection is adequate over a single route segment.
export function projectOnLine(coords, point) {
  if (!Array.isArray(coords) || coords.length<2 || !validLngLat(point)) return null;
  const latScale=111320;
  const lonScale=Math.cos(point[1]*RAD)*111320;
  let best=null, progress=0;
  for(let i=1;i<coords.length;i++) {
    const a=coords[i-1],b=coords[i];
    const ax=(a[0]-point[0])*lonScale, ay=(a[1]-point[1])*latScale;
    const bx=(b[0]-point[0])*lonScale, by=(b[1]-point[1])*latScale;
    const dx=bx-ax, dy=by-ay, sq=dx*dx+dy*dy;
    const t=sq>0?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/sq)):0;
    const projected=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    const error=haversineMeters(point,projected);
    const length=haversineMeters(a,b);
    if (!best||error<best.errorMeters) best={point:projected,errorMeters:error,meters:progress+length*t};
    progress+=length;
  }
  return best;
}
export function pointBetweenStations(route, from, to, fraction) {
  const coordinates=route?.geometry?.coordinates ?? route?.coordinates;
  if (!Array.isArray(coordinates)||coordinates.length<2) return null;
  const p0=projectOnLine(coordinates, from),p1=projectOnLine(coordinates,to);
  if (!p0||!p1 || p0.errorMeters>180 || p1.errorMeters>180) return null;
  const f=Math.min(1,Math.max(0,Number(fraction)||0));
  return linePointAtMeters(coordinates,p0.meters+(p1.meters-p0.meters)*f);
}
