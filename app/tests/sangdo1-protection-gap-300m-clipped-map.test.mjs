import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const load=async n=>JSON.parse(await readFile(path.join(dir,n),'utf8'));
const LAT=111195,LON=111320*Math.cos(37.5*Math.PI/180);

test('300m-only line map is clipped, type-specific and retains stored coverage score and color',async()=>{
 const [output,segments]=await Promise.all([
  load('sangdo1_protection_gap_300m_clipped_map_20261122.geojson'),
  load('sangdo1_protection_gap_300m_20261122.json')
 ]);
 assert.equal(output.type,'FeatureCollection');
 assert.equal(output.metadata.radius_m,300);
 assert.equal(output.metadata.all_300m_ineligible_geometry_excluded,true);
 const byId=new Map(segments.segments.map(x=>[x.segment_id,x]));
 assert.equal(output.features.length,1755);
 for(const type of ['어린이','노인']){
  const selected=output.features.filter(x=>x.properties.group_type===type);
  assert.equal(new Set(selected.map(x=>x.properties.segment_id)).size,
    type==='어린이'?1080:674);
  const total=selected.reduce((sum,x)=>sum+x.properties.evaluated_line_length_m,0);
  const expected=segments.summary.by_type[type].unprotected_road_length_m+
    segments.summary.by_type[type].registered_road_length_within_300m;
  assert.ok(Math.abs(total-expected)<1,type+' clipped aggregate length '+total+' expected '+expected);
 }
 for(const feature of output.features){
  const p=feature.properties;
  const r=byId.get(p.segment_id);
  assert.ok(r,p.segment_id);
  const v=r.types[p.group_type];
  assert.ok(v.score!==null,p.segment_id);
  assert.equal(p.score_300m,v.score);
  assert.equal(p.color,v.color);
  assert.equal(p.grade,v.grade);
  assert.equal(p.radius_m,300);
  assert.equal(p.actual_legal_zone_gap_confirmed,false);
  assert.ok(feature.geometry.coordinates.length>=2);
  const len=feature.geometry.coordinates.reduce((sum,coords,i,array)=>{
   if(!i)return sum;
   const prev=array[i-1];
   return sum+Math.hypot((coords[0]-prev[0])*LON,(coords[1]-prev[1])*LAT);
  },0);
  assert.ok(Math.abs(len-p.evaluated_line_length_m)<.012);
 }
});
