import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installDistrictBuildingScope,containsDistrictPoint} from '../src/district-building-scope.mjs';
import {strictRoutePreviewPadding} from '../src/route-map-focus.js';
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
test('route candidate confirmation suppresses the picker hint and worker preparation is shared',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/panel.hidden=false;\s*document.getElementById\('route-pick-hint'\).hidden=true/);
 assert.match(main,/new Worker\(new URL\('\.\/workers\/building-tile-worker.mjs'/);
 assert.match(main,/await waitBuildingQuiet\(\);\s*if\(boundary!==boundaryGeometry\)/);
});
