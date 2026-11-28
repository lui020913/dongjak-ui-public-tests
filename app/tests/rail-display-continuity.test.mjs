import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {repairRailDisplayContinuity} from '../src/rail-display-continuity.mjs';import {mappedLocalRailPaths,preferMappedLocalRail,displayRailCollection} from '../src/mapped-local-rail.mjs';import {fixedRailCollection} from '../src/fixed-rail-lines.js';
const asset=JSON.parse(readFileSync(new URL('../public/data/transport/seoul-rail-network-single-fa75e12.geojson',import.meta.url),'utf8'));
const gap=f=>f.properties.displayGap;
const nine=f=>f.properties.line==='9호선';
test('actual line 9 asset gap is connected visually and other local short gaps are inspected',()=>{
 const input={...asset,features:asset.features.map(f=>({...f,properties:{...f.properties,opacity:.97}}))};
 const repaired=repairRailDisplayContinuity(input),bridges=repaired.features.filter(gap);
 const target=bridges.filter(nine).find(f=>f.geometry.coordinates.some(p=>p[0]===126.93838&&p[1]===37.51341));
 assert.ok(target);assert.ok(target.geometry.coordinates.some(p=>p[0]===126.937835&&p[1]===37.51338));assert.equal(target.properties.schematic,true);
 assert.ok(bridges.some(f=>f.properties.line==='1호선'));assert.ok(bridges.some(f=>f.properties.line==='2호선'));
 assert.equal(input.features.some(gap),false);
 assert.equal(repairRailDisplayContinuity(repaired),repaired);
});
test('actual merged line 9 display is repaired without changing the raw routing collection',()=>{
 const result=preferMappedLocalRail(fixedRailCollection(),mappedLocalRailPaths(asset));
 const raw=result.collection,before=JSON.stringify(raw),display=displayRailCollection(raw,x=>x);
 assert.equal(JSON.stringify(raw),before);
 if(result.lines.includes('9'))assert.ok(display.features.some(f=>nine(f)&&gap(f)));
 else assert.ok(raw.features.filter(nine).every(f=>f.properties.schematic));
});
test('never join different lines, parallel tracks, or gaps longer than 60m',()=>{
 const f=(line,c)=>({type:'Feature',properties:{line,opacity:.97},geometry:{type:'LineString',coordinates:c}});
 const a=f('9호선',[[126.94,37.51],[126.941,37.51]]);
 for(const b of [f('7호선',[[126.9413,37.51],[126.942,37.51]]),f('9호선',[[126.941,37.5103],[126.94,37.5103]]),f('9호선',[[126.942,37.51],[126.943,37.51]])]){const c={features:[a,b]};assert.equal(repairRailDisplayContinuity(c),c);}
});
