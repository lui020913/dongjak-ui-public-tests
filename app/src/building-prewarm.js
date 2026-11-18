/** Compute initial 3D building prewarm priority without starting downloads.
 * A small nearby subset avoids parsing the full district at map startup. */
export function nearestBuildingSheets(manifest,center,limit=3){
  if(!Array.isArray(manifest?.sheets))return [];
  const [lng,lat]=center;
  const distance=(sheet)=>{
    const [west,south,east,north]=sheet.bbox||[];
    if(![west,south,east,north].every(Number.isFinite))return Infinity;
    const dx=Math.max(west-lng,0,lng-east)*Math.cos(lat*Math.PI/180);
    const dy=Math.max(south-lat,0,lat-north);
    return dx*dx+dy*dy;
  };
  return [...manifest.sheets].sort((a,b)=>distance(a)-distance(b)).slice(0,Math.max(0,limit));
}
