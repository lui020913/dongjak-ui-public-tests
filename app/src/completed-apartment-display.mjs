import {completedApartmentDisplayEdits} from './completed-apartment-display-edits.mjs';
// Applied once on sheet loading in both the worker and fallback loader.
// No camera listeners, geometry processing, extra fetches or road changes.
export function apartmentDisplayExclusions(sheet,kind,features,pack=completedApartmentDisplayEdits){
 const excluded=new Set();
 if(pack?.schema!==1||!Array.isArray(pack.edits)||!Array.isArray(features))return excluded;
 const edits=pack.edits.filter(e=>e.sheet===sheet&&e.kind===kind);
 for(const e of edits){
  const f=features[e.row];
  if(!Number.isInteger(e.row)||e.row<0||excluded.has(f)||e.source_count!==features.length||!f||f.properties?.h!==e.original_height||JSON.stringify(f.geometry)!==JSON.stringify(e.original)||typeof e.site!=='string'||!e.site||!e.reason)return new Set();
  excluded.add(f);
 }
 return excluded;
}
