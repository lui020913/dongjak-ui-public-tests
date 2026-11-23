import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryPublicData} from '../scripts/audit-static-data-usage.mjs';
test('public data provenance and every 6-factor PRI patch remain intact',()=>{
 const {summary,assets,dynamicFolders}=inventoryPublicData();
 assert.ok(summary.totalFiles>0,'public GIS directory must remain populated');
 assert.ok(summary.totalBytes>0,'public GIS inventory must remain readable');
 // Never pin total file counts or bytes: verified archival must remain possible.
 assert.equal(new Set(assets.map(a=>a.uri)).size,assets.length);
 assert.equal(assets.reduce((s,a)=>s+a.bytes,0),summary.totalBytes);
 assert.ok(assets.every(a=>a.bytes>0&&a.uri.startsWith('/data/')));
 assert.ok(assets.every(a=>['source-reference','dynamic-folder-review','research-or-external-review'].includes(a.classification)));
 for(const uri of ['/data/pri/lighting_segments.json',
  '/data/pri/sangdo1_accidents_factor.json',
  '/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json',
  '/data/pri/sangdo1_crosswalk_rubric_factor.json',
  '/data/pri/sangdo1_shared_road_rubric_factor.json']){
  const record=assets.find(a=>a.uri===uri);
  assert.ok(record,'canonical PRI asset missing: '+uri);
  assert.equal(record.manifestReferenced,true,uri);
 }
 assert.ok(summary.runtimeNamed>=12);
 assert.ok(dynamicFolders.every(x=>x.startsWith('/data/')));
});
