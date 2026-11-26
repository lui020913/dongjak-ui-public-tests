import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBuildingDisplayTrims} from '../src/building-display-road-trims.js';
import {loadBuildingTileFeatures} from '../src/building-assets.js';
const geom=(x)=>({type:'Polygon',coordinates:[[[0,0],[x,0],[x,1],[0,1],[0,0]]]});
const f={type:'Feature',properties:{h:12},geometry:geom(2)};
const sheet={sheet:2,file:'/buildings/tile_2.geojson'};
const pack={schema:1,sheets:{'2:base':{source:sheet.file,source_count:1,edits:[{row:0,original:geom(2),display:geom(1)}]}}};
test('same source feature identity is retained and only display geometry is replaced',async()=>{
 const result=await loadBuildingTileFeatures(sheet,async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[f]})}),pack);
 assert.equal(result.features[0],f);
 assert.deepEqual(result.displayGeometries.get(f),geom(1));
 assert.deepEqual(f.geometry,geom(2));
 assert.equal(f.properties.h,12);
});
test('source shape/count/file or duplicate row mismatch fails open for the whole sheet',()=>{
 assert.equal(applyBuildingDisplayTrims(2,'base',sheet.file,[{...f,geometry:geom(3)}],pack).size,0);
 assert.equal(applyBuildingDisplayTrims(2,'base',sheet.file,[f,f],pack).size,0);
 assert.equal(applyBuildingDisplayTrims(2,'base','wrong',[f],pack).size,0);
 const duplicate=structuredClone(pack);duplicate.sheets['2:base'].edits.push(duplicate.sheets['2:base'].edits[0]);
 assert.equal(applyBuildingDisplayTrims(2,'base',sheet.file,[f],duplicate).size,0);
});
