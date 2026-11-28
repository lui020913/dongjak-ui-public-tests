import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GeoJSONVT} from '@maplibre/geojson-vt';
import {fromGeojsonVt} from '@maplibre/vt-pbf';
import {loadBuildingTileFeatures} from '../src/building-assets-core.js';
import {containsDistrictPoint} from '../src/district-building-scope.mjs';
import {createPlanLookup} from '../src/confirmed-development-display.mjs';
import {partitionDisplayBuildings} from '../src/building-display-detail.js';
import {partitionGreenReview} from '../src/green-building-filter.js';
import {uniqueHighRiseFootprints} from '../src/building-coverage.js';
export const VECTOR_MIN_ZOOM=13,VECTOR_MAX_ZOOM=17,VECTOR_EXTENT=8192;
export const VECTOR_PREFIX='data/building-mvt/v1/';
const root=new URL('../public/',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path.replace(/^\//,''),root),'utf8'));
const localFetch=async path=>({ok:true,json:async()=>read(path)});
export function tileRange(bounds,z){
 const n=2**z,x=lon=>(lon+180)/360*n,y=lat=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;
 const [w,s,e,north]=bounds;return [Math.floor(x(w)),Math.floor(y(north)),Math.floor(x(e)),Math.floor(y(s))];
}
// Retain all reviewed footprints, original heights and holes; low zoom only
// removes subpixel detail. No bounding-box replacement or 2D distance toggle.
export function vectorIndex(collection){
 return new GeoJSONVT(collection,{extent:VECTOR_EXTENT,maxZoom:VECTOR_MAX_ZOOM,indexMaxZoom:5,tolerance:.5,buffer:128});
}
export function encodeBuildingTile(index,z,x,y){
 const tile=index.getTile(z,x,y);
 return fromGeojsonVt({buildings:tile||{features:[]}},{version:2,extent:VECTOR_EXTENT});
}
export async function prepareVectorSheet(sheet,boundary,containsPlan,trimPack){
 const data=await loadBuildingTileFeatures(sheet,localFetch,trimPack);
 if(data.successfulSources!==data.totalSources)throw Error('Incomplete GIS sheet '+sheet.sheet);
 const district=data.features.filter(f=>Number.isFinite(f.properties?.x)&&Number.isFinite(f.properties?.y)&&containsDistrictPoint(boundary,f.properties.x,f.properties.y)&&['Polygon','MultiPolygon'].includes(f.geometry?.type)&&!containsPlan(f.properties.x,f.properties.y));
 const {visible}=partitionDisplayBuildings(district);
 const reviewed=partitionGreenReview(visible,data.reviewCandidates,true).visible;
 const final=uniqueHighRiseFootprints(reviewed);
 return {type:'FeatureCollection',features:final.map((f,i)=>({type:'Feature',id:i+1,geometry:data.displayGeometries.get(f)||f.geometry,properties:{h:Number(f.properties?.h)||0,_render3d:true}}))};
}
export async function generateBuildingVectorAssets(emit){
 const manifest=read('buildings/manifest.json'),boundary=read('data/dongjak_sig_reference.geojson').features.find(f=>f.properties.SIG_KOR_NM==='동작구').geometry;
 const plans=read('data/redevelopment/confirmed-projects-202609.geojson'),containsPlan=createPlanLookup(plans);
 const raw=readFileSync(new URL('data/building-display-road-trims.json',root));
 if(raw.byteLength!==136162||createHash('sha256').update(raw).digest('hex')!=='851b128fd5f3877b513d41915495667a2eda7d9a61d2ba6d69240d9eec487d08')throw Error('building trim checksum mismatch');
 const trimPack=JSON.parse(raw),sheets=[];
 for(const sheet of manifest.sheets){
  const collection=await prepareVectorSheet(sheet,boundary,containsPlan,trimPack),index=vectorIndex(collection);
  let tiles=0,bytes=0;const seen=new Set();
  for(let z=VECTOR_MIN_ZOOM;z<=VECTOR_MAX_ZOOM;z++){
   const [x0,y0,x1,y1]=tileRange(sheet.bbox,z);
   // Include one tile of buffer to avoid clipping buildings that cross the
   // sheet boundary. Empty tiles are valid MVT, not 404s.
   for(let x=x0-1;x<=x1+1;x++)for(let y=y0-1;y<=y1+1;y++){
    const tile=index.getTile(z,x,y);if(z===VECTOR_MAX_ZOOM)for(const f of tile?.features||[])if(f.id!=null)seen.add(Number(f.id));
    const binary=encodeBuildingTile(index,z,x,y);emit(VECTOR_PREFIX+sheet.sheet+'/'+z+'/'+x+'/'+y+'.pbf',binary);tiles++;bytes+=binary.byteLength;
   }
  }
  if(seen.size!==collection.features.length)throw Error('Vector feature coverage mismatch '+sheet.sheet+': '+seen.size+'/'+collection.features.length);
  sheets.push({sheet:sheet.sheet,bbox:sheet.bbox,count:collection.features.length,tiles,bytes});
 }
 emit(VECTOR_PREFIX+'manifest.json',JSON.stringify({schema:1,minzoom:VECTOR_MIN_ZOOM,maxzoom:VECTOR_MAX_ZOOM,extent:VECTOR_EXTENT,boundary,sheets}));
 return sheets;
}
export function buildingVectorAssetsPlugin(){
 // An explicit experimental build is required until visual parity has been
 // checked on physical phones. The production GeoJSON path is untouched.
 return {name:'reviewed-building-vector-assets',async generateBundle(){
  if(process.env.DJ_BUILDING_MVT_PREVIEW!=='1')return;
  await generateBuildingVectorAssets((fileName,source)=>this.emitFile({type:'asset',fileName,source}));
 }};
}
