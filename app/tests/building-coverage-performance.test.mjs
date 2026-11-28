import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildingCoverage} from '../src/building-coverage.js';
const geometry={type:'Polygon',coordinates:[[[126.94,37.50],[126.9401,37.50],[126.9401,37.5001],[126.94,37.5001],[126.94,37.50]]]};
test('coverage scan checks GIS source readiness once per sheet, not once per native feature',()=>{
 const handlers=new Map(),states=[],removed=[];let readiness=0,zoomReads=0,visible=true;
 const features=Array.from({length:2000},(_,id)=>({id,source:'openmaptiles',sourceLayer:'building',geometry,properties:{building:'apartments'}}));
 const map={on:(name,fn)=>handlers.set(name,fn),getLayer:()=>true,getLayoutProperty:(id)=>id.startsWith('dongjak-buildings-footprint-')?(visible?'visible':'none'):'visible',setLayoutProperty(){},getSource:()=>true,isSourceLoaded:()=>{readiness++;return true},getZoom:()=>{zoomReads++;return 16},isMoving:()=>false,queryRenderedFeatures:()=>features,setFeatureState:(target,state)=>states.push([target,state]),removeFeatureState:target=>removed.push(target)};
 const coverage=createBuildingCoverage(map,['building']);
 coverage.setSheet('one',[],[],[{geometry}],[]);
 handlers.get('idle')();
 assert.equal(readiness,1);assert.equal(zoomReads,1);
 assert.equal(states.length,2000);
 assert.ok(states.every(([,state])=>state.djGisCovered===true));
 handlers.get('idle')();assert.equal(readiness,1);
 visible=false;handlers.get('moveend')();handlers.get('idle')();
 assert.equal(readiness,2);assert.equal(removed.length,2000);
});
