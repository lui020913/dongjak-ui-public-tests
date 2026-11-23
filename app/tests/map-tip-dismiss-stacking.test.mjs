import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tipCloseStackingZ} from '../src/public-ui-mobile-surface-coordinator.js';

test('TIP dismissal is painted above the actual Production TIP (3200)',()=>{
  assert.equal(tipCloseStackingZ('3200'),3201);
  assert.ok(tipCloseStackingZ('3200')>3200);
});
test('TIP close maintains safe fallback for auto stacking',()=>{
  assert.equal(tipCloseStackingZ('auto'),2891);
  assert.equal(tipCloseStackingZ(undefined),2891);
});
test('TIP close never claims native modal stack reserved above 6900',()=>{
  assert.equal(tipCloseStackingZ(9999),6899);
});
