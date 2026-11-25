import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeBochaRoadGeoJSON,summarizeBochaRoadGeoJSON} from '../src/bocha-road-layer.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');

test('237 actual Sangdo1 source segments are digitized from PDF and remain unscored and excluded from route penalties',async()=>{
 const raw=JSON.parse(await read('../public/data/sangdo1-analysis-view/bocha-mixed-roads.geojson'));
 const normalized=normalizeBochaRoadGeoJSON(raw);
 assert.deepEqual(summarizeBochaRoadGeoJSON(normalized),{featureCount:237,scoredCount:0,unscoredCount:237,approximateLengthM:15845.5});
 assert.equal(raw.metadata.source_is_vector,false);
 assert.match(raw.metadata.accuracy_warning,/실제 상도1동 현황자료/);
 for(const feature of normalized.features){
  assert.equal(feature.geometry.type,'LineString');
  assert.equal(feature.properties.assessment_status,'미평가');
  assert.equal(feature.properties.score,null);
  assert.equal(feature.properties.route_penalty_allowed,false);
  assert.match(feature.properties.source_note,/실제 상도1동 현황자료/);
  assert.match(feature.properties.position_accuracy,/근사/);
 }
});

test('invalid and empty data is rejected instead of silently treated as safe',()=>{
 assert.throws(()=>normalizeBochaRoadGeoJSON({type:'FeatureCollection',features:[]}),/선형이 없습니다/);
 assert.throws(()=>normalizeBochaRoadGeoJSON({type:'Feature',features:[]}),/FeatureCollection/);
});

test('native safety workbench no longer exposes duplicate bocha analysis; shared clear styling is retained',async()=>{
 const [main,html,workbench,baseCss,polishCss,desktopCss]=await Promise.all([
  read('../src/main.js'),read('../index.html'),read('../src/safety-workbench-v7103.js'),
  read('../src/safety-workbench-v7103.css'),read('../src/safety-polish-v7104.css'),read('../src/v819-safety-one-screen.css')
 ]);
 assert.doesNotMatch(main,/installBochaRoadLayer\(/);
 assert.doesNotMatch(html,/id="sangdo-bocha-toggle"/);
 assert.doesNotMatch(html,/data-bocha-import aria-pressed="false"/);
 assert.ok(workbench.includes('[data-bocha-import][aria-pressed="true"]:not(:disabled)'));
 for(const css of [baseCss,polishCss,desktopCss]){
  assert.match(css,/button:is\(\[data-dj-import\],\[data-bocha-import\]\)/);
  assert.doesNotMatch(css,/button\[data-dj-import\]/);
 }
});
