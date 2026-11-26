import test from 'node:test';
import assert from 'node:assert/strict';
import {roadTilesForViewport,installReviewedBaseRoads,reviewedRoadAnchor} from '../src/reviewed-base-road-layer.mjs';
test('select by full feature bounding boxes, including features crossing tile borders',()=>{
 const tiles=[{file:'inside',bbox:[126.94,37.49,126.96,37.51]},{file:'outside',bbox:[127,38,127.1,38.1]},{file:'edge',bbox:[126.949,37.501,126.99,37.52]}];
 assert.deepEqual(roadTilesForViewport(tiles,[126.95,37.5,126.951,37.502]).map(x=>x.file),['inside','edge']);
});
test('ordinary release does not install review layers or fetch data',async()=>{
 const c=installReviewedBaseRoads({map:null,app:null,enabled:false});
 assert.equal(await c.refresh(),false);c.dispose();
});
test('viewport load preserves native roads and hides preview on zoom, night and data failure',async()=>{
 const old=globalThis.MutationObserver;globalThis.MutationObserver=class{observe(){}disconnect(){}};
 try{
 const listeners=new Map(),layers=new Map(),sources=new Map();let zoom=17,fail=false;
 const app={dataset:{theme:'light'}},tile={file:'a.geojson',bbox:[126.94,37.49,126.96,37.51],bytes:100,count:1};
 const feature={type:'Feature',properties:{kind:'reviewed'},geometry:{type:'Polygon',coordinates:[[[126.95,37.5],[126.951,37.5],[126.951,37.501],[126.95,37.5]]]}};
 layers.set('native-road',{id:'native-road',type:'line','source-layer':'transportation',source:'openmaptiles'});
 const map={getZoom:()=>zoom,getBounds:()=>({getWest:()=>126.95,getSouth:()=>37.5,getEast:()=>126.951,getNorth:()=>37.501}),getStyle:()=>({sources:{openmaptiles:{}},layers:[...layers.values()]}),getLayer:id=>layers.get(id),getSource:id=>sources.get(id),addSource:(id,s)=>sources.set(id,{...s,setData(data){this.data=data}}),addLayer:l=>layers.set(l.id,l),setLayoutProperty:(id,k,v)=>{const l=layers.get(id);l.layout={...l.layout,[k]:v}},setPaintProperty:(id,k,v)=>{const l=layers.get(id);l.paint={...l.paint,[k]:v}},removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),on:(n,f)=>listeners.set(n,f),off:n=>listeners.delete(n)};
 const assets={manifest:async()=>({tiles:[tile]}),checked:async()=>{if(fail)throw Error('bad');return {type:'FeatureCollection',features:[feature]}}};
 const ctrl=installReviewedBaseRoads({map,app,assets,enabled:true});
 assert.equal(await ctrl.refresh(),true);assert.equal(layers.get('dj-reviewed-base-road-fill').layout.visibility,'visible');assert.deepEqual(sources.get('dj-reviewed-base-road-surfaces').data.features,[feature]);assert.equal(layers.get('native-road').layout,undefined);
 zoom=15;assert.equal(await ctrl.refresh(),false);assert.equal(layers.get('dj-reviewed-base-road-fill').layout.visibility,'none');
 zoom=17;app.dataset.sangdoNight='on';assert.equal(await ctrl.refresh(),false);delete app.dataset.sangdoNight;
 assert.equal(await ctrl.refresh(),true);ctrl.dispose();assert.equal(layers.has('dj-reviewed-base-road-fill'),false);assert.equal(layers.has('native-road'),true);
 fail=true;const failed=installReviewedBaseRoads({map,app,assets,enabled:true});assert.equal(await failed.refresh(),false);assert.equal(layers.get('dj-reviewed-base-road-fill').layout.visibility,'none');failed.dispose();
 }finally{globalThis.MutationObserver=old}
});

test('verified roads can cover conflicting native 2D footprints but not GIS footprints, extrusions or labels',()=>{
 const layers=[{id:'land',type:'fill'},{id:'native-building',type:'fill','source-layer':'building'},{id:'native-road',type:'line','source-layer':'transportation'},{id:'dongjak-buildings-footprint-2',type:'fill'},{id:'dongjak-buildings-3d-2',type:'fill-extrusion'},{id:'poi',type:'symbol'}];
 assert.equal(reviewedRoadAnchor(layers),'native-road');
 assert.equal(reviewedRoadAnchor([{id:'land',type:'fill'},{id:'poi',type:'symbol'}]),'poi');
 assert.equal(reviewedRoadAnchor([{id:'native-building',type:'fill','source-layer':'building'},{id:'native-3d',type:'fill-extrusion','source-layer':'building'}]),'native-3d');
});
