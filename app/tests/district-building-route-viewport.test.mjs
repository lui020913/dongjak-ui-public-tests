import test from 'node:test';
import assert from 'node:assert/strict';
import {createDistrictBuildingScope,isNativeBuildingGeometry} from '../src/district-building-scope.mjs';
import {strictRouteViewportPadding,waitForRouteViewport} from '../src/route-map-focus.js';
test('building-only scope preserves existing filters, applies once, updates authoritative boundary',()=>{
 const layers=[{id:'building',type:'fill','source-layer':'building'},{id:'building-3d',type:'fill-extrusion','source-layer':'building'},{id:'outline',type:'line','source-layer':'building'},{id:'road',type:'line','source-layer':'transportation'},{id:'park',type:'fill','source-layer':'park'}];
 const original=['==',['get','class'],'building'],filters=new Map([['building',original]]),writes=[];
 const map={getStyle:()=>({layers}),getFilter:id=>filters.get(id),setFilter:(id,f)=>{writes.push(id);filters.set(id,f);},on(){}};
 const p={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]};
 const s=createDistrictBuildingScope(map);s.setBoundary(p);assert.equal(writes.length,3);
 assert.deepEqual(filters.get('building'),['all',original,['==',['distance',p],0]]);
 assert.equal(filters.has('road'),false);assert.equal(filters.has('park'),false);
 s.setBoundary(p);assert.equal(writes.length,3);
 const q={...p,coordinates:[[[0,0],[2,0],[2,2],[0,0]]]};s.setBoundary(q);assert.equal(writes.length,6);
 assert.deepEqual(filters.get('building-3d'),['==',['distance',q],0]);
 assert.equal(isNativeBuildingGeometry({id:'label',type:'symbol','source-layer':'building'}),false);
});
test('route padding never scales into the card, reserves pin clearance, waits for animation',async()=>{
 assert.deepEqual(strictRouteViewportPadding({mapTop:0,viewportHeight:844,toolbarBottom:128,sheetTop:407}),{top:176,bottom:455,left:32,right:32});
 assert.equal(strictRouteViewportPadding({mapTop:0,viewportHeight:500,toolbarBottom:170,sheetTop:225}),null);
 let t=0;
 const final=await waitForRouteViewport(()=>({top:80,bottom:t<180?400-Math.floor(t/20):390,left:32,right:32}),()=>true,{now:()=>t,frame:async()=>{t+=20;}});
 assert.equal(final.bottom,390);assert.ok(t>=380);
});
