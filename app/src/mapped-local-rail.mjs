import {mergeOfficialRail} from './rail-official-shapes.js';
export const MAPPED_RAIL_ASSET='/data/transport/seoul-rail-network-single-fa75e12.geojson';
const codes=new Set(['1','2','4','7','9','신림']);
export function mappedLocalRailPaths(data){
 return (data?.features||[]).flatMap(f=>{
  const line=String(f.properties?.line||'').replace(/호선$/,'').replace('신림선','신림');
  const coordinates=f.geometry?.coordinates;
  return codes.has(line)&&f.geometry?.type==='LineString'&&coordinates?.length>=2?[{line,coordinates,origin:'OpenStreetMap_ODbL'}]:[];
 });
}
export async function fetchMappedLocalRailPaths(fetcher=globalThis.fetch){
 const response=await fetcher(MAPPED_RAIL_ASSET,{cache:'force-cache'});if(!response.ok)throw Error('mapped rail '+response.status);
 const paths=mappedLocalRailPaths(await response.json());if(!paths.length)throw Error('mapped rail empty');return paths;
}
export function preferMappedLocalRail(base,mapped=[],remote=[]){
 const official=mergeOfficialRail(base,remote);
 const local=mergeOfficialRail(official.collection,mapped);
 return {collection:local.collection,lines:[...new Set([...official.lines,...local.lines])]};
}
export function displayRailCollection(collection,approximate){
 // Surveyed/mapped track geometry is the visual authority. Do not distort it
 // to match surface exits; only the schematic fallback may be approximated.
 return collection.features.some(f=>f.properties?.line==='7호선'&&f.properties?.schematic===false)?collection:approximate(collection);
}
