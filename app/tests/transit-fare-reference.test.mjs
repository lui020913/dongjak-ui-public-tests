import test from 'node:test';
import assert from 'node:assert/strict';
import {transitBaseFare,transitFareText} from '../src/transit-fare-reference.mjs';
const bus=(type,route='동작01')=>({kind:'bus',routeType:type,route});
const rail={kind:'rail',lines:['9']};
test('known Seoul bus types use official base fares, not colors or guessed names',()=>{
 assert.equal(transitBaseFare(bus('2')).won,1200);
 assert.equal(transitBaseFare(bus('3')).won,1500);
 assert.equal(transitBaseFare(bus('4','N15')).won,2500);
 assert.equal(transitBaseFare(bus('7')),null);
 assert.equal(transitBaseFare(bus(undefined)),null);
});
test('combined route shows highest applicable base only, never sum as actual fare',()=>{
 assert.equal(transitBaseFare({kind:'mixed',legs:[bus('2'),rail]}).won,1550);
 assert.equal(transitBaseFare({kind:'mixed',legs:[bus('8'),rail]}),null);
 assert.equal(transitFareText(rail),'기본운임 1,550원');
});
