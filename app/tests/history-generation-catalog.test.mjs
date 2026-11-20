import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGenerationCatalog,historyGeneration} from '../src/history-generation-catalog.js';
const review=r=>({position:r.sourcePosition,scale:r.scale});
test('1.x to 9.x uses chronological feature milestones; source identities and notes survive',()=>{
 const old=[1,2,23,42,63,93,140,168,202].map(sourcePosition=>({version:'v8.0.1',sourcePosition,scale:'patch',items:['source '+sourcePosition]}));
 const current=[{version:'9.0.0',scale:'major',items:['mobile']},{version:'9.2.28',scale:'patch',items:['bus']},{version:'9.2.44',scale:'minor',items:['community']},{version:'9.2.50',scale:'patch',items:['UI']}];
 const source=[...old,...current].reverse();const result=buildGenerationCatalog(source,review);
 assert.deepEqual(result.map(g=>g.label),['9.x','8.x','7.x','6.x','5.x','4.x','3.x','2.x','1.x']);
 const entries=result.flatMap(g=>g.records);assert.deepEqual(entries.map(e=>e.record),source);
 assert.equal(new Set(entries.map(e=>e.displayVersion)).size,source.length);
 assert.equal(entries[0].displayVersion,'v9.1.1');assert.equal(entries[0].record.version,'9.2.50');
 assert.equal(entries.at(-1).displayVersion,'v1.0.0');
 assert.equal(source[0].items[0],'UI');
});
test('existing operational positions take priority over historically inconsistent labels',()=>{
 assert.equal(historyGeneration({version:'v9.2.40'},{position:168}).major,7);
 assert.equal(historyGeneration({version:'v9.2.27'},{}).major,8);
 assert.equal(historyGeneration({version:'v9.2.28'},{}).major,9);
});
