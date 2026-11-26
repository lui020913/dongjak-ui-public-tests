import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextBuildingPitchMode} from '../src/building-coverage.js';
import {nativePavedAreaFill,nativePavedAreaPaint,LIGHT_PAVED_AREA_COLOR,roadColorRole} from '../src/ui-environment.js';
test('pitch oscillation only switches once across each threshold',()=>{
 let state=false;const seen=[0,8,9.9,10,9.8,10.1,8,7.1,7,8,9.9,12].map(p=>state=nextBuildingPitchMode(state,p));
 assert.deepEqual(seen,[false,false,false,true,true,true,true,true,false,false,false,true]);
});
test('native pavement polygons use a distinct color without altering linear roads, water, rail, landuse or analysis',()=>{
 assert.equal(nativePavedAreaFill({id:'highway-area',type:'fill','source-layer':'transportation'}),true);
 assert.equal(nativePavedAreaFill({id:'highway-area-pedestrian',type:'fill','source-layer':'transportation'}),true);
 for(const layer of [{id:'highway-primary',type:'line','source-layer':'transportation'},{id:'highway-area-pier',type:'fill','source-layer':'transportation'},{id:'rail-area',type:'fill','source-layer':'transportation'},{id:'building',type:'fill','source-layer':'building'},{id:'campus',type:'fill','source-layer':'landuse'},{id:'dj-pri-risk',type:'fill',source:'pri'}])assert.equal(nativePavedAreaFill(layer),false);
 assert.equal(roadColorRole({id:'highway-primary',type:'line','source-layer':'transportation'}),'surface');
 assert.notEqual(LIGHT_PAVED_AREA_COLOR,'#ffffff');
 assert.deepEqual(nativePavedAreaPaint('#ffffff'),['match',['coalesce',['get','class'],''],['path','pedestrian','footway','cycleway','steps'],LIGHT_PAVED_AREA_COLOR,'#ffffff']);
});
test('one building visibility owner, no frame-time fallback to 2D',()=>{
 const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 assert.doesNotMatch(read('main.js'),/movementIsSlow|slowSamples|interactiveMoving/);
 assert.doesNotMatch(read('map-appearance.js'),/installAdaptiveMapPerformance/);
 assert.match(read('main.js'),/buildingPitchActive && loadedBuildingTiles\.size>0/);
});
