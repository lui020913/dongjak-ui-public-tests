import test from 'node:test';
import assert from 'node:assert/strict';
import {roadEndpointTransitions} from '../src/pri-road-transitions.mjs';
const feature=(id,coordinates,score,extra={})=>({type:'Feature',geometry:{type:'LineString',coordinates},properties:{segmentId:id,evaluated:score!==null,score,displayScore:score??0,...extra}});
const fc=(...features)=>({type:'FeatureCollection',features});
const a=[126.95,37.5],b=[126.9503,37.5],c=[126.9506,37.5],d=[126.9509,37.5];
test('different evaluated grades transition within original lines and retain true scores',()=>{
 const input=fc(feature('a',[a,b],10),feature('b',[b,c],90));
 const before=JSON.stringify(input);
 const result=roadEndpointTransitions(input);
 assert.equal(JSON.stringify(input),before);
 const left=result.features.filter(f=>f.properties.segmentId==='a');
 const right=result.features.filter(f=>f.properties.segmentId==='b');
 assert.ok(left.length>2&&right.length>2);
 assert.deepEqual(left[0].geometry.coordinates[0],a);
 assert.deepEqual(left.at(-1).geometry.coordinates.at(-1),b);
 assert.deepEqual(right[0].geometry.coordinates[0],b);
 assert.deepEqual(right.at(-1).geometry.coordinates.at(-1),c);
 assert.ok(left.every(f=>f.properties.score===10));
 assert.ok(right.every(f=>f.properties.score===90));
 assert.equal(left[0].properties.renderColor,'#4C948B');
 assert.equal(right.at(-1).properties.renderColor,'#CF4248');
 assert.ok(new Set(left.map(f=>f.properties.renderColor)).size>8);
 for(const pieces of [left,right])for(let i=1;i<pieces.length;i++)assert.deepEqual(pieces[i-1].geometry.coordinates.at(-1),pieces[i].geometry.coordinates[0]);
});
test('same grade, unknown, disconnected and ambiguous junctions remain unmodified',()=>{
 const same=fc(feature('a',[a,b],10),feature('b',[b,c],30));
 assert.deepEqual(roadEndpointTransitions(same),same);
 const unknown=fc(feature('a',[a,b],10),feature('b',[b,c],null));
 assert.deepEqual(roadEndpointTransitions(unknown),unknown);
 const disconnected=fc(feature('a',[a,b],10),feature('b',[[126.95031,37.5],c],90));
 assert.deepEqual(roadEndpointTransitions(disconnected),disconnected);
 const branch=fc(feature('a',[a,b],10),feature('b',[b,c],90),feature('c',[b,[126.9503,37.5002]],50));
 assert.deepEqual(roadEndpointTransitions(branch),branch);
});
test('official speed network never blends with reference roads; policy retains continuous palette',()=>{
 const mixed=fc(feature('a',[a,b],0,{speedSource:'observed-link'}),feature('b',[b,c],90));
 assert.deepEqual(roadEndpointTransitions(mixed,{speed:true}),mixed);
 const speed=fc(feature('a',[a,b],0,{speedSource:'observed-link'}),feature('b',[b,c],80,{speedSource:'observed-link'}));
 assert.ok(roadEndpointTransitions(speed,{speed:true}).features.length>2);
 const policy=fc(feature('a',[a,b],0),feature('b',[b,c],25));
 assert.ok(roadEndpointTransitions(policy,{policy:true}).features.length>2);
});

import {priOverlayAnchor,priCoveredByMapLayer} from '../src/pri-map-layer-order.mjs';
test('native road paint is below PRI while rail, route and pin overlays stay independent',()=>{
 const layers=[{id:'land',type:'fill'},{id:'dj-pri-line',type:'line'},{id:'road_minor_casing',type:'line','source-layer':'transportation'},{id:'road_minor',type:'line','source-layer':'transportation'},{id:'transport-rail',type:'line','source-layer':'transportation'},{id:'walking-route-outline',type:'line'},{id:'labels',type:'symbol'}];
 assert.equal(priOverlayAnchor(layers),'transport-rail');
 assert.equal(priCoveredByMapLayer(layers,'dj-pri-line'),true);
 const moved=layers.filter(l=>l.id!=='dj-pri-line');moved.splice(3,0,{id:'dj-pri-line',type:'line'});
 assert.equal(priCoveredByMapLayer(moved,'dj-pri-line'),false);
});

test('named through road at a junction blends only its mutual straight continuation',()=>{
 const branch=feature('side',[b,[126.9503,37.5002]],50,{name:'옆길'});
 const input=fc(feature('a',[a,[126.95015,37.500001],b],10,{name:'상도로'}),feature('b',[b,c],90,{name:'상도로'}),branch);
 const output=roadEndpointTransitions(input);
 assert.ok(output.features.filter(f=>f.properties.segmentId==='a').length>10);
 assert.ok(output.features.filter(f=>f.properties.segmentId==='b').length>10);
 assert.deepEqual(output.features.filter(f=>f.properties.segmentId==='side'),[branch]);
 assert.ok(output.features.some(f=>f.geometry.coordinates.some(p=>p[0]===126.95015&&p[1]===37.500001)));
});
