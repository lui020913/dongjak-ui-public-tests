import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {policyGapTeamAverage,verifyPolicyGapFeatures} from '../src/policy-gap-2factor-map-patch.js';
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
 const filename=path.resolve(here,'../public/data/protection-zone/sangdo1_policy_gap_2factor_300m_20261122.geojson');
 const geo=JSON.parse(await readFile(filename,'utf8'));
 assert.equal(verifyPolicyGapFeatures(geo),1676);
 assert.equal(geo.features.filter(f=>f.properties.combined_new_score===null).length,590);
 assert.ok(geo.features.some(f=>f.properties.combined_new_score!==null));
 const bad={...geo,features:geo.features.map((f,i)=>i?f:{...f,properties:{...f.properties,team_average_divisor:99}})};
 assert.throws(()=>verifyPolicyGapFeatures(bad),/평균/);
});
test('native PRI vulnerability menu replaces duplicate map-options overlay',async()=>{
 const [main,html,pri,manifestText]=await Promise.all([
  readFile(path.resolve(here,'../src/main.js'),'utf8'),
  readFile(path.resolve(here,'../index.html'),'utf8'),
  readFile(path.resolve(here,'../src/pri-map.js'),'utf8'),
  readFile(path.resolve(here,'../public/data/pri/manifest.json'),'utf8')
 ]);
 const manifest=JSON.parse(manifestText);
 assert.ok(main.includes('installPriMap({map,maplibregl,app,restoreMode:themeReloadState?.priMode})'));
 assert.ok(!main.includes('installPolicyGapThreeSourceMap'));
 assert.ok(main.includes('installProtectionZoneMap({map,maplibregl,app,nightMode})'));
 assert.ok(main.includes('installBochaRoadLayer({map,maplibregl,app})'));
 assert.ok(!html.includes('walking-vulnerability-layer-group'));
 assert.ok(pri.includes("title=el('h2','','보행 취약도')"));
 assert.ok(pri.includes("id==='protectionGap'?' · 2지표·300m'"));
 assert.ok(pri.includes('protectionGapColors'));
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_2factor_factor.json'));
});
test('two-factor scores enable the existing 제도적 사각지대 row and preserve 600 gray NULL segments',async()=>{
 const [{adaptLighting,parseImport,segmentScore,displayFeatures},rawLight,rawAcc,rawGap]=await Promise.all([
  import('../src/pri-data.mjs'),
  readFile(path.resolve(here,'../public/data/pri/lighting_segments.json'),'utf8'),
  readFile(path.resolve(here,'../public/data/pri/sangdo1_accidents_factor.json'),'utf8'),
  readFile(path.resolve(here,'../public/data/pri/sangdo1_protection_gap_2factor_factor.json'),'utf8')
 ]);
 const lighting=adaptLighting(JSON.parse(rawLight)),acc=JSON.parse(rawAcc),gap=JSON.parse(rawGap);
 assert.equal(lighting.networkVersion,gap.networkVersion);
 assert.equal(gap.factor.id,'protectionGap');
 assert.equal(gap.scores.length,1686);
 assert.equal(gap.scores.filter(row=>row.score===null).length,600);
 assert.equal(new Set(gap.scores.map(s=>s.id)).size,1686);
 const linked=parseImport(gap,parseImport(acc,lighting));
 assert.ok(linked.factors.some(f=>f.id==='protectionGap'));
 assert.equal(linked.segments.filter(s=>s.scores.protectionGap!==null).length,1086);
 assert.equal(linked.segments.filter(s=>segmentScore(linked,s,'protectionGap')===null).length,600);
 assert.ok(linked.segments.some(s=>s.scores.protectionGap===0||s.scores.protectionGap>0));
 assert.equal(linked.segments.find(s=>s.id==='278148191_3').scores.protectionGap,27.1);
 assert.equal(linked.segments.find(s=>s.id==='278024801_2').scores.protectionGap,32.1);
 const rendered=displayFeatures(linked,'protectionGap');
 assert.ok(rendered.features.some(f=>f.properties.evaluated===false),'gray segments are rendered rather than silently omitted');
 assert.ok(rendered.features.some(f=>f.properties.evaluated===true),'scored segments are rendered');
 assert.equal(linked.config.status,'draft','do not claim to have six final team indicators yet');
});
