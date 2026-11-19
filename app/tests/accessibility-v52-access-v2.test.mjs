import test from 'node:test';
import assert from 'node:assert/strict';
import {DONGJAK_UNIVERSITIES,schoolIdentity} from '../src/education-layer.js';
import {isVegetationLayer,GREEN_PALETTE} from '../src/map-appearance.js';
import {isKnownAccessibility,parsePublicExitArcGIS} from '../src/station-accessibility.js';

test('중앙대 마커는 교문이 아니라 서울캠퍼스 중심 근처에 고정한다',()=>{
  const cau=DONGJAK_UNIVERSITIES.find(x=>x.name==='중앙대학교');
  assert.deepEqual([cau.lng,cau.lat],[126.95676,37.50439]);
  assert.equal(schoolIdentity('중앙대학교 후문'),'중앙대학교');
});
test('산림·공원은 같은 녹색 계열이며 산림이 더 진하다',()=>{
  assert.ok(isVegetationLayer({type:'fill',id:'landcover_wood'}));
  assert.ok(isVegetationLayer({type:'fill',id:'park'}));
  assert.notEqual(GREEN_PALETTE.light.forest,GREEN_PALETTE.light.park);
});
test('공식 ArcGIS 출구 좌표에 값이 있는 항목만 등록하고 승강설비는 추정하지 않는다',()=>{
  const geo=parsePublicExitArcGIS({features:[
    {attributes:{stn_nm:'상도',entrc_no:'2',sub_ent_sn:'4321'},geometry:{x:126.947,y:37.503}},
    {attributes:{stn_nm:'상도',entrc_no:'2',sub_ent_sn:'4321'},geometry:{x:126.947,y:37.503}},
    {attributes:{stn_nm:'가짜'},geometry:{x:0,y:0}}
  ]});
  assert.equal(geo.features.length,1);
  assert.equal(geo.features[0].properties.type,'exit');
  assert.equal(geo.features[0].properties.equipment,'unknown');
  assert.equal(isKnownAccessibility(geo.features[0]),true);
});
test('좌표 없는 설비는 표시되지 않는다',()=>{
  assert.equal(isKnownAccessibility({properties:{type:'elevator'},geometry:{type:'Point',coordinates:[null,null]}}),false);
});
