import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {policyGapTeamAverage,verifyPolicyGapFeatures} from '../src/policy-gap-3source-map-patch.js';
const here=path.dirname(fileURLToPath(import.meta.url));
test('gray NULL only excludes policy factor; other five factors remain weighted equally',()=>{
 assert.deepEqual(policyGapTeamAverage([50,60,70,80,40],null),{score:60,indicatorCount:5});
 assert.deepEqual(policyGapTeamAverage([50,60,70,80,40],''),{score:60,indicatorCount:5});
 assert.deepEqual(policyGapTeamAverage([50,60,70,80,40],20),{score:53.3,indicatorCount:6});
 assert.deepEqual(policyGapTeamAverage([50,60,70,80,40],100),{score:66.7,indicatorCount:6});
 assert.throws(()=>policyGapTeamAverage([50,60,70,80],null),TypeError);
 assert.throws(()=>policyGapTeamAverage([50,60,70,80,40],101),RangeError);
});
test('MapLibre overlay GeoJSON passes expected record and gray-color checks',async()=>{
 const filename=path.resolve(here,'../public/data/protection-zone/sangdo1_policy_gap_3source_300m_20261122.geojson');
 const geo=JSON.parse(await readFile(filename,'utf8'));
 assert.equal(verifyPolicyGapFeatures(geo),1676);
 assert.equal(geo.features.filter(f=>f.properties.combined_new_score===null).length,590);
 assert.ok(geo.features.some(f=>f.properties.combined_new_score!==null));
 const bad={...geo,features:geo.features.map((f,i)=>i?f:{...f,properties:{...f.properties,team_average_divisor:99}})};
 assert.throws(()=>verifyPolicyGapFeatures(bad),/평균/);
});
test('research patch is retained offline without duplicate public layer wiring',async()=>{
 const main=await readFile(path.resolve(here,'../src/main.js'),'utf8');
 assert.doesNotMatch(main,/installPolicyGapThreeSourceMap\(/);
 assert.doesNotMatch(main,/installProtectionZoneMap\(/);
 assert.doesNotMatch(main,/installBochaRoadLayer\(/);assert.match(main,/installPriMap\(/);
});
