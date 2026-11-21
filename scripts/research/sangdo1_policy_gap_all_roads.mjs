#!/usr/bin/env node
/**
 * Independent protection-zone gap signal for EVERY Sangdo1 road segment.
 * Road geometry is the sole reused team dataset; NEVER use its dark/score/grade/lamps.
 * Official 2026 catchment SHP-derived overlaps are context ONLY, not score inputs.
 * Model is NOT a current legal zone designation or measured pedestrian risk.
 *
 * node scripts/research/sangdo1_policy_gap_all_roads.mjs --verify
 * node scripts/research/sangdo1_policy_gap_all_roads.mjs --write
 */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const folder=path.join(root,'app/public/data/protection-zone');
const json=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const inputBase='app/public/data/protection-zone/';
const filename='sangdo1_policy_gap_independent_all_roads_20261122';
const vehicleKinds=new Set(['tertiary','primary','secondary','primary_link','residential','service']);
const pedestrianKinds=new Set(['footway','steps','pedestrian','footway:sidewalk','footway:crossing']);
const categories=[
 'near_facility_unprotected_300m','near_facility_unprotected_300_500m',
 'existing_zone_no_model_gap','outside_500m_or_no_model_gap','unscored_no_geometry'
];
const formatCsv=x=>'"'+String(x??'').replaceAll('"','""')+'"';

async function generate(){
 const [policy,school,facilities,roads]=await Promise.all([
  json(inputBase+'policy_coverage_25m_preview.json'),
  json(inputBase+'sangdo1_road_catchment_overlay_20260920.json'),
  json(inputBase+'facility_reference_points_19.geojson'),
  json('app/public/data/pri/lighting_segments.json')
 ]);
 assert.equal(policy.segments.length,1686);
 assert.equal(school.segments.length,1686);
 assert.equal(roads.segments.length,1686);
 assert.equal(facilities.features.length,19);
 const bySchool=new Map(school.segments.map(x=>[x.segment_id,x]));
 const byGeo=new Map(roads.segments.map(x=>[x.id,x]));
 assert.equal(bySchool.size,1686);
 assert.equal(byGeo.size,1686);
 const typeByName=new Map(facilities.features.map(f=>[f.properties.facility_name,f.properties.facility_type]));
 const rows=policy.segments.map(p=>{
  const sc=bySchool.get(p.id),geom=byGeo.get(p.id);
  assert.ok(sc&&geom,'Missing matched road segment '+p.id);
  assert.ok(vehicleKinds.has(geom.hw)||pedestrianKinds.has(geom.hw),'Unclassified OSM network '+geom.hw);
  const valid=p.geometry_length_m>0, percent300=p.unprotected_within_300_pct??0,
   percent500=p.unprotected_300_to_500_pct??0,percentProtected=p.protected_pct??0;
  if(valid)assert.ok(geom.pts&&geom.pts.length>1,'Missing line geometry '+p.id);
  const category=!valid?'unscored_no_geometry':percent300>0?'near_facility_unprotected_300m':percent500>0?'near_facility_unprotected_300_500m':percentProtected>0?'existing_zone_no_model_gap':'outside_500m_or_no_model_gap';
  const network=vehicleKinds.has(geom.hw)?'vehicle_network':'pedestrian_network';
  const eligible=valid&&network==='vehicle_network'&&(
   category==='near_facility_unprotected_300m'||category==='near_facility_unprotected_300_500m'
  );
  const schoolCross=sc.assignments?.map(a=>({name:a.school_catchment,length_m:a.road_m}))||[];
  return {
   id:p.id,road_name:p.name||geom.name,osm_highway:geom.hw,network_kind:network,
   input_road_length_m:valid?p.geometry_length_m:null,official_2026_road_length_m:sc.road_length_m||null,
   policy_coverage_score_0_100:valid?p.score:null,
   model_gap_strength_0_100:valid?+(100-p.score).toFixed(1):null,
   existing_zone_coverage_pct:valid?percentProtected:null,
   near_facility_unprotected_0_300m_pct:valid?percent300:null,
   near_facility_unprotected_300_500m_pct:valid?percent500:null,
   nearest_facility_name:valid?p.nearest_facility:null,
   nearest_facility_type:valid?(typeByName.get(p.nearest_facility)||'unmatched_reference'):null,
   nearest_facility_point_distance_m:valid?p.nearest_facility_point_distance_m:null,
   existing_2025_zone_model_category:category,
   potential_vehicle_zone_gap_candidate:eligible,
   official_2026_catchment_names:schoolCross.map(x=>x.name),
   official_2026_catchment_covered_m:sc.catchment_covered_m,
   official_2026_catchment_overlap_pct:sc.catchment_covered_pct,
   official_2026_catchment_overlap_details:schoolCross,
   research_priority_rank:null
  };
 });
 assert.equal(new Set(rows.map(x=>x.id)).size,1686,'Duplicate independent segment ID');
 const ranked=rows.filter(r=>r.potential_vehicle_zone_gap_candidate)
 .sort((a,b)=>b.model_gap_strength_0_100-a.model_gap_strength_0_100
  ||b.near_facility_unprotected_0_300m_pct-a.near_facility_unprotected_0_300m_pct
  ||b.input_road_length_m-a.input_road_length_m||a.id.localeCompare(b.id,'en'));
 for(let i=0;i<ranked.length;i++)ranked[i].research_priority_rank=i+1;
 const summarize=filter=>Object.fromEntries(categories.map(c=>[c,filter.filter(r=>r.existing_2025_zone_model_category===c).length]));
 const summary={
  total_source_segments:rows.length,
  valid_segments:rows.filter(x=>x.policy_coverage_score_0_100!==null).length,
  excluded_missing_geometry:rows.filter(x=>x.policy_coverage_score_0_100===null).length,
  model_categories_all_segments:summarize(rows),
  vehicle_network:{total:rows.filter(x=>x.network_kind==='vehicle_network').length,valid:rows.filter(x=>x.network_kind==='vehicle_network'&&x.policy_coverage_score_0_100!==null).length,categories:summarize(rows.filter(x=>x.network_kind==='vehicle_network')),potential_candidates:ranked.length},
  pedestrian_network:{total:rows.filter(x=>x.network_kind==='pedestrian_network').length,categories:summarize(rows.filter(x=>x.network_kind==='pedestrian_network')),candidate_like_but_not_vehicle_road:rows.filter(x=>x.network_kind==='pedestrian_network'&&/near_facility_unprotected/.test(x.existing_2025_zone_model_category)).length},
  model_gap_candidate_total_any_network:rows.filter(x=>/near_facility_unprotected/.test(x.existing_2025_zone_model_category)).length,
  top_vehicle_candidates:ranked.slice(0,15).map(x=>({rank:x.research_priority_rank,id:x.id,road_name:x.road_name,model_gap_strength_0_100:x.model_gap_strength_0_100,nearest_facility_name:x.nearest_facility_name,nearest_facility_type:x.nearest_facility_type,school_catchment:x.official_2026_catchment_names})),
  independent_of_legacy_125_preselection:true
 };
 const metadata={
  schema:'sangdo1_protection_gap_all_roads_independent_v1',produced_date:'2026-11-22',
  study_area:'상도1동 참고경계, 공식 행정동 경계 아님',
  source_protection_facilities:'2025-05-27 police API 19 point reference facilities, Dongjak only',source_registered_polygons:'2025-05-27 police API 18 polygons; 예일어린이집 POINT only',source_school_context:'2026-09-20 official school catchment SHP exact road overlay (context only, score never uses it)',
  source_road_geometry:'shared OSM 25m road geometry only; lighting dark/score/grade/lamp fields ignored',source_policy_values:'existing all-road 5m point-sampled policy_coverage_25m_preview.json',
  score_formula:'model_gap_strength_0_100 = 100 - original_19_facility_policy_coverage_score_0_100; original=inside polygon?100:min(100,nearest_facility_point_distance_m/5); road 5m length-weighted',
  road_classification_rule:'OSM primary, secondary, tertiary, primary_link, residential, service -> vehicle_network; footway, steps, pedestrian, footway:sidewalk, footway:crossing -> pedestrian_network; this is not legal road designation',
  priority_rule:'only valid vehicle_network and any 0-300m or 300-500m unprotected facility-point sample; sort model_gap_strength descending, 300m share descending, road metres descending, ID ascending; descriptive research ordering, not legal/risk ranking',
  severity_indicators_excluded:['lighting proximity','road width','TAAS crashes','PRI composite','slope'],
  unknown_2026_legal_designation:true,actual_student_route_unknown:true,official_notice_not_verified:true,neighboring_borough_facilities_missing:true,no_legal_non_designation_claim:true,no_auto_pri_penalty:true,
  point_distance_not_entrance_distance:true,
  interpretation:'0=model gap signal absent or existing registered polygon (not necessarily safe);100=strongest facility-point proximity mismatch; not safety, law violation or child traffic exposure',
  original_data_not_2026_current:true
 };
 const output={metadata,summary,segments:rows};
 const csvFields=[
  'id','road_name','osm_highway','network_kind','input_road_length_m','policy_coverage_score_0_100','model_gap_strength_0_100',
  'existing_zone_coverage_pct','near_facility_unprotected_0_300m_pct','near_facility_unprotected_300_500m_pct',
  'nearest_facility_name','nearest_facility_type','nearest_facility_point_distance_m','existing_2025_zone_model_category',
  'potential_vehicle_zone_gap_candidate','research_priority_rank','official_2026_catchment_names','official_2026_catchment_overlap_pct'
 ];
 const csv=[csvFields.join(','),...rows.map(row=>csvFields.map(f=>formatCsv(Array.isArray(row[f])?row[f].join(';'):row[f])).join(','))].join('\n')+'\n';
 const geo={type:'FeatureCollection',metadata,features:rows.filter(r=>r.input_road_length_m!==null).map(r=>({
  type:'Feature',
  properties:{id:r.id,road_name:r.road_name,network_kind:r.network_kind,osm_highway:r.osm_highway,
   model_gap_strength_0_100:r.model_gap_strength_0_100,existing_2025_zone_model_category:r.existing_2025_zone_model_category,
   potential_vehicle_zone_gap_candidate:r.potential_vehicle_zone_gap_candidate,research_priority_rank:r.research_priority_rank,
   nearest_facility_name:r.nearest_facility_name,nearest_facility_type:r.nearest_facility_type,
   official_2026_catchment_names:r.official_2026_catchment_names,not_verified_legal_zone:true},
  geometry:{type:'LineString',coordinates:byGeo.get(r.id).pts.map(([lat,lon])=>[lon,lat])}
 }))};
 assert.equal(geo.features.length,1676);
 assert.equal(summary.vehicle_network.potential_candidates,1157);
 assert.equal(summary.pedestrian_network.candidate_like_but_not_vehicle_road,381);
 return {output,csv,geo};
}
const files={
 json:filename+'.json',csv:filename+'.csv',geojson:filename+'.geojson'
};
const mode=process.argv[2]||'--verify';
if(!['--verify','--write'].includes(mode))throw new Error('Usage: node sangdo1_policy_gap_all_roads.mjs --verify|--write');
const generated=await generate();
if(mode==='--write'){
 await Promise.all([
  writeFile(path.join(folder,files.json),JSON.stringify(generated.output)),
  writeFile(path.join(folder,files.csv),generated.csv),
  writeFile(path.join(folder,files.geojson),JSON.stringify(generated.geo))
 ]);
}else{
 const [jsonSaved,csvSaved,geoSaved]=await Promise.all([
  readFile(path.join(folder,files.json),'utf8'),
  readFile(path.join(folder,files.csv),'utf8'),
  readFile(path.join(folder,files.geojson),'utf8')
 ]);
 assert.equal(jsonSaved,JSON.stringify(generated.output),'Published JSON must be reproducible');
 assert.equal(csvSaved,generated.csv,'Published CSV must be reproducible');
 assert.equal(geoSaved,JSON.stringify(generated.geo),'Published GIS features must be reproducible');
}
console.log(JSON.stringify({status:'PASS',mode,summary:generated.output.summary},null,2));
