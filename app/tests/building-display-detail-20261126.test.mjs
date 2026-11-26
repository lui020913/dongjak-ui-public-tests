import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintMetrics,isDisplayBuilding,partitionDisplayBuildings} from '../src/building-display-detail.js';
import {createBuildingCoverage} from '../src/building-coverage.js';
const rect=(w,h,x=126.95,y=37.5)=>{const dx=w/(111320*Math.cos(y*Math.PI/180)),dy=h/111320;return {type:'Polygon',coordinates:[[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy],[x,y]]]};};
const feature=(w,h,properties={},x)=>({geometry:rect(w,h,x),properties});
test('one display policy for small buildings, thin shapes and named real buildings',()=>{
 const small=feature(3,4),normal=feature(6,6),narrow=feature(2,12),named=feature(3,4,{name:'공원 관리사무소'}),green=feature(7,6,{landuse:'forest'});
 assert.ok(Math.abs(buildingFootprintMetrics(small.geometry).area-12)<.01);
 assert.deepEqual(partitionDisplayBuildings([small,normal,narrow,named,green]),{visible:[normal,named,green],excluded:[small,narrow]});
 assert.equal(isDisplayBuilding({geometry:{type:'Point',coordinates:[0,0]}}),false);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/const within=visible.map/);assert.match(main,/data:collection,tolerance:0.5,maxzoom:19/);
});
test('only independently matched small native buildings are suppressed; nearby real or unknown buildings stay',()=>{
 const small=feature(3,4),large=feature(6,6),unmatched=feature(3,4,{},126.951),named=feature(3,4,{name:'관리실'});
 const features=[small,large,unmatched,named].map((f,i)=>({...f,id:i+1,source:'base',sourceLayer:'building'}));
 const handlers={},writes=[];
 const map={on:(n,f)=>handlers[n]=f,getLayer:()=>true,getLayoutProperty:()=> 'visible',setLayoutProperty(){},queryRenderedFeatures:()=>features,setFeatureState:(t,s)=>writes.push(t.id),removeFeatureState(){}};
 const coverage=createBuildingCoverage(map,['building']);coverage.setSheet(1,[small]);handlers.idle();assert.deepEqual(writes,[1]);
});
