import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const load=async name=>JSON.parse(await readFile(path.join(base,name),'utf8'));

test('school buffer preview paints clipped 5m road portions rather than whole 25m links', async()=>{
  const result=await load('school_300_500m_unprotected_preview.geojson');
  assert.equal(result.type,'FeatureCollection');
  assert.ok(result.features.length>1000);
  assert.equal(result.metadata.school_count,2);
  assert.ok(result.metadata.segments_within300>2);
  const sums={within300:0,'300to500':0};
  const groups={within300:new Set(),'300to500':new Set()};
  for(const item of result.features){
    const p=item.properties;
    assert.equal(item.geometry.type,'LineString');
    assert.ok(item.geometry.coordinates.length>=2);
    assert.ok(['within300','300to500'].includes(p.band));
    assert.equal(p.verification_status,'시범 미확인');
    assert.equal(p.route_penalty_allowed,false);
    assert.ok(p.geometry_length_m>0 && p.geometry_length_m<=p.source_geometry_length_m+.2);
    assert.ok(p.school_coverage_preview_score>=0&&p.school_coverage_preview_score<=100);
    groups[p.band].add(p.segment_id);
    sums[p.band]+=p.geometry_length_m;
  }
  assert.equal(groups.within300.size,result.metadata.segments_within300);
  assert.equal(groups['300to500'].size,result.metadata.segments_300to500);
  assert.ok(Math.abs(sums.within300-result.metadata.clipped_unprotected_within300_m)<1.0);
  assert.ok(Math.abs(sums['300to500']-result.metadata.clipped_unprotected_300to500_m)<1.0);
});

test('policy coverage has explicit null for geometry gaps and non-final scores',async()=>{
  const result=await load('policy_coverage_25m_preview.json');
  assert.equal(result.segments.length,1686);
  assert.equal(result.segments.filter(s=>s.score===null).length,10);
  assert.equal(result.meta.facilityCount,9);
  assert.equal(result.meta.polygonCount,9);
  assert.ok(result.segments.every(s=>s.score===null||(s.score>=0&&s.score<=100)));
  const focus=result.meta.focus;
  assert.deepEqual(focus.map(x=>x.road_id),['R0248','R0288']);
  assert.equal(focus[0].covered_pct,0);
  assert.equal(focus[1].covered_pct,0);
});

test('facility entrance, official notice and actual commute routes are never fabricated',async()=>{
  const register=await load('verification_register.json');
  assert.equal(register.records.length,9);
  assert.ok(register.external_facility_gap.original_dongjak_facility_records_reported>register.records.length);
  assert.ok(register.records.every(r=>r.reference_point_status.includes('대표점')));
  assert.ok(register.records.every(r=>r.verified_main_gate_coordinate===null&&!r.main_gate_verified));
  assert.ok(register.records.every(r=>r.zone_notice_road_start===null&&r.zone_notice_road_end===null&&!r.zone_notice_current_verified));
  assert.ok(register.records.every(r=>r.school_commute_route_geometry===null&&!r.school_commute_route_verified));
});

test('the two focus road sheets have separately labelled, non-final school and all-facility scores',async()=>{
  const roads=await load('candidates.geojson');
  const focus=roads.features.filter(f=>['R0248','R0288'].includes(f.properties?.road_id));
  assert.equal(focus.length,2);
  for(const f of focus){
    const p=f.properties;
    assert.ok(Number.isFinite(p.policy_coverage_all9_preview_score));
    assert.ok(Number.isFinite(p.policy_coverage_school2_preview_score));
    assert.ok(p.policy_coverage_verification.includes('미검증'));
  }
  const road54=focus.find(f=>f.properties.road_id==='R0248').properties;
  const road62=focus.find(f=>f.properties.road_id==='R0288').properties;
  assert.equal(road54.policy_coverage_school2_preview_score,32.1);
  assert.equal(road62.policy_coverage_school2_preview_score,66.3);
});
