import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transitEndpointPolicy,transitCoordinatesInScope,transitPointInScope,exteriorMapActive,transitWalkStyle,transitContextBounds,transitContextLayer,createTransitContextLayers} from '../src/transit-exterior-scope.mjs';
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
test('transit context retains ordinary roads and selected route, suspends other layers, and restores prior settings',()=>{
 const layers=[{id:'road_primary',type:'line','source-layer':'transportation'},{id:'building',type:'fill','source-layer':'building'},{id:'rail',type:'line','source-layer':'transportation'},{id:'dj-transit-multi-stops-circle',type:'circle'},{id:'district-pri',type:'line'},{id:'facility',type:'symbol'},{id:'water',type:'fill','source-layer':'water'}];
 const visibility=new Map([['facility','none']]);
 const writes=[];
 const map={getStyle:()=>({layers}),getLayer:id=>layers.find(x=>x.id===id),getLayoutProperty:id=>visibility.get(id),setLayoutProperty:(id,k,v)=>{visibility.set(id,v);writes.push(id);}};
 const context=createTransitContextLayers(map);
 context.enforce();context.enforce();
 assert.deepEqual(writes,['building','rail','district-pri']);
 for(const id of ['road_primary','dj-transit-multi-stops-circle','water'])assert.ok(transitContextLayer(map.getLayer(id)));
 context.restore();
 assert.equal(visibility.get('building'),'visible');assert.equal(visibility.get('facility'),'none');
});

test('initial camera keeps about 750 metres of context and ignores unrelated raster overlays',()=>{
 const district=[[126.91,37.47],[126.99,37.53]];
 const bounds=transitContextBounds(district);
 assert.ok(district[0][0]-bounds[0][0]<.009);
 assert.ok(district[1][1]-bounds[1][1]<.007);
 assert.equal(transitContextLayer({id:'unrelated-raster',type:'raster'}),false);
 assert.equal(transitContextLayer({id:'osm-emergency-base',type:'raster'}),true);
});

test('non-route DOM markers and heavy facility refresh are suspended during transit',()=>{
 const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 const css=read('transit-exterior-scope.css');
 assert.match(css,/data-dj-transit-exterior="true"\] \.dongjak-landmark/);
 assert.match(css,/\.dongjak-education-marker/);
 for(const file of ['civic-facility-layer.js','education-layer.js','landmark-layer.js','readable-3d-labels.js','ui-environment.js','transport-map.js'])assert.match(read(file),/djTransitExterior/);
});
