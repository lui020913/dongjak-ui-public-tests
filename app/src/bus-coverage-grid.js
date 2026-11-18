/** Grid sampling for Seoul's station-by-position API.
 * Cells are distributed over the entire viewport and requested incrementally.
 * No placeholder bus stops are invented: only Seoul API/OSM data may be displayed.
 */
export function busCoverageSamples(map,{radiusMeters=180,maxAxis=13}={}){
  const zoom=Number(map?.getZoom?.());
  const canvas=map?.getCanvas?.();
  const width=Number(canvas?.clientWidth||0),height=Number(canvas?.clientHeight||0);
  if(!Number.isFinite(zoom)||zoom<14.25||width<40||height<40||typeof map.unproject!=='function')return [];
  const centerLat=Number(map.getCenter?.()?.lat??37.50);
  const metersPerPixel=156543.03392*Math.cos(centerLat*Math.PI/180)/(2**zoom);
  // Overlap circles so a station between grid cells is not missed.
  const step=Math.max(32,Math.min(260,(radiusMeters*1.33)/Math.max(.2,metersPerPixel)));
  const columns=Math.min(maxAxis,Math.max(3,Math.ceil(width/step)+1));
  const rows=Math.min(maxAxis,Math.max(3,Math.ceil(height/step)+1));
  const points=[];
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const px=width*(col+.5)/columns,py=height*(row+.5)/rows;
    const p=map.unproject([px,py]);
    if(!Number.isFinite(p?.lng)||!Number.isFinite(p?.lat))continue;
    // At Seoul's latitude 0.001 degrees of latitude is ~111m;
    // cache fine enough to avoid a large gap from repeated rounding.
    const key=`${p.lng.toFixed(4)}/${p.lat.toFixed(4)}`;
    points.push({key,lng:p.lng,lat:p.lat,priority:Math.hypot(px-width/2,py-height/2)});
  }
  return points.sort((a,b)=>a.priority-b.priority);
}
