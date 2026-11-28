import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_VISUAL_PALETTE,buildingFootprintPaint,buildingExtrusionAppearance,nativeBuildingFootprint,nativeBuildingExtrusion,installBaseBuildingPalette} from '../src/map-appearance.js';

test('stale dark preferences preserve the light building paint and pitch fade',()=>{
  assert.deepEqual(Object.keys(BUILDING_VISUAL_PALETTE),['light']);
  assert.deepEqual(buildingFootprintPaint('dark'),buildingFootprintPaint('light'));
  assert.deepEqual(buildingExtrusionAppearance('dark',10),{color:'#f1f3f1',opacity:.38});
  assert.deepEqual(buildingExtrusionAppearance('dark',30),{color:'#f1f3f1',opacity:.22});
  assert.equal(buildingExtrusionAppearance('dark',60).opacity,.22);
});
test('도로·야간 조명 레이어를 건물 바닥 색상 변경 대상에서 제외',()=>{
  assert.equal(nativeBuildingFootprint({type:'fill',id:'building'}),true);
  assert.equal(nativeBuildingFootprint({type:'fill',id:'structures','source-layer':'building'}),true);
  assert.equal(nativeBuildingFootprint({type:'fill',id:'building-outline'}),false);
  assert.equal(nativeBuildingFootprint({type:'fill',id:'dj-night-reach-fill'}),false);
  assert.equal(nativeBuildingFootprint({type:'fill',id:'walking-route'}),false);
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'building-3d','source-layer':'building'}),true);
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'dongjak-buildings-3d-01','source-layer':'building'}),false);
  assert.equal(nativeBuildingExtrusion({type:'fill-extrusion',id:'bridge-deck'}),false);
});
test('기존 건물에만 스타일 적용하고 안전 레이어는 보존',()=>{
  const changed=[];
  const map={getStyle:()=>({layers:[{type:'fill',id:'native-building','source-layer':'building'},{type:'fill',id:'dj-night-reach-fill'}]}),getLayer:id=>({id}),setPaintProperty:(...args)=>changed.push(args)};
  const previous=globalThis.document;
  globalThis.document={getElementById:()=>null};
  try{installBaseBuildingPalette({map,app:{dataset:{theme:'dark'}}});}
  finally{globalThis.document=previous;}
  assert.deepEqual(changed,[['native-building','fill-color','#fafafa'],['native-building','fill-outline-color','#e2e2e2'],['native-building','fill-opacity',['interpolate',['linear'],['zoom'],13,0,15,['case',['boolean',['feature-state','djGisCovered'],false],0,1]]],['native-building','fill-antialias',true]]);
});
