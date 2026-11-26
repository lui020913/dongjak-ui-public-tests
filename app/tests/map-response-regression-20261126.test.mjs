import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialFeatures} from '../src/seoul-official-facilities.js';
import {nativePavedAreaPaint} from '../src/ui-environment.js';
import {LABEL_HALO_MAX_PX} from '../src/map-label-halo.js';
const src=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('theme and idle halo cap use the same value rather than oscillating',()=>{
 assert.equal(LABEL_HALO_MAX_PX,1.1);
 assert.equal((src('ui-environment.js').match(/width:LABEL_HALO_MAX_PX/g)||[]).length,2);
});
test('facility reconciliation is dirty-driven, deferred, and cancels pending work during gestures',()=>{
 const s=src('civic-facility-layer.js');
 assert.match(s,/if\(!dedupDirty\|\|dedupTimer\|\|map\.isMoving/);
 assert.match(s,/map\.on\('idle',scheduleReconcile\)/);
 assert.match(s,/map\.on\('movestart',\(\)=>\{if\(dedupTimer\)/);
 assert.doesNotMatch(s,/map\.on\('idle',reconcileOfficialDuplicates\)/);
});
test('indexed facility dedup retains the existing punctuation and category identity rules',()=>{
 const boundary={type:'Polygon',coordinates:[[[126.9,37.45],[127,37.45],[127,37.55],[126.9,37.55],[126.9,37.45]]]};
 const p={name:'상도-약국',category:'약국',lng:126.95,lat:37.5};
 assert.equal(officialFeatures([p,{...p,name:'상도 약국',lng:126.95003},{...p,name:'상도 약국',category:'병원'}],boundary).features.length,2);
});

test('native transportation areas distinguish pedestrian surfaces while ordinary carriageways remain white',()=>{
 const color=nativePavedAreaPaint();
 assert.equal(color[0],'match');
 assert.ok(color[2].includes('path')&&color[2].includes('pedestrian'));
 assert.equal(color[3],'#e7e9e2');
 assert.equal(color[4],'#ffffff');
 assert.match(src('ui-environment.js'),/entry\.pavedArea\?nativePavedAreaPaint/);
});
