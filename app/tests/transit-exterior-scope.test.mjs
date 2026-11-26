import test from 'node:test';
import assert from 'node:assert/strict';
import {transitEndpointPolicy,transitCoordinatesInScope,transitPointInScope,exteriorMapActive,transitWalkStyle} from '../src/transit-exterior-scope.mjs';
const a={lng:126.95,lat:37.50},b={lng:127.01,lat:37.55},c={lng:127.1,lat:37.6};
const inside=(lng,lat)=>lng===a.lng&&lat===a.lat;
test('one endpoint must be in Dongjak; neither endpoint may exceed pilot search rectangle',()=>{
 assert.equal(transitEndpointPolicy(a,b,inside),'allowed');
 assert.equal(transitEndpointPolicy(b,a,inside),'allowed');
 assert.equal(transitEndpointPolicy(a,a,inside),'allowed');
 assert.equal(transitEndpointPolicy(b,c,inside),'both-outside');
 assert.equal(transitEndpointPolicy(a,{lng:128,lat:37.5},inside),'outside-service-area');
 assert.equal(transitEndpointPolicy(a,b,()=>null),'boundary-unavailable');
 assert.equal(transitPointInScope({lng:'126.95',lat:37.5}),false);
});
test('vehicle geometry may cross district but must be valid and bounded',()=>{
 assert.equal(transitCoordinatesInScope([[a.lng,a.lat],[b.lng,b.lat]]),true);
 assert.equal(transitCoordinatesInScope([[a.lng,a.lat],[128,37.5]]),false);
 assert.equal(transitCoordinatesInScope([[a.lng,a.lat,0],[b.lng,b.lat]]),false);
 assert.equal(transitCoordinatesInScope([]),false);
});
test('exterior display is owned only by transit editor, picker or preview',()=>{
 assert.equal(exteriorMapActive({mode:'walk',tab:'route'}),false);
 assert.equal(exteriorMapActive({mode:'transit',tab:'route'}),true);
 assert.equal(exteriorMapActive({mode:'transit',tab:'map',pick:'end'}),true);
 assert.equal(exteriorMapActive({mode:'transit',tab:'map'}),false);
 assert.equal(exteriorMapActive({mode:'transit',tab:'news',preview:true}),false);
 assert.equal(exteriorMapActive({mode:'walk',tab:'map',preview:true}),true);
});
test('unassessed and crossing walks never display as evaluated',()=>{
 assert.equal(transitWalkStyle({transitPri:{risk:5,coverage:.9},transitExterior:true}),'#89958f');
 assert.equal(transitWalkStyle({transitPri:{risk:5,coverage:.5}}),'#89958f');
 assert.equal(transitWalkStyle({transitPri:{risk:5,coverage:.9}}),'#168f82');
 assert.equal(transitWalkStyle({}),'#89958f');
});
