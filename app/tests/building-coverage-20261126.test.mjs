import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingFootprintFilter,createCoverageIndex,createBuildingCoverage} from '../src/building-coverage.js';
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

test('strict coverage does not hide a footprint that extends outside the GIS polygon',()=>{
 const idx=createCoverageIndex([{geometry:polygon(126.95,37.5)}],{strict:true});
 assert.equal(idx.matches(polygon(126.95,37.5)),true);
 assert.equal(idx.matches(polygon(126.950005,37.5)),false);
 assert.equal(idx.matches(polygon(126.95008,37.5)),false);
});
test('matched native fills are hidden only after the retained GIS sheet is complete and visible',()=>{
 const events=new Map(),states=new Map();let ready=false,zoom=17,visible='visible';
 const geom=polygon(126.95,37.5),native={id:1,source:'openmaptiles',sourceLayer:'building',geometry:geom,properties:{}};
 const map={on:(n,f)=>events.set(n,f),getLayer:()=>true,getLayoutProperty:(id)=>id==='dongjak-buildings-footprint-2'?visible:'visible',setLayoutProperty:()=>{},getSource:()=>true,isSourceLoaded:()=>ready,getZoom:()=>zoom,isMoving:()=>false,queryRenderedFeatures:()=>[native,{...native,id:2,properties:{name:'도서관'}},{...native,id:3,geometry:polygon(126.95008,37.5)}],setFeatureState:(t,s)=>states.set(t.id,s),removeFeatureState:t=>states.delete(t.id)};
 const coverage=createBuildingCoverage(map,['native-building']);
 coverage.setSheet(2,[],[],[{geometry:geom}]);events.get('idle')();assert.equal(states.size,0);
 ready=true;events.get('moveend')();events.get('idle')();assert.deepEqual([...states.keys()],[1]);
 zoom=14;events.get('moveend')();events.get('idle')();assert.equal(states.size,0);
 zoom=17;visible='none';events.get('moveend')();events.get('idle')();assert.equal(states.size,0);
 visible='visible';events.get('moveend')();events.get('idle')();assert.deepEqual([...states.keys()],[1]);
 coverage.removeSheet(2);assert.equal(states.size,0);
});
