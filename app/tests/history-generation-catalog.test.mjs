import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGenerationCatalog,historyGeneration} from '../src/history-generation-catalog.js';
import {releaseEdition} from '../src/release-editions.js';

test('two-part 1.0–9.2 editorial history groups real notes without inventing patch releases',()=>{
 const milestones=[1,8,23,42,46,49,86,133];
 const old=milestones.map(sourcePosition=>({
   version:'v7.0.29',sourcePosition,scale:'patch',items:['source '+sourcePosition]
 }));
 const current=[
   {version:'9.0.0',scale:'major',items:['mobile']},
   {version:'9.2.28',scale:'patch',items:['metro']},
   {version:'9.2.44',scale:'minor',items:['community']},
   {version:'9.2.50',scale:'patch',items:['UI']}
 ];
 const source=[...old,...current].reverse();
 const result=buildGenerationCatalog(source,releaseEdition);
 assert.deepEqual(result.map(g=>g.label),['9.x','8.x','7.x','6.x','5.x','4.x','3.x','2.x','1.x']);
 const entries=result.flatMap(g=>g.records);
 assert.deepEqual(entries.map(e=>e.record),source);
 assert.deepEqual(result[0].records.map(e=>e.displayVersion),['v9.2','v9.2','v9.2','v9.0']);
 assert.equal(result[0].records[0].actualVersion,'9.2.50');
 assert.deepEqual(result.slice(1).map(g=>g.records[0].displayVersion),
   ['v8.0','v7.0','v6.0','v5.0','v4.0','v3.0','v2.0','v1.0']);
 assert.equal(entries.at(-1).operational,false);
 assert.equal(result[0].records[0].operational,true);
});

test('audited historical positions align with 1.x through 8.x categories',()=>{
 for(const [position,major] of [[1,1],[8,2],[23,3],[42,4],[46,5],[49,6],[86,7],[133,8]]){
   assert.equal(historyGeneration({version:'v7.0.29'},{position}).major,major);
 }
 assert.equal(historyGeneration({version:'v9.0.0'},{}).major,9);
 assert.equal(historyGeneration({version:'v9.2.40'},{}).major,9);
});

test('v9.2.51 and v9.2.50 share update edition 9.2 but keep exact builds',()=>{
 const releases=[{version:'9.2.50',scale:'patch',items:['before']},
   {version:'9.2.51',scale:'patch',items:['deployed']}].reverse();
 const group=buildGenerationCatalog(releases,releaseEdition);
 assert.deepEqual(group.map(g=>g.label),['9.x']);
 assert.deepEqual(group[0].records.map(x=>x.displayVersion),['v9.2','v9.2']);
 assert.deepEqual(group[0].records.map(x=>x.actualVersion),['9.2.51','9.2.50']);
 assert(!group[0].records.some(x=>x.displayVersion==='v9.0.23'));
});
