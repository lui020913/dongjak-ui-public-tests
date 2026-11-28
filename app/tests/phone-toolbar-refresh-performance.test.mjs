import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');
test('phone toolbar ignores its own mirror mutations and schedules native input refresh',()=>{
 const body=source.match(/new MutationObserver\(records=>\{\s*if\(records.some\(r=>!\[host,panel,activeLayers\].*?schedule\(\);\s*\}\)/s)?.[0];
 assert.ok(body);
 const inside={};const outside={};
 const host={contains:n=>n===inside},panel={contains:()=>false},activeLayers={contains:()=>false};
 let calls=0,callback;
 class MutationObserver{constructor(fn){callback=fn;}}
 // Execute the exact extracted callback, not a parallel implementation.
 const schedule=()=>calls++;
 Function('MutationObserver','host','panel','activeLayers','schedule',body)(MutationObserver,host,panel,activeLayers,schedule);
 callback(Array.from({length:100},()=>({target:inside})));assert.equal(calls,0);
 callback([{target:inside},{target:outside}]);assert.equal(calls,1);
});
test('inactive dock never measures viewport and repeated edge state writes are guarded',()=>{
 assert.match(source,/if\(dockFrame\|\|activeLayers.hidden\)return/);
 assert.match(source,/dockFrame=0;\s*if\(activeLayers.hidden\)return/);
 assert.match(source,/if\(toolScroll.dataset\[key\]!==next\)toolScroll.dataset\[key\]=next/);
});
