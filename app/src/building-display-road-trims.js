// Display-only trims are generated from intersecting official road polygons
// and verified ground centerlines. Original features remain the identity for
// greenery review, source auditing and native building coverage.
export function applyBuildingDisplayTrims(sheet,kind,source,features,pack){
 const result=new Map();
 if(pack?.schema!==1)return result;
 const record=pack.sheets?.[sheet+':'+kind];
 if(!record||record.source!==source||record.source_count!==features.length||!Array.isArray(record.edits))return result;
 const seen=new Set();
 for(const edit of record.edits){
  const f=features[edit.row];
  if(!Number.isInteger(edit.row)||seen.has(edit.row)||!f||JSON.stringify(f.geometry)!==JSON.stringify(edit.original))return new Map();
  if(!['Polygon','MultiPolygon'].includes(edit.display?.type)||!Array.isArray(edit.display.coordinates)||edit.display.coordinates.length===0)return new Map();
  seen.add(edit.row);result.set(f,edit.display);
 }
 return result;
}
let packPromise=null;
export function loadBuildingDisplayTrimPack(){
 if(!packPromise)packPromise=fetch('/data/building-display-road-trims.json',{cache:'force-cache'}).then(async r=>{
  if(!r.ok)throw Error('building display trims unavailable');
  const bytes=await r.arrayBuffer();
  if(bytes.byteLength!==136162||!globalThis.crypto?.subtle)throw Error('building display trim size or verification unavailable');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  if(digest!=='851b128fd5f3877b513d41915495667a2eda7d9a61d2ba6d69240d9eec487d08')throw Error('building display trim checksum mismatch');
  const pack=JSON.parse(new TextDecoder().decode(bytes));if(pack?.schema!==1||!pack.sheets)throw Error('invalid building display trims');
  return pack;
 }).catch(()=>{packPromise=null;return null;});
 return packPromise;
}
