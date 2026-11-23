import test from 'node:test';
import assert from 'node:assert/strict';
import {routeFooterLift} from '../src/v910-request-completion.js';
test('route CTA is lifted above the real pill navigation hitbox',()=>{
 assert.equal(routeFooterLift(771,788),29);
 assert.equal(788-routeFooterLift(771,788),759);
 assert.equal(routeFooterLift(771,741),0);
 assert.equal(routeFooterLift(739,794),67);
 assert.equal(routeFooterLift(0,788),0);
 assert.equal(routeFooterLift(NaN,788),0);
});
