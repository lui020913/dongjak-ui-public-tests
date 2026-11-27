import test from 'node:test';
import assert from 'node:assert/strict';
import {isExteriorDetailRoad,exteriorRoadRule,installExteriorRoadScope} from '../src/exterior-road-scope.mjs';
const geometry={type:'Polygon',coordinates:[[[126.94,37.5],[126.95,37.5],[126.95,37.51],[126.94,37.5]]]};
test('outside detail rule keeps major roads and every intersecting district road',()=>{
 const rule=exteriorRoadRule(geometry);
 assert.equal(rule[0],'any');assert.ok(rule[1][2][1].includes('primary'));assert.ok(!rule[1][2][1].includes('residential'));assert.ok(!rule[1][2][1].includes('path'));assert.deepEqual(rule[2],['<=',['distance',geometry],0]);
 for(const id of ['road_minor','road_path','highway-area','bridge-secondary'])assert.ok(isExteriorDetailRoad({id,type:'line','source-layer':'transportation'}));
 for(const layer of [{id:'railway',type:'line','source-layer':'transportation'},{id:'road-name',type:'symbol','source-layer':'transportation'},{id:'walking-route-line',type:'line',source:'app-route'},{id:'waterway',type:'line','source-layer':'waterway'}])assert.ok(!isExteriorDetailRoad(layer));
});
test('scope is reversible without duplicating predicates or touching route geometry',()=>{
 const handlers={},base=['==',['get','class'],'minor'],layers=[{id:'road_minor',type:'line','source-layer':'transportation'},{id:'walking-route-line',type:'line',source:'route'}],filters=new Map([['road_minor',base]]),writes=[];
 const map={on:(e,f)=>handlers[e]=f,getStyle:()=>({layers}),getFilter:id=>filters.get(id),setFilter:(id,f)=>{writes.push(id);filters.set(id,f);}};
 const owner=installExteriorRoadScope(map);owner.update(geometry,false);
 assert.deepEqual(filters.get('road_minor'),['all',base,exteriorRoadRule(geometry)]);
 const count=writes.length;handlers.styledata();handlers.idle();assert.equal(writes.length,count);
 owner.update(geometry,true);assert.deepEqual(filters.get('road_minor'),base);
 owner.update(geometry,false);assert.deepEqual(filters.get('road_minor'),['all',base,exteriorRoadRule(geometry)]);
 assert.ok(writes.every(id=>id==='road_minor'));
});
