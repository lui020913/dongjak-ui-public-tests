import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBuildingCoverage,buildingModeVisibility} from '../src/building-coverage.js';
import {createBusRouteOverlay,BUS_ROUTE_STOP_ICONS,BASE_BUS_STOP_LAYERS} from '../src/bus-route-overlay.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('2D and 3D building modes are mutually exclusive and reversible',()=>{
 const handlers={},states=new Map([['building','visible'],['optional-building','none']]);
 const map={on:(n,fn)=>handlers[n]=fn,getLayer:id=>states.has(id),getLayoutProperty:id=>states.get(id),setLayoutProperty:(id,k,v)=>states.set(id,v)};
 const c=createBuildingCoverage(map,['building','optional-building']);
 assert.deepEqual(buildingModeVisibility(false),{plan:'visible',extrusion:'none'});
 assert.deepEqual(buildingModeVisibility(true),{plan:'none',extrusion:'visible'});
 c.setExtruding(true);assert.equal(states.get('building'),'none');
 c.setExtruding(false);assert.equal(states.get('building'),'visible');assert.equal(states.get('optional-building'),'none');
 const main=read('src/main.js');
 assert.match(main,/const fillVisible=visibleBuilding2D\(\) && !show/);
 assert.match(main,/const desired=modeVisibility.extrusion/);
});
test('selected route icons use official point coordinates and competing markers are restored on clear',async()=>{
 const layers=new Map(BASE_BUS_STOP_LAYERS.map(id=>[id,{id,layout:{visibility:'visible'}}])),sources=new Map();let data;
 const map={getLayer:id=>layers.get(id),getSource:id=>sources.get(id),addSource:id=>sources.set(id,{setData:d=>data=d}),addLayer:l=>layers.set(l.id,l),getLayoutProperty:(id,k)=>layers.get(id)?.layout?.[k],setLayoutProperty:(id,k,v)=>{layers.get(id).layout??={};layers.get(id).layout[k]=v;},hasImage:()=>true,on(){},off(){}};
 const overlay=createBusRouteOverlay({map,apiBase:'/api',fetcher:async()=>({ok:true,json:async()=>({routeId:'12345',coordinates:[[126.95,37.5],[126.96,37.51]],stops:[{name:'공식 정류장',seq:1,arsId:'12345',lng:126.95001,lat:37.50002}]})})});
 await overlay.select({routeId:'12345',route:'1'});assert.equal(layers.get(BUS_ROUTE_STOP_ICONS).source,'dj-selected-bus-route');
 assert.deepEqual(data.features[1].geometry.coordinates,[126.95001,37.50002]);assert.ok(BASE_BUS_STOP_LAYERS.every(id=>layers.get(id).layout.visibility==='none'));
 overlay.clear();assert.ok(BASE_BUS_STOP_LAYERS.every(id=>layers.get(id).layout.visibility==='visible'));
});
test('release dock hides during PRI or layer panels',()=>{const css=read('src/pilot-layer-selection.css');assert.match(css,/#dj-pri-legend:not\(\[hidden\]\)/);assert.match(css,/#djNext-layer-panel:not\(\[hidden\]\)/);assert.match(css,/data-dj-pri-visible="true"/);});
