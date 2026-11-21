import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const read=async filename=>JSON.parse(await readFile(path.join(dir,filename),'utf8'));

test('official 2026 school attendance polygons remain distinct from police protection zones',async()=>{
  const polygons=await read('sangdo1_school_catchment_polygons_20260920.geojson');
  assert.equal(polygons.type,'FeatureCollection');
  assert.equal(polygons.features.length,8);
  assert.equal(polygons.metadata.as_of,'2026-09-20');
  assert.equal(polygons.metadata.not_legal_school_zone,true);
  assert.equal(polygons.metadata.not_route,true);
  for(const feature of polygons.features){
    assert.ok(['Polygon','MultiPolygon','GeometryCollection'].includes(feature.geometry.type));
    assert.match(feature.properties.catchment_name,/통학구역/);
    assert.equal(feature.properties.not_student_route,true);
    assert.ok(feature.properties.overlap_sangdo1_m2>0);
    assert.equal(feature.properties.source_asof,'2026-09-20');
  }
  assert.ok(polygons.features.some(f=>f.properties.catchment_name.includes('봉현초')));
  assert.ok(polygons.features.some(f=>f.properties.catchment_name.includes('은로초')));
});

test('road assignments reflect exact official catchment intersections, not shortest school distances',async()=>{
  const [polygons,roads,summary,policy]=await Promise.all([
    read('sangdo1_school_catchment_polygons_20260920.geojson'),
    read('sangdo1_road_catchment_overlay_20260920.json'),
    read('sangdo1_school_catchment_analysis_20260920_summary.json'),
    read('policy_coverage_25m_preview.json')
  ]);
  assert.equal(summary.source_date,'2026-09-20');
  assert.equal(summary.catchment_count,polygons.features.length);
  assert.equal(roads.segments.length,1686);
  assert.equal(summary.roads_geometry_valid,1676);
  assert.equal(summary.roads_null,10);
  assert.equal(summary.multiple_match_road_segments,42);
  assert.equal(roads.meta.source_zip_sha256,polygons.metadata.original_source_sha256);
  assert.equal(summary.school_assignment_not_student_route,true);
  assert.equal(policy.meta.facilityCount,19);
  const valid=roads.segments.filter(x=>x.road_length_m>0);
  assert.equal(valid.length,1676);
  assert.equal(roads.segments.filter(x=>x.classification==='no_line_geometry').length,10);
  assert.ok(valid.every(x=>x.catchment_covered_m>=0&&x.catchment_covered_m<=x.road_length_m+0.1));
  assert.ok(valid.every(x=>x.assignments.every(a=>a.road_m>0&&a.pct_of_road>=0)));
  assert.ok(Math.abs(valid.reduce((sum,x)=>sum+x.road_length_m,0)-summary.road_geometry_m)<15);
  assert.ok(Math.abs(valid.reduce((sum,x)=>sum+x.catchment_covered_m,0)-summary.catchment_covered_road_m)<15);
  assert.ok(summary.school_breakdown.some(x=>x.catchment_name==='서울강남초통학구역'));
  assert.ok(summary.school_breakdown.some(x=>x.catchment_name==='서울봉현초통학구역'));
  assert.equal(summary.school_breakdown.length,7); // 8th polygon has zero road overlap.
  const e=summary.school_breakdown.find(x=>x.catchment_name==='서울은로초통학구역');
  assert.ok(e.road_length_m>300&&e.road_length_m<500);
  assert.ok(e.reference_policy_score_mean>=0&&e.reference_policy_score_mean<=100);
});
