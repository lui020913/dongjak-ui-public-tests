import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const readJson=async name=>JSON.parse(await readFile(resolve(root,name),'utf8'));
function readCsv(content){
 const lines=content.trim().split(/\r?\n/),headers=lines.shift().split(',');
 return lines.map(line=>{
  const values=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"'));
  assert.equal(values.length,headers.length,'Malformed CSV row');
  return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
 });
}
test('official September SHP exactly resolved all 22 clipped administrative border catchments',async()=>{
 const audit=await readJson('sangdo1_22_clipped_official_catchment_audit_20261122.json');
 assert.equal(audit.schema,'sangdo1_22_boundary_exact_school_catchment_audit_v1');
 assert.equal(audit.source_original_sha256,'66b7650d5eef3b900061083b3d8f5c8f6dcb8eb00b891e6b03132f08fdca2911');
 assert.equal(audit.road_segment_count,22);
 assert.equal(audit.score_change_required,0);
 assert.equal(audit.nearest_matching_elementary_count,1);
 assert.equal(audit.existing_protected_matching_elementary_count,1);
 assert.equal(audit.rows.length,22);
 assert.equal(new Set(audit.rows.map(x=>x.segment_id)).size,22);
 assert.equal(audit.rows.filter(x=>x.official_catchment_covered_pct===100).length,18);
 assert.equal(audit.rows.filter(x=>x.official_catchment_covered_pct===0).length,4);
 assert.ok(audit.rows.every(x=>x.risk_score_invariant_for_any_school_overlap));
 const example=audit.rows.find(x=>x.segment_id==='470199635_11');
 assert.equal(example.road_name,'흑석로');
 assert.equal(example.nearest_child_facility,'서울강남초등학교');
 assert.equal(example.same_elementary_school_overlap_pct,100);
 assert.equal(example.registered_polygon_protected,true);
 assert.equal(example.original_child_score,0);
 assert.equal(example.original_combined_score,16); // elderly score remains the combined maximum
});
test('original 1,003 risk values and 603 map gray segments are unchanged by post-hoc official catchment audit',async()=>{
 const [audit,geo,csv]=await Promise.all([
  readJson('sangdo1_22_clipped_official_catchment_audit_20261122.json'),
  readJson('sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson'),
  readFile(resolve(root,'sangdo1_policy_gap_2factor_adminscope_300m_20261122.csv'),'utf8').then(readCsv)
 ]);
 assert.equal(geo.features.length,1606);
 assert.equal(geo.features.filter(f=>typeof f.properties.combined_new_score==='number').length,1003);
 assert.equal(geo.features.filter(f=>f.properties.combined_new_score===null).length,603);
 const byId=new Map(csv.map(x=>[x.segment_id,x]));
 const byGeo=new Map(geo.features.map(x=>[x.properties.segment_id,x]));
 assert.equal(csv.length,1686);
 assert.equal(geo.features.filter(x=>x.properties.boundary_scope==='crossing').length,22);
 for(const x of audit.rows){
  const csvItem=byId.get(x.segment_id),feature=byGeo.get(x.segment_id);
  assert.ok(csvItem&&feature, x.segment_id);
  assert.equal(csvItem.boundary_scope,'crossing');
  assert.equal(feature.properties.boundary_scope,'crossing');
  const risk=csvItem.combined_new_score===''?null:Number(csvItem.combined_new_score);
  assert.equal(risk,x.original_combined_score);
  assert.equal(feature.properties.combined_new_score,risk);
  assert.ok(x.official_catchment_covered_pct>=0&&x.official_catchment_covered_pct<=100);
  assert.ok(x.risk_score_invariant_for_any_school_overlap);
  // Previous study intentionally suppressed school overlay for the 22 clipped fragments.
  // The exact observed school geometry is now recorded separately, without making
  // middle-school or preschool catchments count as matching elementary-school risk.
 }
});
test('the actual PRI map reads the audited overlaps, not a synthetic middle-school factor',async()=>{
 const ui=await readFile(resolve(root,'../../../src/pri-map.js'),'utf8');
 assert.ok(ui.includes("sangdo1_22_clipped_official_catchment_audit_20261122.json"));
 assert.ok(ui.includes('기존 보호 공백 점수 변동 없음'));
 assert.ok(ui.includes('app.dataset.djPriMode=id'));
});
