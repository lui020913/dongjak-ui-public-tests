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
 const filename=path.resolve(here,'../public/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
 const geo=JSON.parse(await readFile(filename,'utf8'));
 assert.equal(verifyPolicyGapFeatures(geo),1606);
 assert.equal(geo.metadata.score_direction,'risk');
 assert.equal(geo.metadata.schema,'sangdo1_policy_gap_2factor_adminscope_risk_v3');
 assert.equal(geo.features.filter(f=>f.properties.combined_new_score===null).length,603);
 assert.ok(geo.features.some(f=>f.properties.combined_new_score!==null));
 const bad={...geo,features:geo.features.map((f,i)=>i?f:{...f,properties:{...f.properties,team_average_divisor:99}})};
 assert.throws(()=>verifyPolicyGapFeatures(bad),/평균/);
});
test('native PRI vulnerability retains its 50:50 factor alongside independent research overlay',async()=>{
 const [main,html,pri,manifestText]=await Promise.all([
  readFile(path.resolve(here,'../src/main.js'),'utf8'),
  readFile(path.resolve(here,'../index.html'),'utf8'),
  readFile(path.resolve(here,'../src/pri-map.js'),'utf8'),
  readFile(path.resolve(here,'../public/data/pri/manifest.json'),'utf8')
 ]);
 const manifest=JSON.parse(manifestText);
 assert.ok(main.includes('installPriMap({map,maplibregl,app,restoreMode:themeReloadState?.priMode})'));
 // PR255 added a separate opt-in research overlay. It must never replace the native PRI factor.
 assert.equal(main.split('installPolicyGapThreeSourceMap({map,maplibregl,app,nightMode,protectionOverlay})').length-1,1);
 assert.ok(!pri.includes('installPolicyGapThreeSourceMap'));
 assert.ok(!manifest.patches.some(p=>p.includes('3source')));
 assert.ok(main.includes('installProtectionZoneMap({map,maplibregl,app,nightMode})'));
 assert.ok(main.includes('installBochaRoadLayer({map,maplibregl,app})'));
 assert.ok(!html.includes('walking-vulnerability-layer-group'));
 assert.ok(pri.includes("title=el('h2','','보행 취약도')"));
 assert.ok(pri.includes("id==='protectionGap'?' · 2지표·300m'"));
 assert.ok(pri.includes('protectionGapColors'));
 assert.ok(pri.includes('scopedPolicyFeatures(policyScope)'),'policy map must render clipped inside-dong geometry');
 assert.ok(pri.includes("const activeColors=mode==='protectionGap'?protectionGapColors:colors"),'other factors use standard risk colors');
 assert.ok(pri.includes("scopedCompositeFeatures(policyScope,new Map(dataset.segments.map(s=>[s.id,riskValue(segmentScore(dataset,s,id))])))"),'other factors preserve their scores on scoped geometry');
 assert.ok(pri.includes('높을수록 상대적으로 큰 취약 신호'),'popup must say high score is bad');
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json'));
});
test('scoped scores exclude outside roads and preserve 683 gray NULL segments',async()=>{
 const [{adaptLighting,parseImport,segmentScore,displayFeatures},rawLight,rawAcc,rawGap]=await Promise.all([
  import('../src/pri-data.mjs'),
  readFile(path.resolve(here,'../public/data/pri/lighting_segments.json'),'utf8'),
  readFile(path.resolve(here,'../public/data/pri/sangdo1_accidents_factor.json'),'utf8'),
  readFile(path.resolve(here,'../public/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json'),'utf8')
 ]);
 const lighting=adaptLighting(JSON.parse(rawLight)),acc=JSON.parse(rawAcc),gap=JSON.parse(rawGap);
 assert.equal(lighting.networkVersion,gap.networkVersion);
 assert.equal(gap.factor.id,'protectionGap');
 assert.equal(gap.factor.scoreDirection,'risk');
 assert.equal(gap.scores.find(s=>s.id==='278148191_3').score,73.0);
 assert.equal(gap.scores.find(s=>s.id==='278024801_2').score,67.9);
 assert.equal(gap.scores.length,1686);
 assert.equal(gap.scores.filter(row=>row.score===null).length,683);
 assert.equal(new Set(gap.scores.map(s=>s.id)).size,1686);
 const linked=parseImport(gap,parseImport(acc,lighting));
 assert.ok(linked.factors.some(f=>f.id==='protectionGap'));
 assert.equal(linked.segments.filter(s=>s.scores.protectionGap!==null).length,1003);
 assert.equal(linked.segments.filter(s=>segmentScore(linked,s,'protectionGap')===null).length,683);
 assert.ok(linked.segments.some(s=>s.scores.protectionGap===0||s.scores.protectionGap>0));
 assert.ok(Math.abs(linked.segments.find(s=>s.id==='278148191_3').scores.protectionGap-27.0)<1e-9);
 assert.ok(Math.abs(linked.segments.find(s=>s.id==='278024801_2').scores.protectionGap-32.1)<1e-9);
 assert.ok(Math.abs((100-linked.segments.find(s=>s.id==='278148191_3').scores.protectionGap)-73.0)<1e-9);
 assert.ok(Math.abs((100-linked.segments.find(s=>s.id==='278024801_2').scores.protectionGap)-67.9)<1e-9);
 const rendered=displayFeatures(linked,'protectionGap');
 assert.ok(rendered.features.some(f=>f.properties.evaluated===false),'gray segments are rendered rather than silently omitted');
 assert.ok(rendered.features.some(f=>f.properties.evaluated===true),'scored segments are rendered');
 assert.equal(linked.config.status,'draft','do not claim to have six final team indicators yet');
});
