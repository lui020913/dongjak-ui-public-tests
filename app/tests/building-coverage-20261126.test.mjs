import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingFootprintFilter,createCoverageIndex} from '../src/building-coverage.js';
const polygon=(x,y,w=.0001)=>({type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]]]});
test('3D replaces matching GIS footprints only',()=>{
 assert.equal(buildingFootprintFilter(false),null);
 assert.deepEqual(buildingFootprintFilter(true),['!=',['get','_render3d'],true]);
});
test('coverage only matches overlapping polygons, not adjacent or unmatched buildings',()=>{
 const idx=createCoverageIndex([{geometry:polygon(126.95,37.5)}]);
 assert.equal(idx.matches(polygon(126.95,37.5)),true);
 assert.equal(idx.matches(polygon(126.9502,37.5)),false);
 assert.equal(idx.matches(polygon(126.95008,37.5)),false);
});
