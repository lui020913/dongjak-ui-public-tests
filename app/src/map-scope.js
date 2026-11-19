/**
 * MapLibre camera clamp: official Dongjak-gu polygon bounding box + 7 km.
 * The resulting camera range is rectangular, so corners are not a strict
 * geodesic 7 km buffer; it is deliberately not a destructive data crop.
 */
export const MAP_OUTER_BUFFER_METERS = 7000;
export function bufferedDistrictBounds(geometry, bufferMeters=MAP_OUTER_BUFFER_METERS){
  if(!geometry || !['Polygon','MultiPolygon'].includes(geometry.type))throw new TypeError('Polygon or MultiPolygon required');
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  let minLng=Infinity,minLat=Infinity,maxLng=-Infinity,maxLat=-Infinity;
  for(const rings of polygons)for(const ring of rings)for(const p of ring){
    if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
    minLng=Math.min(minLng,p[0]);maxLng=Math.max(maxLng,p[0]);
    minLat=Math.min(minLat,p[1]);maxLat=Math.max(maxLat,p[1]);
  }
  if(!Number.isFinite(minLng))throw new Error('Valid district coordinates required');
  const latMargin=bufferMeters/111320;
  // Use the northern edge for the conservatively wider longitudinal margin.
  const lngMargin=bufferMeters/(111320*Math.cos((maxLat+latMargin)*Math.PI/180));
  return [[minLng-lngMargin,minLat-latMargin],[maxLng+lngMargin,maxLat+latMargin]];
}
