import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMatchedRoad,isTransitAccessWalkValid} from '../src/transit-road-match.mjs';
import {busSegment} from '../src/transit-route-planner.mjs';
import {busRouteColor} from '../src/bus-route-overlay.js';
import {transitReviewPairs} from '../src/transit-candidate-review.mjs';
import {solidifyMapLines} from '../src/solid-map-lines.js';
test('airport buses use sky blue; circular buses remain yellow',()=>{assert.equal(busRouteColor(1),'#52B5E5');assert.equal(busRouteColor(5),'#e5b928');});
test('boarding cut lies along the actual road segment and transfer uses the same coordinates',()=>{
 const coords=[[126.95,37.5],[126.951,37.5],[126.952,37.5]];
 const origin={lng:126.9505,lat:37.50004,arsId:'20205'},destination={lng:126.9515,lat:37.50004,arsId:'20203'};
 const line=busSegment(coords,[origin,destination]);assert.ok(Math.abs(line[0][0]-origin.lng)<1e-8);assert.ok(Math.abs(line[0][1]-37.5)<1e-8);
 const plan={kind:'bus',origin,destination,coords:line};const p=transitReviewPairs(plan,origin,destination);
 assert.deepEqual([p[0][1].lng,p[0][1].lat],line[0]);assert.equal(p[0][1].vehicleAccess,true);
 assert.equal(isTransitAccessWalkValid({coords:line},p[0][1],p[1][0]),true);
 assert.equal(isTransitAccessWalkValid({coords:[[126.95,37.501],line.at(-1)]},p[0][1],p[1][0]),false);
});
test('road match cannot shorten away the ordered official route or run in reverse',()=>{
 const a=[[126.95,37.5],[126.951,37.5],[126.951,37.501],[126.952,37.501]];
 assert.ok(validateMatchedRoad(a,a));assert.ok(!validateMatchedRoad(a,[a[0],a.at(-1)]));assert.ok(!validateMatchedRoad(a,[...a].reverse()));
});
test('global solid line owner leaves transit pedestrian dots intact',()=>{
 const writes=[];const ids=['dj815-transit-walk-line','dj-transit-multi-walk-line','dj-transit-comparison-route-walk-line','other-road'];
 solidifyMapLines({getStyle:()=>({layers:ids.map(id=>({id,type:'line',paint:{'line-dasharray':[.35,1.55]}}))}),setPaintProperty:(id)=>writes.push(id)});
 assert.deepEqual(writes,['other-road']);
});
