import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDistrictBuildingScope,isDistrictBuildingLayer} from '../src/district-building-scope.mjs';
const polygon=(x=0)=>({type:'Polygon',coordinates:[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]]});
test('shared filter scopes both native and GIS polygon/extrusion layers without changing unrelated layers',()=>{
 const layers=[{id:'building',type:'fill','source-layer':'building'},{id:'building-top',type:'fill-extrusion','source-layer':'building'},{id:'dongjak-buildings-3d-2',type:'fill-extrusion'},{id:'dongjak-buildings-footprint-2',type:'fill'},{id:'road',type:'line','source-layer':'transportation'},{id:'apartment-label',type:'symbol','source-layer':'building'}];
 const base=['==',['get','_render3d'],true],filters=new Map([['dongjak-buildings-3d-2',base]]),writes=[];
 const map={getStyle:()=>({layers}),getFilter:id=>filters.get(id),setFilter:(id,v)=>{filters.set(id,v);writes.push(id);},on(){}};
 const s=createDistrictBuildingScope(map);s.update(polygon());s.sync();
 assert.deepEqual(writes,['building','building-top','dongjak-buildings-3d-2','dongjak-buildings-footprint-2']);
 assert.deepEqual(filters.get('dongjak-buildings-3d-2'),['all',base,['<=',['distance',polygon()],0]]);
 s.update(polygon(2));assert.deepEqual(filters.get('dongjak-buildings-3d-2'),['all',base,['<=',['distance',polygon(2)],0]]);
 layers.push({id:'dongjak-buildings-footprint-3',type:'fill'});s.sync(['dongjak-buildings-footprint-3']);
 assert.deepEqual(filters.get('dongjak-buildings-footprint-3'),['all',['<=',['distance',polygon(2)],0]]);
 assert.equal(isDistrictBuildingLayer(layers[4]),false);assert.equal(isDistrictBuildingLayer(layers[5]),false);
});
test('district building scope is independent of route mode and follows the official boundary',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.equal((main.match(/districtBuildingScope\?\.update\(boundaryGeometry\)/g)||[]).length,2);
 assert.match(main,/districtBuildingScope\?\.sync\(\[footprintFillId,footprintLineId,layerId\]\)/);
 assert.doesNotMatch(main.split('function syncTransitExterior(force=false){')[1].split('function clearTransitPreview(){')[0],/districtBuildingScope|setFilter|setLayoutProperty|setTerrain/);
});
