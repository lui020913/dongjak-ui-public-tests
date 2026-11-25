import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {speedLimitRiskScore,speedRiskDisplay,validateSpeedRiskSource,speedRiskCounts,SPEED_RISK_RULES} from '../src/pri-speed-risk.mjs';
import {scopedPolicyFeatures} from '../src/pri-scope-data.mjs';
import {adaptLighting,currentVulnerabilityScore,currentVulnerabilityCoverage} from '../src/pri-data.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));

test('uploaded PDF thresholds apply only to actual limits, never invented intervals',()=>{
 assert.deepEqual(SPEED_RISK_RULES.map(x=>x.risk),[0,40,80,100]);
 for(const [limit,want] of [[10,0],[20,0],[29.9,0],[30,40],[40,80],[50,100],
  [35,null],[45,null],[60,null],[-1,null],[null,null],[undefined,null],['50',null]]){
  assert.equal(speedLimitRiskScore(limit),want,'unexpected risk for '+String(limit));
 }
});

test('206 dated original speed links retain real source IDs and strict 23/68/20/95 counts',()=>{
 const raw=read('../public/data/road-speed/sangdo1_speed_links.geojson');
 const metadata=read('../public/data/road-speed/metadata.json');
 const source=validateSpeedRiskSource(raw),count=speedRiskCounts(source.features);
 assert.equal(source.features.length,206);
 assert.deepEqual(count,{observed:{0:23,40:68,80:20,100:95},unknown:0,total:206});
 assert.equal(metadata.speed_record_updated,'2025-05-12');
 assert.deepEqual(Object.keys(metadata.counts).sort(),['10','30','40','50']);
 for(const f of source.features)assert.equal(f.properties.updated,'20250512');
});

test('speed uses its own GIS links, with all unmatched shared road centerlines NULL/grey',()=>{
 const raw=read('../public/data/road-speed/sangdo1_speed_links.geojson');
 const scope=read('../public/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
 const sourceReference=scopedPolicyFeatures(scope);
 const scoreSnapshot=scope.features.map(f=>[f.properties.segment_id,f.properties.combined_new_score]);
 assert.equal(sourceReference.features.length,1606);
 assert.equal(sourceReference.features.filter(f=>f.properties.evaluated).length,1003);
 assert.equal(sourceReference.features.filter(f=>!f.properties.evaluated).length,603);
 const collection=speedRiskDisplay(raw,sourceReference.features),all=collection.features;
 assert.equal(all.length,1812);
 assert.equal(all.filter(f=>f.properties.speedSource==='observed-link').length,206);
 assert.equal(all.filter(f=>f.properties.speedSource==='unmatched-reference').length,1606);
 assert.ok(all.slice(0,1606).every(f=>f.properties.score===null&&!f.properties.evaluated));
 assert.ok(all.slice(1606).every(f=>f.properties.linkId&&f.properties.segmentId.startsWith('speed-link:')));
 assert.ok(all.slice(1606).every(f=>f.properties.score===speedLimitRiskScore(f.properties.speed)));
 assert.deepEqual(scope.features.map(f=>[f.properties.segment_id,f.properties.combined_new_score]),scoreSnapshot);
});

test('missing/unsupported limits are NULL, and duplicates or corrupt road geometries are rejected',()=>{
 const real=read('../public/data/road-speed/sangdo1_speed_links.geojson');
 const one=structuredClone(real.features[0]);
 one.properties.link_id='unknown-test-1'; // invalid source ID: do not accept fabricated labels
 assert.throws(()=>validateSpeedRiskSource({type:'FeatureCollection',features:[one]}));
 const testLink=structuredClone(real.features[0]);
 testLink.properties.link_id='999999991';
 testLink.properties.speed=60;
 const candidate=validateSpeedRiskSource({type:'FeatureCollection',features:[testLink]});
 assert.equal(speedRiskDisplay(candidate).features[0].properties.score,null);
 assert.equal(speedRiskCounts(candidate.features).unknown,1);
 const duplicate=structuredClone(real.features[0]);
 assert.throws(()=>validateSpeedRiskSource({type:'FeatureCollection',features:[duplicate,duplicate]}));
});

test('old three-factor PRI cannot silently count unjoined speed links as a fourth factor',()=>{
 const lighting=adaptLighting(read('../public/data/pri/lighting_segments.json'));
 assert.equal(lighting.segments.length,1686);
 assert.ok(lighting.segments.every(s=>s.scores.speed===null));
 const summary=lighting.segments.map(s=>[currentVulnerabilityScore(s),currentVulnerabilityCoverage(s)]);
 speedRiskDisplay(read('../public/data/road-speed/sangdo1_speed_links.geojson'));
 assert.deepEqual(lighting.segments.map(s=>[currentVulnerabilityScore(s),currentVulnerabilityCoverage(s)]),summary);
});

test('the real vulnerability modal loads and renders the PDF-based mode without changing the official gap factor',()=>{
 const js=readFileSync(new URL('../src/pri-map.js',import.meta.url),'utf8');
 assert.match(js,/speedSource=validateSpeedRiskSource\(await response\.json\(\)\)/);
 assert.match(js,/\['speed','제한속도 위험도 · 상도1동 표준노드링크'\]/);
 assert.match(js,/id==='speed'\?speedRiskDisplay\(speedSource/);
 assert.match(js,/id==='speed'\?Boolean\(speedSource\?\.features\?\.length\)/);
 assert.match(js,/map\.setLayoutProperty\(SPEED_LINE,'visibility',mode==='speed'\?'visible':'none'\)/);
 assert.match(js,/id==='speed'\?'제한속도 위험도 · 표준노드링크'/);
 assert.match(js,/중학교 관련 보호 공백 점수: 미산정 \(NULL\)/);
 assert.doesNotMatch(js,/SCHOOL_LINE|SCHOOL_COLOR/);
 assert.match(js,/win\.fetch\(SPEED_RISK_SOURCE/);
 const manifest=read('../public/data/pri/manifest.json');
 assert.ok(manifest.patches.every(x=>!x.includes('speed')));
});
