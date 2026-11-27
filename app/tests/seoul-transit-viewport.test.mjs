import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSeoulBoundary,pointInSeoulGeometry} from '../src/seoul-transit-boundary.mjs';
import {setTransitServiceGeometry,transitPointInScope,transitEndpointPolicy,transitCoordinatesInScope} from '../src/transit-exterior-scope.mjs';
import {makeTransitViewportIndex} from '../src/seoul-transit-viewport-picker.mjs';
const geometry={type:'Polygon',coordinates:[[[126.8,37.45],[127.1,37.45],[127.1,37.55],[126.95,37.55],[126.95,37.65],[126.8,37.65],[126.8,37.45]]]};
const inCity={lng:126.9,lat:37.5},outside={lng:127.02,lat:37.61};
test('Seoul boundary is identified by administrative code and outside polygon is denied even inside rectangle',()=>{
 assert.equal(extractSeoulBoundary({type:'Feature',properties:{CTPRVN_CD:'41'},geometry}),null);
 assert.deepEqual(extractSeoulBoundary({type:'Feature',properties:{CTPRVN_CD:'11'},geometry}),geometry);
 assert.equal(pointInSeoulGeometry(geometry,inCity.lng,inCity.lat),true);
 assert.equal(pointInSeoulGeometry(geometry,outside.lng,outside.lat),false);
 setTransitServiceGeometry(null);assert.equal(transitEndpointPolicy(inCity,inCity,()=>true),'boundary-unavailable');
 setTransitServiceGeometry(geometry);
 assert.equal(transitPointInScope(outside),false);
 assert.equal(transitEndpointPolicy(inCity,outside,()=>true),'outside-service-area');
 assert.equal(transitCoordinatesInScope([[126.9,37.5],[127.02,37.61]]),false);
});
test('viewport grid renders only nearby stations and stops at appropriate zoom with bounded count',()=>{
 const bus={id:'bus',kind:'bus',lng:126.9,lat:37.5},rail={id:'rail',kind:'subway',lng:126.901,lat:37.501},far={id:'far',kind:'bus',lng:127.1,lat:37.6};
 const i=makeTransitViewportIndex([bus,rail,far]);
 const b=[126.895,37.495,126.905,37.505];
 assert.deepEqual(i.query(b,11),[]);
 assert.deepEqual(i.query(b,13).map(x=>x.id),['rail']);
 assert.deepEqual(i.query(b,16).map(x=>x.id),['rail','bus']);
 assert.equal(i.query([127.095,37.595,127.105,37.605],16)[0].id,'far');
 const dense=makeTransitViewportIndex(Array.from({length:500},(_,i)=>({...bus,id:'b'+i})));
 assert.equal(dense.query(b,16).length,260);
});
