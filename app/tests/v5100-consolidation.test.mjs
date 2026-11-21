import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldFetchSupplementalSchools,hasMatchingSchoolInTiles} from '../src/education-layer.js';
import {markerBoxHidden} from '../src/map-marker-occlusion.js';
import {namedBridgeLines,HANGANG_BRIDGE_REFERENCES} from '../src/hangang-bridge-labels.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('v5.10 single responsive CSS authority is imported after legacy visual skins',()=>{
 const main=read('src/main.js');
 const core=read('src/layout-core.css');
 assert.ok(main.indexOf("import './layout-core.css'")>main.indexOf("import './map-patch/dj-v5911-place-polish.css'"));
 for(const item of ['#app .topbar','#app #bottom-nav','#app #map-tools-toggle','#app .sheet.overview-sheet']){
   assert.ok(core.includes(item),item);
 }
 assert.match(core,/grid-template-areas:'brand search tools'/);
 assert.match(core,/@media\(max-width:700px\)/);
});

test('school fallback may run with a present but empty vector school layer',()=>{
 assert.equal(shouldFetchSupplementalSchools({vectorLayerExists:true,visibleSchoolCount:0}),true);
 assert.equal(shouldFetchSupplementalSchools({vectorLayerExists:true,visibleSchoolCount:8}),false);
 assert.equal(shouldFetchSupplementalSchools({vectorLayerExists:false,visibleSchoolCount:0}),true);
});

test('supplemental school markers are suppressed only for the same named tile school',()=>{
 const school={name:'상도초등학교',lng:126.95,lat:37.5};
 const mock={getLayer:()=>({}),project:()=>({x:200,y:100}),
   queryRenderedFeatures:()=>[{properties:{'name:ko':'상도초등학교'}}]};
 assert.equal(hasMatchingSchoolInTiles(mock,school),true);
 assert.equal(hasMatchingSchoolInTiles({...mock,queryRenderedFeatures:()=>[{properties:{'name:ko':'상도중학교'}}]},school),false);
});

test('logo occlusion uses the full marker rectangle and ignores distant controls',()=>{
 const nav={left:12,right:100,top:80,bottom:470};
 assert.equal(markerBoxHidden({x:120,y:200,width:400,height:600,boxWidth:90,boxHeight:44,obstacles:[nav]}),true);
 assert.equal(markerBoxHidden({x:340,y:200,width:400,height:600,boxWidth:70,boxHeight:44,obstacles:[nav]}),false);
 assert.equal(markerBoxHidden({x:390,y:200,width:400,height:600,boxWidth:52,boxHeight:40,obstacles:[]}),true);
});

test('verified OSM lines become bridge-shaped GeoJSON instead of arbitrary point labels',()=>{
 const ref=HANGANG_BRIDGE_REFERENCES.find(x=>x.name==='동작대교');
 const way={tags:{name:'동작대교',bridge:'yes'},geometry:[
   {lon:ref.lng,lat:ref.lat-.0015},{lon:ref.lng,lat:ref.lat},
   {lon:ref.lng,lat:ref.lat+.0015}]};
 const result=namedBridgeLines([way]);
 assert.equal(result.length,1);
 assert.equal(result[0].geometry.type,'LineString');
 assert.equal(result[0].properties.name,'동작대교');
 assert.deepEqual(result[0].geometry.coordinates[0],[ref.lng,ref.lat-.0015]);
 assert.equal(namedBridgeLines([{tags:{name:'없는교량'},geometry:way.geometry}]).length,0);
});

test('release information and package are synchronized to the integrated version',()=>{
   assert.match(read('index.html'),/>업데이트<\/button>/);
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
});
