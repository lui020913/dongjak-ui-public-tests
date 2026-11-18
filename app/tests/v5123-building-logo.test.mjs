import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDING_VISUAL_PALETTE,buildingFootprintPaint,nativeBuildingFootprint} from '../src/map-appearance.js';
import {markerBoxHidden} from '../src/map-marker-occlusion.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('위에서 본 건물은 어두운 청회색 면을 유지하면서 충분한 대비를 확보',()=>{
  const p=BUILDING_VISUAL_PALETTE.dark;
  assert.equal(buildingFootprintPaint('dark')['fill-opacity'],1);
  assert.ok(p.footprintOpacity>0.65);
  assert.notEqual(p.footprint,'#fff');
  assert.ok(p.nearOpacity>p.farOpacity && p.farOpacity>=0.2);
  assert.ok(nativeBuildingFootprint({id:'building',type:'fill'}));
});
test('대학/대표장소 지도 마커는 PNG 이미지를 만들지 않음',()=>{
  const education=read('src/education-layer.js');
  const landmarks=read('src/landmark-layer.js');
  assert.match(education,/university-name-only/);
  assert.doesNotMatch(education,/document\.createElement\('img'\)/);
  assert.doesNotMatch(landmarks,/document\.createElement\('img'\)/);
  assert.match(landmarks,/no-image-tile/);
  assert.match(read('index.html'),/icons\/dongjak-light-192\.png/); // header remains
});
test('가장자리와 UI 부근 지도 마커 숨김',()=>{
  assert.ok(markerBoxHidden({x:30,y:50,width:390,height:800,margin:34}));
  assert.ok(markerBoxHidden({x:70,y:170,width:390,height:800,obstacles:[{left:0,top:70,right:105,bottom:320}]}));
  assert.ok(!markerBoxHidden({x:200,y:410,width:390,height:800,margin:34}));
  const js=read('src/map-marker-occlusion.js');
  assert.match(js,/#night-visibility-float/);
});
