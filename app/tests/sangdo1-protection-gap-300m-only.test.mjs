import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const prefix=path.join(root,'app/public/data/protection-zone/');
const load=async file=>JSON.parse(await readFile(path.join(prefix,file),'utf8'));
test('single 300m study radius, correct grade ordering and no team PRI leakage',async()=>{
 const [d,g]=await Promise.all([
  load('sangdo1_protection_gap_300m_20261122.json'),
  load('sangdo1_protection_gap_300m_20261122.geojson')
 ]);
 assert.equal(d.metadata.radius_m,300);
 assert.equal(d.metadata.only_radius_m,300);
 assert.equal(d.metadata.lower_score_stronger_spatial_gap,true);
 assert.equal(d.metadata.no_weights_from_other_team_sources,true);
 assert.equal(d.metadata.legal_missing_zone_verified,false);
 assert.equal(d.metadata.entrance_300m_not_confirmed,true);
 assert.equal(d.metadata.unscored_outside_radius.startsWith('null'),true);
 assert.equal(d.metadata.disability_status,'not_evaluated_missing_reference_data');
 assert.equal(d.segments.length,1686);
 assert.equal(g.features.length,1676);
 assert.equal(d.summary.by_type['어린이'].vehicle_candidates,858);
 assert.equal(d.summary.by_type['노인'].vehicle_candidates,562);
 const colors={'매우 큰 공백':'#D64550','큰 공백':'#F18C4A','중간 공백':'#E5BC52','작은 공백':'#7EAF83','기존 등록 보호구역':'#338D80'};
 for(const row of d.segments){
  for(const type of ['어린이','노인']){
   const v=row.types[type];
   if(v.score===null){assert.equal(v.color,'#A3AAB4');assert.equal(v.candidate,false);continue}
   assert.ok(v.score>=0&&v.score<=100);
   assert.equal(v.color,colors[v.grade]);
   if(v.grade==='매우 큰 공백')assert.ok(v.score<25);
   if(v.grade==='큰 공백')assert.ok(v.score>=25&&v.score<50);
   if(v.grade==='중간 공백')assert.ok(v.score>=50&&v.score<75);
   if(v.grade==='작은 공백')assert.ok(v.score>=75&&v.score<=100);
   if(v.grade==='기존 등록 보호구역')assert.equal(v.unprotected_length_m,0);
   if(v.candidate)assert.equal(row.network_kind,'vehicle_network');
  }
 }
});
test('full 300m GIS recomputation matches every published score and map color',()=>{
 const script=path.join(root,'scripts/research/sangdo1_policy_gap_300m_verify.mjs');
 const out=JSON.parse(execFileSync(process.execPath,[script],{encoding:'utf8',timeout:90000}));
 assert.equal(out.result,'PASS');
 assert.equal(out.radius_m,300);
 assert.equal(out.counts['어린이'].vehicleCandidates,858);
 assert.equal(out.counts['노인'].vehicleCandidates,562);
});
