import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {combineRouteSegments,computeMultiStopRoutes,buildRailGraph,shortestRailConnection,railTransferOptions,uniqueValidWaypoints} from '../src/v815-route-planner.js';
import {placeShareUrl,parseSharedPlace,multiStopShareUrl,parseSharedRoute,cleanPlace,toggleSavedPlace,savedPlaces,setSavedPlaceFolder} from '../src/v815-place-store.js';
const root=new URL('../',import.meta.url);
const source=p=>fs.readFileSync(new URL(p,root),'utf8');
const way=(lng,lat,name)=>({lng,lat,name});
const a=way(126.94,37.5,'출발'),b=way(126.95,37.5,'경유'),c=way(126.96,37.5,'도착');
const leg=(start,end,source='seoul-pedestrian-graph')=>({coords:[[start.lng,start.lat],[end.lng,end.lat]],seconds:200,kilometers:0.34,
  slopeAscentM:2,slopeDescentM:1,slopeUncertainM:0,maneuvers:[{index:0,type:2}],source});
test('only explicit 1..5 valid waypoints are accepted',()=>{
 assert.equal(uniqueValidWaypoints([b]).length,1);
 assert.throws(()=>uniqueValidWaypoints(Array(6).fill(b)),/최대 5개/);
 assert.throws(()=>uniqueValidWaypoints([{lng:0,lat:0}]),/좌표/);
});
test('multi-stop route aggregates real leg coordinates and trip metrics',async()=>{
 let called=0;
 const result=await computeMultiStopRoutes([a,b,c],async(from,to)=>{
   called++;return {standard:leg(from,to),gentle:leg(from,to)};
 });
 assert.equal(called,2);assert.equal(result.standard.coords.length,3);
 assert.equal(result.standard.seconds,400);assert.equal(result.standard.kilometers,.68);
 assert.equal(result.standard.maneuvers[1].index,1);
 assert.equal(result.standard.segmentCount,2);
});
test('incomplete modes cannot be silently renamed or fabricated',async()=>{
 const result=await computeMultiStopRoutes([a,b,c],async(from,to)=>({standard:leg(from,to),gentle:from===a?leg(from,to):null}));
 assert.equal(result.gentle,null);assert.ok(result.standard);
});
test('missing both modes in any leg fails without a straight-line substitute',async()=>{
 await assert.rejects(()=>computeMultiStopRoutes([a,b,c],async(from)=>from===a?{standard:leg(a,b)}:{}),/계산 실패/);
});
test('mixed-source routes must identify their mixed source',()=>{
 const result=combineRouteSegments([leg(a,b),leg(b,c,'valhalla-external')],'standard');
 assert.equal(result.source,'mixed-walking-network');
});
test('rail path supports 7-to-4 transfer at interchange station',()=>{
 const path=shortestRailConnection('상도','동작');
 assert.ok(path);assert.ok(path.stops.includes('이수'));
 assert.ok(path.lines.includes('7'));assert.ok(path.lines.includes('4'));
});
test('rail planner excludes endpoints too far from known stations',()=>{
 assert.deepEqual(railTransferOptions({lng:126.7,lat:37.7},{lng:126.9,lat:37.5}),[]);
});
test('rail candidate includes explicit unverified timetable heuristic',()=>{
 const options=railTransferOptions({lng:126.94791,lat:37.502834},{lng:126.941005,lat:37.513534});
 assert.ok(options.length);assert.ok(options[0].railStops>=1);
});
test('shared place and ordered route URLs roundtrip coordinates',()=>{
 const p=parseSharedPlace(placeShareUrl(a,'https://example.org/map?other=1'));
 assert.equal(p.name,a.name);assert.equal(p.lng,a.lng);
 const route=parseSharedRoute(multiStopShareUrl([a,b,c],'https://example.org/map'));
 assert.deepEqual(route.map(x=>x.name),['출발','경유','도착']);
});
test('invalid location cannot be saved or shared',()=>{
 assert.equal(cleanPlace({lng:0,lat:0}),null);
 assert.equal(placeShareUrl({lng:0,lat:0}), '');
 assert.equal(parseSharedRoute('https://example.org/?dj_route=5,5,X|6,6,Y'),null);
});
test('local favorites folders are persisted only to browser storage',()=>{
 const store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const ret=toggleSavedPlace(a);assert.deepEqual(ret,{ok:true,saved:true});
 assert.ok(setSavedPlaceFolder(a,'학교'));
 assert.equal(savedPlaces()[0].folder,'학교');
 assert.equal(toggleSavedPlace(a).saved,false);
 delete globalThis.localStorage;
});
historicalSnapshotTest('main route core modifies only explicit routing integration points, not map style/transport source',()=>{
 const main=source('src/main.js');
 assert.match(main,/computeMultiStopRoutes\(\[routeStart,\.\.\.routeWaypoints,routeEnd\]/);
 assert.match(main,/installMapProduct\(/);
 assert.match(main,/routeWaypoints\.push/);
 const protectedFiles=['src/transport-map.js','src/ui-environment.js','src/map-startup-loader.js'];
 const expected={'src/transport-map.js':'15c1bd89214dddbff3b0840994c89032f293076b9d837c2e380be6f5b6a93c3a',
 'src/ui-environment.js':'4584700d36425038d7d8b7961d5c14f8551cb3c9a49770cf926ae8809ef8e74f',
 'src/map-startup-loader.js':'20bfb58dc5a0c212842e41f4b4b2d1d889d8a832a9b1eed296310ad3c83c1ea6'};
 for(const p of protectedFiles)assert.equal(crypto.createHash('sha256').update(p==='src/transport-map.js'?stripApprovedV825TransportUI(source(p)):source(p)).digest('hex'),expected[p]);
});
test('search and popup integrate explicit save/share and verified-area search',()=>{
 assert.match(source('src/map-quick-search.js'),/viewResults\(/);
 assert.match(source('src/map-quick-search.js'),/dongjak:map-place-selected/);
 assert.match(source('src/place-details.js'),/toggleSavedPlace/);
 assert.match(source('src/v815-map-product.js'),/recentPlaces/);
 assert.match(source('src/v815-map-product.js'),/onTransitPreview/);
});
