import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlanLookup,loadConfirmedDevelopments,isConfirmedPlanLabel} from '../src/confirmed-development-display.mjs';
const data=JSON.parse(readFileSync(new URL('../public/data/redevelopment/confirmed-projects-202609.geojson',import.meta.url),'utf8'));
test('only individually verified planned projects are included; completed and preservation areas are excluded',()=>{
 assert.equal(data.features.length,22);assert.equal(new Set(data.features.map(f=>f.properties.id)).size,22);
 assert.ok(data.features.some(f=>f.properties.name==='디에이치 켄트로나인'));
 assert.ok(data.features.every(f=>f.properties.display_only===true&&isConfirmedPlanLabel(f.properties)&&!/존치|촉진지구|흑석[345678]구역/.test(f.properties.source_name)));
});
test('planned display lookup handles actual polygon holes and leaves neighboring buildings unchanged',()=>{
 const ring=[[126.95,37.5],[126.96,37.5],[126.96,37.51],[126.95,37.51],[126.95,37.5]];
 const hole=[[126.953,37.503],[126.957,37.503],[126.957,37.507],[126.953,37.507],[126.953,37.503]];
 const contains=createPlanLookup({features:[{geometry:{type:'Polygon',coordinates:[ring,hole]}}]});
 assert.equal(contains(126.951,37.501),true);assert.equal(contains(126.955,37.505),false);assert.equal(contains(126.961,37.501),false);
});
test('data loading fails closed and retains current map when source is invalid',async()=>{
 assert.equal((await loadConfirmedDevelopments(async()=>({ok:true,json:async()=>data}))).features.length,22);
 await assert.rejects(loadConfirmedDevelopments(async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[]})})));
});


test('verified planned move-in month must match the displayed name and include a source; unknown dates are not fabricated',()=>{
 assert.equal(data.features.filter(f=>f.properties.occupancy_month).length,3);
 assert.ok(data.features.some(f=>f.properties.label==='아크로 리버스카이 (2029년 8월 예정)'));
 assert.ok(data.features.some(f=>f.properties.label==='라클라체 자이 드파인 (2028년 12월 예정)'));
 assert.ok(data.features.some(f=>f.properties.label==='써밋 더힐 (2030년 6월 예정)'));
 assert.equal(isConfirmedPlanLabel({label:'가짜 (2030년 3월 예정)',occupancy_month:'2030-03'}),false);
});
