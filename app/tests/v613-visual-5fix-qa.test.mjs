import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nightFeatureVisible,NIGHT_DETAIL_ZOOM} from '../src/night-visibility-map.js';
import {busCoverageSamples} from '../src/bus-coverage-grid.js';
import {HANGANG_BRIDGE_REFERENCES,bridgeReferenceCollection,installHangangBridgeLabels} from '../src/hangang-bridge-labels.js';
import {createMetroLineCard} from '../src/transport-map.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('night light geometry remains available in close pitched views, but city overview stays clean',()=>{
  for(const pitch of [0,20,43,59,70]){
    assert.equal(nightFeatureVisible('dj-night-light-point',NIGHT_DETAIL_ZOOM.light+0.5,true,pitch),true);
    assert.equal(nightFeatureVisible('dj-night-reach-fill',NIGHT_DETAIL_ZOOM.reach+0.5,true,pitch),true);
    assert.equal(nightFeatureVisible('dj-night-light-point',13,true,pitch),false);
    assert.equal(nightFeatureVisible('dj-night-reach-fill',13,true,pitch),false);
  }
  assert.match(read('src/night-visibility-map.js'),/placeLampsBelowBuildings/);
});

test('bus fallback preserves OSM source coordinates while native tile pictograms are suppressed',()=>{
  const code=read('src/transport-map.js');
  const setup=code.slice(code.indexOf('function labelVisibility(map)'),code.indexOf('export function initTransportMap'));
  const init=code.slice(code.indexOf('export function initTransportMap'),code.indexOf('function combineStations'));
  assert.match(init,/suppressNativeBusStopGlyphs\(map\)/);
  assert.match(code,/map\.querySourceFeatures\(poiLayer\.source,\{sourceLayer:'poi'\}\)/);
  assert.match(code,/<14\.25\s*\|\|/);
  assert.match(code,/minzoom:16\.4/);
  const map={getZoom:()=>14.5,getCanvas:()=>({clientWidth:800,clientHeight:600}),
    getCenter:()=>({lng:126.95,lat:37.5}),unproject:([x,y])=>({lng:126.949+(x-400)*0.00001,lat:37.5+(y-300)*0.00001})};
  assert.ok(busCoverageSamples(map).length>0);
  assert.equal(busCoverageSamples({...map,getZoom:()=>13.8}).length,0);
});

test('two requested bridge labels start on changed mid-river references and resist short ramps',()=>{
  const mapLabels=Object.fromEntries(bridgeReferenceCollection().features.map(f=>[f.properties.name,f.geometry.coordinates]));
  assert.ok(mapLabels['동작대교'][1]<37.515);
  assert.ok(Math.abs(mapLabels['반포대교'][1]-37.51550)<0.0003);
  const layers=[{id:'transportation-name',type:'symbol','source-layer':'transportation_name',source:'road'}];
  const sources=new Map(),handlers={};
  const map={addSource(id,config){sources.set(id,{data:config.data,setData(d){this.data=d}});},getSource:id=>sources.get(id),
    addLayer(layer){layers.push(layer);},getStyle:()=>({layers}),getLayer:id=>layers.find(f=>f.id===id),
    getFilter:()=>null,setFilter(){},moveLayer(){},on(name,fn){handlers[name]=fn;},once(){},off(){},
    queryRenderedFeatures:()=>[],querySourceFeatures:()=>[{properties:{name:'동작대교'},geometry:{type:'LineString',coordinates:[[126.98355,37.517],[126.98355,37.518]]}}]};
  const dispose=installHangangBridgeLabels(map,{fetchImpl:async()=>({ok:false,status:503})});
  handlers.moveend();
  const point=sources.get('dj-hangang-bridges-osm').data.features.find(f=>f.properties.name==='동작대교').geometry.coordinates;
  assert.deepEqual(point,mapLabels['동작대교'],'shoreline fragment must not move label away from crossing center');
  dispose();
});

test('subway panel has route rail, paired direction cards, real time and timetable controls',()=>{
  const html=read('index.html'),css=read('src/v613-map-ux.css'),js=read('src/transport-map.js');
  assert.match(html,/id="transport-tab-live"/);
  assert.match(html,/id="transport-tab-hours"/);
  assert.match(css,/\.metro-rail-current/);
  assert.match(css,/\.metro-direction-grid\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(js,/metro-rail-previous/);
  assert.match(js,/sectionLive\.parentNode\.insertBefore\(neighborsEl,sectionLive\)/);
  assert.match(js,/selectionBox\.parentNode\.insertBefore\(neighborsEl,selectionBox\)/);
  assert.match(js,/transport-tab-hours/);
});

test('3D rendering avoids full per-frame style changes and adapts phone resolution without hiding buildings',()=>{
  const js=read('src/main.js');
  assert.match(js,/djNormalPixelRatio=normalMapPixelRatio\(\{phone:djPhone,ua:navigator\.userAgent/);
  assert.match(js,/pixelRatio: djInitialBudget==='economy'\?1:djNormalPixelRatio/);
  assert.match(read('src/adaptive-phone-map-budget.mjs'),/phone\?\(highEnd\?3:2\):1\.5/);
  assert.match(js,/lastFootprintPaintKey/);
  assert.match(js,/updateFootprint && footprint/);
  assert.doesNotMatch(js,/movementIsSlow|slowSamples|interactiveMoving/);
  assert.match(js,/buildingPitchActive && loadedBuildingTiles\.size>0/);
  const budget=read('src/adaptive-phone-map-budget.mjs');
  assert.match(budget,/sample=nextBudget\(sample,ms\)/);
  assert.match(budget,/map\.setPixelRatio\(ratio\)/);
  assert.doesNotMatch(budget,/setLayoutProperty/);
});
