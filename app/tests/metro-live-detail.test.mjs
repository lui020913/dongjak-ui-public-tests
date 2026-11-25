import test from 'node:test';
import assert from 'node:assert/strict';
import {directionTitle,stationSequence,observedTrains,compactArrival} from '../src/metro-live-detail-model.js';
test('line 7 direction uses correct station order and terminal names',()=>{
 assert.equal(directionTitle('7호선','상행'),'장암 방면');
 assert.equal(directionTitle('7호선','하행'),'석남 방면');
 const up=stationSequence('7호선','상행','상도').stations;
 assert.equal(up[0],'석남');assert.equal(up.at(-1),'장암');
 assert.equal(up[up.indexOf('상도')-1],'장승배기');
 assert.equal(stationSequence('7호선','하행','상도').stations[0],'장암');
});
test('only verified fresh direction-matched train observations are used',()=>{
 const now=Date.parse('2026-11-25T01:10:00Z'),base={line:'7호선',station:'상도',trainNo:'7114',direction:'0',observedAt:'2026-11-25T01:09:00Z'};
 assert.deepEqual(observedTrains([base,{...base,trainNo:'1',direction:'1'},{...base,trainNo:'2',observedAt:'2026-11-25T00:00:00Z'}],'7호선','상행',now),[base]);
 assert.equal(compactArrival('약 3분 후'),'3분');assert.equal(compactArrival('약 3분 후',true),'약 3분 후');
 assert.equal(stationSequence('1호선','상행','노량진',['대방','노량진']).partial,true);
});
