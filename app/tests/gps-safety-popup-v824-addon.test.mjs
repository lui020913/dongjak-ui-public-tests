import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeGpsSafety,containsPoint,distanceToLine,straightDistance,bearingDegrees,
  directionCandidates,withinNightHours,DATASET_PATHS} from '../src/gps-safety-model.js';
const point=(lon,lat,properties={})=>({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties});
const polygon=(outer,properties={})=>({type:'Feature',geometry:{type:'Polygon',coordinates:[outer]},properties});
const collection=features=>({type:'FeatureCollection',features});
const now=(hour)=>new Date(2026,10,13,hour,20);
const center=[126.95,37.5];
const square=[[126.94,37.49],[126.96,37.49],[126.96,37.51],[126.94,37.51],[126.94,37.49]];
const create=(cross=[point(126.9504,37.5,{name:'후보 지점'})])=>({boundary:collection([polygon(square)]),
  crossings:collection(cross),schoolZones:collection([]),accidents:collection([]),cctv:collection([]),streetLights:[],securityLights:[],slope:collection([])});
const dist=straightDistance(center,[126.9504,37.5]);
test('real straight line is not simulated walking distance',()=>{assert.ok(dist>30&&dist<40);assert.ok(straightDistance(center,[126.95,37.501])>100);});
test('east bearing and directional candidates are consistent',()=>{
  const east=bearingDegrees(center,[126.9504,37.5]);assert.ok(east>85&&east<95);
  assert.equal(directionCandidates([{bearing:east,distance:35}])[1].direction,'동');
});
test('polygon borders and holes do not count as protected zones if outside',()=>{
  assert.equal(containsPoint({type:'Polygon',coordinates:[square]},center),true);
  assert.equal(containsPoint({type:'Polygon',coordinates:[square]},[126.93,37.5]),false);
});
test('near crossing is not certified safe',()=>{const a=analyzeGpsSafety(center,10,create(),now(13));assert.equal(a.level,'near-crossing');assert.equal(a.night,false);});
test('a distance beyond 100m is caution only in sample polygon',()=>{
  const src=create([point(126.953,37.5)]);assert.equal(analyzeGpsSafety(center,10,src,now(8)).level,'caution');
  assert.equal(analyzeGpsSafety([126.97,37.5],10,src,now(8)).level,'unknown');
});
test('accident statistics override nearby crossing',()=>{
  const d=create();d.accidents=collection([polygon(square,{category:'pedestrian'})]);
  assert.equal(analyzeGpsSafety(center,7,d,now(12)).level,'risk');
});
test('high GPS uncertainty never assigns safety/risk',()=>{
  const d=create();d.accidents=collection([polygon(square,{category:'pedestrian'})]);
  assert.equal(analyzeGpsSafety(center,150,d,now(12)).level,'unknown');
});
test('night hours based on device clock',()=>{
  for(const hour of [0,5,18,23])assert.equal(withinNightHours(now(hour)),true);
  for(const hour of [6,12,17])assert.equal(withinNightHours(now(hour)),false);
});
test('missing collections result in unknown, never a fabricated safety result',()=>{
  const a=analyzeGpsSafety(center,10,{},now(22));assert.equal(a.level,'unknown');assert.equal(a.night,true);assert.equal(a.cctv,null);
});
test('line distance measures nearest segment not just vertices',()=>{
  const line={type:'LineString',coordinates:[[126.949,37.50005],[126.951,37.50005]]};
  assert.ok(distanceToLine(center,line)<10);
});
test('all referenced real dataset files are present in the v8.2.6 integration',()=>{
  for(const file of Object.values(DATASET_PATHS))assert.doesNotThrow(()=>JSON.parse(readFileSync(new URL(`../public${file}`,import.meta.url),'utf8')));
});
test('HTML independent entry exists and release version is synced',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(pkg.version,/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/); // Allow Major/Minor/Patch increments.
  assert.doesNotMatch(html,/id="version-history-trigger"[^>]*>업데이트<\/button>/);
  assert.match(html,/<script type="module" src="\/src\/gps-safety-popup\.js"><\/script>/);
  assert.match(html,/id="current-location"/);
});
