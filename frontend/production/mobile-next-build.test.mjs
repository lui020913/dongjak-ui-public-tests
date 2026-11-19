import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHONE_CHOICES,normalizePhoneShortcuts} from '../src/mobile-next.js';
import {DongjakWalkSlopeRouter} from '../src/lib/dongjakWalkSlopeRouter.mjs';
import {computeMultiStopRoutes,railTransferOptions} from '../src/v815-route-planner.js';
const load=p=>JSON.parse(readFileSync(new URL('../public/'+p,import.meta.url),'utf8'));
test('phone shortcuts reject unknown entries and duplicates and persist at most three',()=>{
 assert.deepEqual(normalizePhoneShortcuts(null),[]);
 assert.deepEqual(normalizePhoneShortcuts(['pilot','pilot','invalid','slope','night','bocha']),['pilot','slope','night']);
 assert.equal(new Set(PHONE_CHOICES.map(x=>x[0])).size,PHONE_CHOICES.length);
 assert.ok(PHONE_CHOICES.every(x=>x[3].startsWith('#')||x[3].startsWith('[')));
});
test('balanced mode computes an actual path from supplied pedestrian link and slope data',()=>{
 const router=new DongjakWalkSlopeRouter(load('data/safety/walk/dongjak_walk_graph.json'),load('data/safety/slope/dongjak_walk_slope_by_link.json'));
 const a=[126.960,37.510],b=[126.962,37.512];
 const paths=['shortest','gentle','balanced'].map(mode=>router.route(a,b,{mode,maxSnapMeters:85}));
 for(const r of paths){
  assert.ok(r.geojson.geometry.coordinates.length>2);
  assert.ok(r.distanceMeters>0&&r.estimatedMinutes>0);
  assert.ok(Number.isFinite(r.estimatedTerrainAscentM));
  assert.ok(r.startSnapMeters<=85&&r.endSnapMeters<=85);
 }
 const balanced=paths[2];assert.equal(balanced.mode,'balanced');
 assert.ok(balanced.cost>=balanced.distanceMeters-.2);
 assert.ok(balanced.warnings.some(w=>w.includes('not a verified PRI')));
 assert.throws(()=>router.route([128,38],b,{mode:'balanced',maxSnapMeters:85}),/NETWORK_TOO_FAR/);
});
test('multi-stop balanced variants are not invented when a segment is missing',async()=>{
 const a={lng:126.94,lat:37.5},b={lng:126.95,lat:37.5},c={lng:126.96,lat:37.5};
 const leg=(s,e)=>({coords:[[s.lng,s.lat],[e.lng,e.lat]],source:'seoul-pedestrian-graph',seconds:60,kilometers:.1,vehiclePermittedM:30});
 const incomplete=await computeMultiStopRoutes([a,b,c],async(s,e)=>({standard:leg(s,e),balanced:s===a?leg(s,e):null}));
 assert.equal(incomplete.balanced,null);
 const complete=await computeMultiStopRoutes([a,b,c],async(s,e)=>({standard:leg(s,e),balanced:leg(s,e)}));
 assert.equal(complete.balanced.coords.length,3);
 assert.equal(complete.balanced.vehiclePermittedM,60);
 assert.equal(complete.balanced.routeMode,'balanced');
});
test('rail connection remains a clearly indicative plan and requires real nearby stations',()=>{
 const options=railTransferOptions({lng:126.94791,lat:37.502834},{lng:126.941005,lat:37.513534});
 assert.ok(options.length>0);assert.ok(Number.isFinite(options[0].indicativeMinutes));
 assert.ok(options[0].railHeuristicMinutes>0);
 assert.deepEqual(railTransferOptions({lng:125,lat:35},{lng:128,lat:39}),[]);
});

test('visible custom phone buttons explicitly own pointer hit-testing; hidden tabs do not',()=>{
 const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 assert.match(css,/\[data-tab="map"\]:not\(\[data-search-open="true"\]\)[^{]+#djNext-rail > button\.djNext-tool\{pointer-events:auto!important;touch-action:manipulation!important\}/);
 assert.match(css,/:is\(:not\(\[data-tab="map"\]\),\[data-search-open="true"\]\)[^{]+#djNext-rail > button\.djNext-tool\{pointer-events:none!important;visibility:hidden!important\}/);
});
