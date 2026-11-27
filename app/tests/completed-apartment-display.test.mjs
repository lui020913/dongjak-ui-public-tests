import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentDisplayExclusions} from '../src/completed-apartment-display.mjs';
const original={type:'Polygon',coordinates:[[[126.94,37.5],[126.941,37.5],[126.941,37.501],[126.94,37.5]]]};
const old={geometry:original,properties:{h:3}},tower={geometry:original,properties:{h:60}};
const edit={sheet:2,kind:'base',row:0,source_count:2,original,original_height:3,site:'test',reason:'verified display remnant'};
const pack={schema:1,edits:[edit]};
test('only exact source-bound display feature is excluded',()=>{assert.deepEqual([...apartmentDisplayExclusions(2,'base',[old,tower],pack)],[old]);assert.equal(apartmentDisplayExclusions(2,'supplement',[old,tower],pack).size,0);assert.equal(apartmentDisplayExclusions(3,'base',[old,tower],pack).size,0);});
test('changed source fails open without excluding any buildings',()=>{assert.equal(apartmentDisplayExclusions(2,'base',[tower,old],pack).size,0);assert.equal(apartmentDisplayExclusions(2,'base',[old],pack).size,0);assert.equal(apartmentDisplayExclusions(2,'base',[old,tower],{schema:1,edits:[edit,{...edit,row:1}]}).size,0);});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {completedApartmentDisplayEdits} from '../src/completed-apartment-display-edits.mjs';
import {loadBuildingTileFeatures} from '../src/building-assets-core.js';
test('committed apartment edits match real source files and are applied by shared tile loader',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/buildings/manifest.json',import.meta.url),'utf8'));
 assert.ok(completedApartmentDisplayEdits.edits.length>0);
 for(const sheet of manifest.sheets.filter(s=>completedApartmentDisplayEdits.edits.some(e=>e.sheet===s.sheet))){
  const sourceData=new Map();
  let expected=0;
  for(const [kind,url] of [['base',sheet.file],['supplement',sheet.supplement]]){
   if(!url)continue;
   const bytes=readFileSync(new URL('../public'+url,import.meta.url));
   const data=JSON.parse(bytes);
   sourceData.set(url,data);
   expected+=data.features.length;
   const edits=completedApartmentDisplayEdits.edits.filter(e=>e.sheet===sheet.sheet&&e.kind===kind);
   for(const edit of edits){
    assert.equal(createHash('sha256').update(bytes).digest('hex'),edit.source_sha256);
    assert.equal(data.features.length,edit.source_count);
    assert.deepEqual(data.features[edit.row].geometry,edit.original);
    assert.equal(data.features[edit.row].properties.h,edit.original_height);
   }
  }
  const loaded=await loadBuildingTileFeatures(sheet,async url=>({ok:true,json:async()=>sourceData.get(url)}),null);
  const edits=completedApartmentDisplayEdits.edits.filter(e=>e.sheet===sheet.sheet);
  assert.equal(loaded.features.length,expected-edits.length);
  assert.equal(loaded.apartmentExcluded.length,edits.length);
  for(const edit of edits){
   const data=sourceData.get(edit.kind==='base'?sheet.file:sheet.supplement);
   assert.ok(!loaded.features.includes(data.features[edit.row]));
   assert.ok(loaded.apartmentExcluded.includes(data.features[edit.row]));
  }
 }
});
