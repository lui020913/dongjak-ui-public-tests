import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {routeComparisonItems,sameRoute,routePointProximity,metersLabel} from '../src/v804-route-comparison.js';
import {gpsAccuracyStatus,hapticCue} from '../src/v804-navigation-extras.js';
import {pedestrianWeatherAdvice} from '../src/v804-weather-safety.js';
import {reportPointCount,reportLineCount,reportDocument} from '../src/v804-analysis-report.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));
historicalSnapshotTest('v8.0.3 core map source remains byte-identical',()=>{
  const original='33c3f91f45f6e553d5f023a89afed30579026c667b6854ac7781a4108075d44a';
  assert.equal(createHash('sha256').update(read('src/main.js')).digest('hex'),original);
});
test('four extensions load through app and remain in existing safety drawer',()=>{
  const html=read('index.html');const init=read('src/v804-new-features.js');
  assert.match(html,/src="\/src\/v804-new-features.js"/);
  for(const id of ['dj804-report-panel','dj804-weather-safety','dj804-weather-toggle','dj804-report-print','dj804-report-html'])assert.match(init,new RegExp(id));
  assert.match(init,/#dj-safety-actions \.dj-safety-group-body/);
});
test('route comparison reports only calculated routes, not simulated third option',()=>{
  const coords=[[126.95,37.5],[126.951,37.501]],standard={coords,kilometers:.23,seconds:180,slopeAscentM:9,slopeUncertainM:30};
  const result=routeComparisonItems({standard,gentle:null});
  assert.equal(result.length,1);assert.equal(result[0].meters,230);assert.equal(result[0].minutes,3);
  assert.equal(metersLabel(result[0].meters),'230m');
  assert.equal(sameRoute(standard,{coords:coords.map(row=>[...row])}),true);
});
test('near-accident representative point count is spatial and cannot be treated as accident count',()=>{
  const route=[[126.95,37.5],[126.951,37.5]];
  assert.equal(routePointProximity(route,[[126.9505,37.5],[126.96,37.5]]),1);
  assert.equal(routePointProximity([],[[126.9505,37.5]]),null);
});
test('GPS haptic cues need verified accuracy and real maneuver',()=>{
  assert.deepEqual(gpsAccuracyStatus(12),{label:'GPS 신호 양호',level:'good'});
  assert.equal(gpsAccuracyStatus(75).level,'poor');
  assert.equal(hapticCue('30m 앞 · 좌회전',17),'turn:좌회전:30');
  assert.equal(hapticCue('30m 앞 · 좌회전',72),'');
  assert.equal(hapticCue('200m 앞 · 우회전',17),'');
});
test('weather notes distinguish observations from official warnings',()=>{
  const rain=pedestrianWeatherAdvice({temperature:18,apparentTemperature:17,precipitation:2,wind:10});
  assert.equal(rain.level,'caution');assert.match(rain.items.join(''),/강수/);
  assert.match(rain.reason,/공식/);
  assert.equal(pedestrianWeatherAdvice({temperature:20,apparentTemperature:20,precipitation:0,wind:4}).level,'normal');
  assert.equal(pedestrianWeatherAdvice({temperature:null,precipitation:undefined}).level,'unknown');
});
test('Sangdo1 official reference polygon filters real dataset points',()=>{
  const boundary=json('public/data/protection-zone/boundary_reference.geojson').features[0].geometry;
  const accidents=json('public/data/safety/accidents/dongjak_accident_points_all.geojson').features;
  const cctv=json('public/data/safety/cctv/dongjak_cctv_security.geojson').features;
  const near=reportPointCount(accidents,boundary);
  assert.ok(near>0&&near<accidents.length);
  assert.ok(reportPointCount(cctv,boundary)>0);
  const all=reportPointCount(accidents);assert.equal(all,accidents.length);
});
test('report line counts are approximate by representative midpoint not polygon false negatives',()=>{
  const boundary={type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]};
  assert.equal(reportLineCount([{geometry:{type:'LineString',coordinates:[[0,0],[1,1],[3,3]]}},{geometry:{type:'LineString',coordinates:[[5,5],[6,6]]}}],boundary),1);
});
test('generated report escapes values and labels data limitations',()=>{
  const html=reportDocument({area:'sangdo1',generatedAt:'2026-11-13',metrics:[{label:'<script>',value:null,note:'미확인'}]});
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(!html.includes('<script>'));
  assert.match(html,/보행안전 자료 현황/);assert.match(html,/PDF로 저장/);
  assert.match(html,/중복 가능성/);assert.match(html,/미확인/);
});
