import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRouteMapPickArbiter} from '../src/route-map-pick-arbiter.js';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('named bus, metro and facility win over a generic coordinate in the same click',()=>{
 for(const name of ['중앙대학교','상도역','중앙대학교 정류장']){
  const jobs=[],calls=[],picker=createRouteMapPickArbiter(fn=>jobs.push(fn));
  picker.defer(()=>calls.push('coordinate'));
  picker.named(()=>calls.push(name));
  jobs.forEach(fn=>fn());
  assert.deepEqual(calls,[name]);
 }
});
test('empty map still opens coordinate fallback; cancellation and rejected named hits do not',()=>{
 const jobs=[],calls=[],picker=createRouteMapPickArbiter(fn=>jobs.push(fn));
 picker.defer(()=>calls.push('coordinate'));jobs.shift()();assert.deepEqual(calls,['coordinate']);
 picker.defer(()=>calls.push('stale'));picker.cancel();jobs.shift()();
 picker.defer(()=>calls.push('ground'));assert.equal(picker.named(()=>false),false);jobs.shift()();
 assert.deepEqual(calls,['coordinate']);
});
test('all transport marker click owners support picking and route buttons do not close before validation',()=>{
 const s=read('transport-map.js'),m=read('main.js'),p=read('place-details.js');
 assert.ok(s.includes("if(canPickRoute())onRoutePick(place);"));
 assert.ok(s.includes("if(picking)onRoutePick(candidates[0]);"));
 const buttons=s.slice(s.indexOf("for(const [buttonId,which] of [['transport-use-start'"),s.indexOf("map.addSource('transport-bus'"));
 assert.ok(buttons.includes('onRouteSelect(which,{...selected})'));assert.ok(!buttons.includes('close(false)'));
 assert.ok(m.includes('routeMapPickArbiter.defer(()=>'));
 assert.ok(m.includes('routeMapPickArbiter.named(()=>showTransitRouteConfirmation'));
 assert.ok(m.includes("source:'facility',lines:[]"));
 assert.ok(p.includes('address:placeData({...place,lng,lat}).address'));
});
