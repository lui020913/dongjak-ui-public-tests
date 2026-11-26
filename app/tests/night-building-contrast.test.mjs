import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_VISUAL_PALETTE,buildingFootprintPaint,buildingExtrusionAppearance,nativeBuildingFootprint,nativeBuildingExtrusion,installBaseBuildingPalette} from '../src/map-appearance.js';

const colorLuma=hex=>{
  const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255);
  return rgb.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
};
test('야간 건물 바닥과 지붕을 밝은 회색이 아니라 어두운 청회색으로 제한',()=>{
  const light=BUILDING_VISUAL_PALETTE.light,dark=BUILDING_VISUAL_PALETTE.dark;
  assert.ok(colorLuma(dark.footprint)<colorLuma(light.footprint)*0.15);
  assert.ok(colorLuma(dark.extrusion)<colorLuma(light.extrusion)*0.15);
  assert.equal(dark.footprintOpacity,0.74);
  assert.ok(dark.nearOpacity>=0.3 && dark.farOpacity>=0.2);
  assert.equal(buildingFootprintPaint('light')['fill-color'],'#c4d1d0');
});
test('다크 3D 건물은 지면만 어두워지는 현상을 막도록 충분한 불투명도를 유지',()=>{
  const near=buildingExtrusionAppearance('dark',10);
  const far=buildingExtrusionAppearance('dark',30);
  assert.equal(near.opacity,0.94);
  assert.equal(far.opacity,0.89);
  assert.ok(near.opacity>buildingExtrusionAppearance('light',10).opacity);
  assert.ok(far.opacity>buildingExtrusionAppearance('light',30).opacity);
  assert.ok(buildingExtrusionAppearance('dark',60).opacity===far.opacity);
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
  assert.deepEqual(changed,[['native-building','fill-color','#444d56'],['native-building','fill-opacity',['interpolate',['linear'],['zoom'],13,0,15,['case',['boolean',['feature-state','djGisCovered'],false],0,0.74]]],['native-building','fill-antialias',false]]);
});
