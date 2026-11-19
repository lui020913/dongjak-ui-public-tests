import test from 'node:test';
import assert from 'node:assert/strict';
import {createFieldworkStore,fieldworkToCSV,fieldworkToJSON,FIELDWORK_STORAGE_KEY,normalizeFieldObservation} from '../src/protection-zone-fieldwork.js';
import {createProtectionFocusContext,BACKGROUND_OVERLAY_IDS} from '../src/protection-zone-context.js';

test('fieldwork: local save, load, edits, delete, no network',()=>{
 const mem=new Map();const storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
 const store=createFieldworkStore(storage);
 const first=store.save({road_id:'R0248',road_name:'상도로54길',sidewalk:'없음',notes:'현장 샘플',photo_reference:'001.jpg',survey_date:'2026-11-09',review_status:'현장 확인'});
 assert.equal(first.persisted,true);
 assert.equal(store.all().length,1);
 assert.equal(store.get('R0248').sidewalk,'없음');
 assert.ok(mem.has(FIELDWORK_STORAGE_KEY));
 const reload=createFieldworkStore(storage);
 assert.equal(reload.get('R0248').notes,'현장 샘플');
 reload.save({...reload.get('R0248'),sidewalk:'일부 있음'});
 assert.equal(store.get('R0248').sidewalk,'없음'); // stale in-memory instance is immutable until refresh
 assert.equal(createFieldworkStore(storage).get('R0248').sidewalk,'일부 있음');
 assert.equal(reload.remove('R0248'),true);
 assert.equal(createFieldworkStore(storage).all().length,0);
});
test('fieldwork: format/csv injection, invalid records and export metadata',()=>{
 assert.throws(()=>normalizeFieldObservation({road_id:'../.env'}));
 const r=normalizeFieldObservation({road_id:'R0288',road_name:'=HYPERLINK("bad")',notes:'=2+3',lighting:'invented',photo_reference:'@SUM(1)',review_status:'현장 확인'});
 assert.equal(r.lighting,'미확인');
 const csv=fieldworkToCSV([r]);
 assert.match(csv,/"'=HYPERLINK/);
 assert.match(csv,/"'=2\+3"/);
 assert.match(csv,/"'@SUM/);
 const json=JSON.parse(fieldworkToJSON([r]));
 assert.equal(json.observations.length,1);
 assert.match(json.disclaimer,/공식 조사/);
});
test('focus mode hides only optional POI layers and restores previous visibility',()=>{
 const layers=new Map([
  ['safety-points',{layout:{visibility:'visible'}}],
  ['crosswalk-glyphs',{layout:{visibility:'none'}}],
  ['transport-subway-station',{layout:{visibility:'visible'}}],
  ['building-3d',{layout:{visibility:'visible'}}]
 ]);
 const map={getLayer:id=>layers.get(id),getLayoutProperty:(id,k)=>layers.get(id)?.layout[k],setLayoutProperty:(id,k,v)=>{layers.get(id).layout[k]=v;}};
 const ctx=createProtectionFocusContext(map);
 assert.ok(BACKGROUND_OVERLAY_IDS.includes('safety-points'));
 ctx.activate();
 assert.equal(layers.get('safety-points').layout.visibility,'none');
 assert.equal(layers.get('transport-subway-station').layout.visibility,'visible');
 assert.equal(layers.get('building-3d').layout.visibility,'visible');
 layers.set('public-names',{layout:{visibility:'visible'}});
 ctx.sync();assert.equal(layers.get('public-names').layout.visibility,'none');
 ctx.restore();
 assert.equal(layers.get('safety-points').layout.visibility,'visible');
 assert.equal(layers.get('crosswalk-glyphs').layout.visibility,'none');
 assert.equal(layers.get('public-names').layout.visibility,'visible');
});
