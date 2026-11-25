import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadLayerSelection} from '../src/pilot-layer-selection.js';
test('road layers replace each other and a late load cannot reclaim the map',()=>{
 const selection=createRoadLayerSelection(),closed=[];
 const a=selection.claim('slope',()=>closed.push('slope'));
 const b=selection.claim('pri',()=>closed.push('pri'));
 assert.equal(a.isCurrent(),false);assert.equal(b.isCurrent(),true);
 a.release();assert.equal(b.isCurrent(),true);
 const c=selection.claim('width',()=>closed.push('width'));
 assert.deepEqual(closed,['slope','pri']);assert.equal(c.isCurrent(),true);
 c.release();assert.equal(c.isCurrent(),false);
});
