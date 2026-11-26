import test from 'node:test';
import assert from 'node:assert/strict';
import {traceRailEdge,transitRailSegments} from '../src/transit-rail-geometry.mjs';
const a=[126.95,37.5],b=[126.952,37.501],c=[126.955,37.5],d=[126.958,37.5];
const path=(coordinates,line='9',origin='MOIS_KR_Subway_2026')=>({line,origin,coordinates});
test('connected official curves retain source vertices and support reverse direction',()=>{
 const paths=[path([a,b]),path([b,c])];
 assert.deepEqual(traceRailEdge(a,c,'9',paths).coordinates,[a,b,c]);
 assert.deepEqual(traceRailEdge(c,a,'9',paths).coordinates,[c,b,a]);
});
test('gaps, different lines and untrusted source do not form a verified path',()=>{
 assert.equal(traceRailEdge(a,c,'9',[path([a,b]),path([[126.953,37.501],c])]),null);
 assert.equal(traceRailEdge(a,c,'9',[path([a,b]),path([b,c],'7')]),null);
 assert.equal(traceRailEdge(a,c,'9',[path([a,b,c],'9','unknown')]),null);
});
test('unavailable edge stays explicitly schematic and transfer colors retain line ids',()=>{
 const segments=transitRailSegments(['A','C','D'],['9','7'],{A:a,C:c,D:d},[path([a,b,c])]);
 assert.equal(segments[0].schematic,false);assert.equal(segments[1].schematic,true);
 assert.deepEqual(segments.map(s=>s.line),['9','7']);
});
