import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transitEndpointPolicy,transitCoordinatesInScope,transitPointInScope,exteriorMapActive,transitWalkStyle,transitContextBounds,districtScopedNativeLayer,installSharedDistrictScope} from '../src/transit-exterior-scope.mjs';
const a={lng:126.95,lat:37.50},b={lng:127.01,lat:37.55},c={lng:127.1,lat:37.6};
const inside=(lng,lat)=>lng===a.lng&&lat===a.lat;
test('one endpoint must be in Dongjak; neither endpoint may exceed pilot search rectangle',()=>{
 assert.equal(transitEndpointPolicy(a,b,inside),'allowed');
 assert.equal(transitEndpointPolicy(b,a,inside),'allowed');
 assert.equal(transitEndpointPolicy(a,a,inside),'allowed');
 assert.equal(transitEndpointPolicy(b,c,inside),'both-outside');
 assert.equal(transitEndpointPolicy(a,{lng:128,lat:37.5},inside),'outside-service-area');
 assert.equal(transitEndpointPolicy(a,b,()=>null),'boundary-unavailable');
 assert.equal(transitPointInScope({lng:'126.95',lat:37.5}),false);
});
test('vehicle geometry may cross district but must be valid and bounded',()=>{
 assert.equal(transitCoordinatesInScope([[a.lng,a.lat],[b.lng,b.lat]]),true);
 assert.equal(transitCoordinatesInScope([[a.lng,a.lat],[128,37.5]]),false);
 assert.equal(transitCoordinatesInScope([[a.lng,a.lat,0],[b.lng,b.lat]]),false);
 assert.equal(transitCoordinatesInScope([]),false);
});
test('exterior display is owned only by transit editor, picker or preview',()=>{
 assert.equal(exteriorMapActive({mode:'walk',tab:'route'}),false);
 assert.equal(exteriorMapActive({mode:'transit',tab:'route'}),true);
 assert.equal(exteriorMapActive({mode:'transit',tab:'map',pick:'end'}),true);
 assert.equal(exteriorMapActive({mode:'transit',tab:'map'}),false);
 assert.equal(exteriorMapActive({mode:'transit',tab:'news',preview:true}),false);
 assert.equal(exteriorMapActive({mode:'walk',tab:'map',preview:true}),true);
});
test('unassessed and crossing walks never display as evaluated',()=>{
 assert.equal(transitWalkStyle({transitPri:{risk:5,coverage:.9},transitExterior:true}),'#89958f');
 assert.equal(transitWalkStyle({transitPri:{risk:5,coverage:.5}}),'#89958f');
 assert.equal(transitWalkStyle({transitPri:{risk:5,coverage:.9}}),'#168f82');
 assert.equal(transitWalkStyle({}),'#89958f');
});

test('local render extent is narrower than service search and includes complete detours',()=>{
 const district=[[126.91,37.47],[126.99,37.53]];
 const initial=transitContextBounds(district);
 assert.ok(initial[0][0]>126.78&&initial[1][0]<127.20);
 const coords=[[a.lng,a.lat],[127.04,37.58],[b.lng,b.lat]];
 const bounds=transitContextBounds(district,[a,b],coords);
 for(const [x,y] of coords)assert.ok(x>=bounds[0][0]&&x<=bounds[1][0]&&y>=bounds[0][1]&&y<=bounds[1][1]);
 assert.ok(bounds[0][0]>126.78&&bounds[1][0]<127.20);
});
test('both modes use the same native district geometry filters, preserving roads and route layers',()=>{
 const layers=[{id:'road_primary',type:'line','source-layer':'transportation'},{id:'building',type:'fill','source-layer':'building'},{id:'building-3d',type:'fill-extrusion','source-layer':'building'},{id:'grass',type:'fill','source-layer':'landcover'},{id:'rail',type:'line','source-layer':'transportation'},{id:'dj-transit-multi-stops-circle',type:'circle'},{id:'district-pri',type:'line'},{id:'facility',type:'symbol'},{id:'water',type:'fill','source-layer':'water'}];
 const filters=new Map([['building',['==',['get','class'],'house']]]),writes=[];
 const map={getStyle:()=>({layers}),getFilter:id=>filters.get(id),setFilter:(id,v)=>{filters.set(id,v);writes.push(id);},on(){}};
 const boundary={type:'Polygon',coordinates:[[[126.9,37.4],[127,37.4],[127,37.6],[126.9,37.6],[126.9,37.4]]]};
 const scope=installSharedDistrictScope(map,boundary);scope.sync();
 assert.deepEqual(writes,['building','building-3d','grass']);
 assert.deepEqual(filters.get('building'),['all',['==',['get','class'],'house'],['<=',['distance',boundary],0.1]]);
 assert.ok(!districtScopedNativeLayer(layers[0]));assert.ok(!districtScopedNativeLayer(layers[4]));
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/installSharedDistrictScope\(map,boundaryGeometry\)/);
 assert.doesNotMatch(main,/createTransitContextLayers|map\.setTerrain\(null\)|import '\.\/transit-exterior-scope.css'/);
 const scopeCode=main.split('function syncTransitExterior(force=false){')[1].split('function clearTransitPreview(){')[0];
 assert.doesNotMatch(scopeCode,/setLayoutProperty|setPaintProperty|setTerrain/);
});
test('initial camera keeps about 750 metres of context',()=>{
 const district=[[126.91,37.47],[126.99,37.53]];
 const bounds=transitContextBounds(district);
 assert.ok(district[0][0]-bounds[0][0]<.009);
 assert.ok(bounds[1][1]-district[1][1]<.007);
});
