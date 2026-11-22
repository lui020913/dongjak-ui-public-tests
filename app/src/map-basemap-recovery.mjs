/** Avoid dropping the full vector map when mobile networks are merely slow.
 * The emergency OSM raster loses native building/style layers; it is a last
 * resort only when the vector style has not become usable in time.
 */
export const BASE_STYLE_INITIAL_WAIT_MS=45000;
export const VECTOR_STYLE_GRACE_MS=90000;

export function hasVectorBaseSource(style){
  if(!style || typeof style!=='object')return false;
  const sources=style.sources||{};
  return Object.values(sources).some(source=>source?.type==='vector');
}
export function baseMapRecoveryDecision({mapReady=false,alreadyRecovered=false,style=null,elapsedMs=0}={}){
  if(mapReady||alreadyRecovered)return 'keep';
  const elapsed=Math.max(0,Number(elapsedMs)||0);
  if(elapsed<BASE_STYLE_INITIAL_WAIT_MS)return 'wait';
  if(hasVectorBaseSource(style)&&elapsed<VECTOR_STYLE_GRACE_MS)return 'wait-vector';
  return 'fallback';
}
