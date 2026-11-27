import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingFootprintFilter,createCoverageIndex,createBuildingCoverage,uniqueHighRiseFootprints} from '../src/building-coverage.js';
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

test('verified legacy apartment exclusions also hide exact unnamed native matches but preserve adjacent and named structures',()=>{
 const events=new Map(),states=new Map();
 const geom=polygon(126.95,37.5,.0001);
 const native={id:1,source:'openmaptiles',sourceLayer:'building',geometry:geom,properties:{}};
 const map={on:(n,f)=>events.set(n,f),getLayer:()=>true,getLayoutProperty:()=> 'visible',setLayoutProperty:()=>{},getZoom:()=>17,isMoving:()=>false,queryRenderedFeatures:()=>[native,{...native,id:2,geometry:polygon(126.95008,37.5)},{...native,id:3,properties:{name:'보존 대상'}}],setFeatureState:(t,s)=>states.set(t.id,s),removeFeatureState:t=>states.delete(t.id)};
 const coverage=createBuildingCoverage(map,['native-building']);
 coverage.setSheet(2,[],[],[],[{geometry:geom}]);events.get('idle')();
 assert.deepEqual([...states.keys()],[1]);
 coverage.removeSheet(2);assert.equal(states.size,0);
});

test('concave high-rise duplicates match their occupied footprint without hiding adjacent towers',()=>{const x=126.95,y=37.5,a=.0001;const geom={type:'Polygon',coordinates:[[[x,y],[x+3*a,y],[x+3*a,y+a],[x+a,y+a],[x+a,y+3*a],[x,y+3*a],[x,y]]]};const shifted={type:'Polygon',coordinates:geom.coordinates.map(r=>r.map(([u,v])=>[u+.000002,v+.000002]))};const f={geometry:geom,properties:{h:45}},g={geometry:shifted,properties:{h:45}},adjacent={geometry:polygon(x+.0004,y,.0001),properties:{h:45}};assert.equal(createCoverageIndex([f],{strict:true,equivalent:true}).matches(shifted),true);assert.deepEqual(uniqueHighRiseFootprints([f,g,adjacent]),[f,adjacent]);});
