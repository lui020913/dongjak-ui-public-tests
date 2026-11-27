import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentDisplayExclusions} from '../src/completed-apartment-display.mjs';
const original={type:'Polygon',coordinates:[[[126.94,37.5],[126.941,37.5],[126.941,37.501],[126.94,37.5]]]};
const old={geometry:original,properties:{h:3}},tower={geometry:original,properties:{h:60}};
const edit={sheet:2,kind:'base',row:0,source_count:2,original,original_height:3,site:'test',reason:'verified display remnant'};
const pack={schema:1,edits:[edit]};
test('only exact source-bound display feature is excluded',()=>{assert.deepEqual([...apartmentDisplayExclusions(2,'base',[old,tower],pack)],[old]);assert.equal(apartmentDisplayExclusions(2,'supplement',[old,tower],pack).size,0);assert.equal(apartmentDisplayExclusions(3,'base',[old,tower],pack).size,0);});
test('changed source fails open without excluding any buildings',()=>{assert.equal(apartmentDisplayExclusions(2,'base',[tower,old],pack).size,0);assert.equal(apartmentDisplayExclusions(2,'base',[old],pack).size,0);assert.equal(apartmentDisplayExclusions(2,'base',[old,tower],{schema:1,edits:[edit,{...edit,row:1}]}).size,0);});
