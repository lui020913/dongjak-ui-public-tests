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
test('research patch is wired without replacing existing protection or route tools',async()=>{
 const main=await readFile(path.resolve(here,'../src/main.js'),'utf8');
 assert.ok(main.includes("installPolicyGapThreeSourceMap({map,maplibregl,app,nightMode,protectionOverlay})"));
 assert.ok(main.includes("installProtectionZoneMap({map,maplibregl,app,nightMode})"));
 assert.ok(main.includes("installBochaRoadLayer({map,maplibregl,app})"));
});

test('three-source overlay belongs to Layer → 보행 취약도, not the safety drawer',async()=>{
 const html=await readFile(path.resolve(here,'../index.html'),'utf8');
 const source=await readFile(path.resolve(here,'../src/policy-gap-3source-map-patch.js'),'utf8');
 const optionsStart=html.indexOf('id="map-advanced-controls"');
 const category=html.indexOf('id="walking-vulnerability-layer-group"');
 const target=html.indexOf('id="walking-vulnerability-layer-controls"');
 const base=html.indexOf('id="base-layer-controls"');
 assert.ok(optionsStart>=0 && category>optionsStart && target>category && base>target,'vulnerability category must appear under map layer drawer');
 assert.ok(html.slice(category,target).includes('<summary>보행 취약도</summary>'));
 assert.ok(source.includes("document.getElementById('walking-vulnerability-layer-controls')"));
 assert.ok(!source.includes("document.getElementById('protection-zone-controls')"));
});
