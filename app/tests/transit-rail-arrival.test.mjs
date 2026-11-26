import test from 'node:test';
import assert from 'node:assert/strict';
import {transitRailArrival} from '../src/transit-rail-arrival.mjs';
const nowMs=Date.parse('2026-11-26T10:00:00Z');
const body={sourceStatus:'ok',sourceTimestamp:'2026-11-26T09:59:40Z',updatedAt:'18:59',items:[{line:'9호선',direction:'상행 · 여의도 방면',message:'2분 후'},{line:'1호선',direction:'상행',message:'1분 후'},{line:'9호선',direction:'',message:'3분 후'}]};
test('only fresh requested line with explicit direction is rendered',()=>{
 const result=transitRailArrival(body,'9호선',{nowMs});
 assert.equal(result.rows.length,1);assert.equal(result.rows[0].direction,'상행 · 여의도 방면');
 assert.ok(result.note.includes('탑승 방향'));
});
test('stale and unverified source never produce countdowns',()=>{
 assert.equal(transitRailArrival(body,'9호선',{nowMs:nowMs+600000}).rows.length,0);
 assert.equal(transitRailArrival({...body,sourceTimestamp:''},'9호선',{nowMs}).rows.length,0);
});
