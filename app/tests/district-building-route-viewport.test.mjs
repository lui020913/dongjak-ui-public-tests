import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installDistrictBuildingScope,containsDistrictPoint} from '../src/district-building-scope.mjs';
import {strictRoutePreviewPadding,routeProjectionCorrection} from '../src/route-map-focus.js';
const boundary={type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]};
test('district scope applies only to building geometry and updates once per boundary',()=>{
 const layers=[{id:'building',type:'fill','source-layer':'building'},{id:'building-top',type:'fill-extrusion','source-layer':'building'},{id:'building-outline',type:'line','source-layer':'building'},{id:'road',type:'line','source-layer':'transportation'},{id:'park',type:'fill','source-layer':'park'}];
 const original=['==',['get','class'],'building'];const filters=new Map([['building',original]]),writes=[];
 const map={getStyle:()=>({layers}),getFilter:id=>filters.get(id),setFilter:(id,filter)=>{filters.set(id,filter);writes.push(id);},on(){}};
 const scope=installDistrictBuildingScope(map);scope.update(boundary);scope.update(boundary);
 assert.equal(writes.length,6);assert.deepEqual(filters.get('building'),['all',original,['<=',['distance',boundary],0]]);
 assert.equal(filters.has('road'),false);assert.equal(filters.has('park'),false);
 assert.equal(containsDistrictPoint(boundary,1,1),true);assert.equal(containsDistrictPoint(boundary,3,1),false);
});
test('route framing never reduces the real occlusion padding',()=>{
 assert.deepEqual(strictRoutePreviewPadding({mapTop:0,viewportHeight:844,toolbarBottom:110,sheetTop:410}),{top:136,bottom:460,left:34,right:34});
 assert.equal(strictRoutePreviewPadding({mapTop:0,viewportHeight:500,toolbarBottom:110,sheetTop:150}),null);
});
test('route candidate confirmation suppresses the picker hint and normal-profile building cache is retained',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/panel.hidden=false;\s*document.getElementById\('route-pick-hint'\).hidden=true/);
 assert.doesNotMatch(main,/building-tile-worker/);
 assert.match(main,/function djTrimOffscreenBuildings\(sheets\)\{\s*if\(!djRenderBudget.isEconomy\(\)/);
 const civic=readFileSync(new URL('../src/civic-facility-layer.js',import.meta.url),'utf8');
 assert.match(civic,/map.on\('moveend',scheduleReconcile\)/);
 assert.match(civic,/const matches=new Set\(matchedIds\)/);
});

test('post-fit correction checks projected points and preserves the usable strip',()=>{
 const padding={top:120,bottom:430,left:30,right:30};
 assert.equal(routeProjectionCorrection([{x:80,y:170},{x:260,y:390}],390,844,padding),null);
 const correction=routeProjectionCorrection([{x:100,y:220},{x:250,y:650}],390,844,padding);
 assert.ok(correction.zoomOut>0);assert.ok(correction.y>435);
 const scale=2**(-correction.zoomOut);
 for(const point of [{x:100,y:220},{x:250,y:650}]){
  const x=195+(point.x-correction.x)*scale,y=422+(point.y-correction.y)*scale;
  assert.ok(x>=30&&x<=360&&y>=120&&y<=414);
 }
});
