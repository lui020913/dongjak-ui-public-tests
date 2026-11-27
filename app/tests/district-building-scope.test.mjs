import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDistrictBuildingScope,isBuildingGeometryLayer,districtBuildingClause} from '../src/district-building-scope.mjs';
const a={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
const b={type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]};
test('scope covers native and GIS geometry, not unrelated route or land layers',()=>{
 for(const type of ['fill','fill-extrusion','line'])assert.ok(isBuildingGeometryLayer({id:'native',type,'source-layer':'building'}));
 assert.ok(isBuildingGeometryLayer({id:'dongjak-buildings-3d-1',type:'fill-extrusion'}));
 assert.ok(!isBuildingGeometryLayer({id:'building-label',type:'symbol','source-layer':'building'}));
 assert.ok(!isBuildingGeometryLayer({id:'park',type:'fill','source-layer':'landuse'}));
 assert.deepEqual(districtBuildingClause(null),['==',1,0]);
});
test('initial fail closed, original predicates preserved, no redundant writes, updated boundary replaces old',()=>{
 const layers=[{id:'building',type:'fill','source-layer':'building'},{id:'road',type:'line','source-layer':'transportation'}];
 const base=['==',['get','class'],'building'],filters=new Map([['building',base]]),writes=[];
 const map={getStyle:()=>({layers}),getLayer:id=>layers.find(x=>x.id===id),getFilter:id=>filters.get(id),setFilter:(id,f)=>{writes.push(id);filters.set(id,f);}};
 const scope=createDistrictBuildingScope(map);scope.apply();
 assert.deepEqual(filters.get('building'),['all',base,districtBuildingClause(null)]);
 scope.setBoundary(a);assert.deepEqual(filters.get('building'),['all',base,districtBuildingClause(a)]);
 const count=writes.length;scope.apply();scope.setBoundary(a);assert.equal(writes.length,count);
 scope.setBoundary(b);assert.deepEqual(filters.get('building'),['all',base,districtBuildingClause(b)]);
 layers.push({id:'dongjak-buildings-3d-1',type:'fill-extrusion'});scope.apply();
 assert.deepEqual(filters.get('dongjak-buildings-3d-1'),districtBuildingClause(b));
 assert.ok(!writes.includes('road'));
});
