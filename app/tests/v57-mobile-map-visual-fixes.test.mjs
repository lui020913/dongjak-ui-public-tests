import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metroMarkerGeojson, METRO_PLATFORM_SPLIT_ZOOM} from '../src/metro-marker-geodata.js';
import {railOpacityAtDistance, fixedRailCollection} from '../src/fixed-rail-lines.js';
import {normalizeOSMTransport} from '../src/transport-map.js';

const colors={'1호선':'#0052A4','9호선':'#B89B2F'};
test('환승역은 원거리에서 작은 두 원으로 붙고 상세 축척에서 호선별 라벨을 구분한다',()=>{
  assert.equal(METRO_PLATFORM_SPLIT_ZOOM,15.55);
  const data=metroMarkerGeojson([{kind:'subway',name:'노량진',lng:126.94,lat:37.51,lines:['1호선','9호선']}],{
    normalizeName:x=>x,normalizeLine:x=>x,placements:()=>[
      {line:'1호선',lng:126.9401,lat:37.51},{line:'9호선',lng:126.9399,lat:37.51}
    ],colors,radiusPredicate:()=>true,isDistrict:()=>true
  });
  const overview=data.features.filter(x=>x.properties.role==='summary');
  const detail=data.features.filter(x=>x.properties.role==='detail');
  assert.equal(overview.length,2);
  assert.deepEqual(overview.map(x=>x.properties.iconOffset[0]).sort((a,b)=>a-b),[-34,34]);
  assert.equal(overview.filter(x=>x.properties.labelOn).length,1);
  assert.deepEqual(detail.map(x=>x.properties.label).sort(),['노량진역','노량진역']);
  assert.ok(detail.every(x=>Array.isArray(x.properties.labelOffset)));
});
test('7호선 안내선은 구 내부에서 페이드로 흐려지지 않도록 고정 불투명도 유지',()=>{
  const source=readFileSync(new URL('../src/fixed-rail-lines.js',import.meta.url),'utf8');
  assert.match(source,/code!=='신림' && code!=='7'/);
  assert.equal(railOpacityAtDistance(0),0.97);
});
test('버스정류장 라벨은 골목 상세 확대에서 이름을 우선 표시한다',()=>{
  const source=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(source,/transport-bus-names',type:'symbol',source:'transport-bus',minzoom:17\.75/);
  assert.match(source,/'text-allow-overlap':false/);
  assert.match(source,/정류장명 미등록/);
});
test('모바일 검색창은 독립된 흰색 외곽 패널을 가지며 축척은 하단 안내카드 위로 이동',()=>{
  const css=readFileSync(new URL('../src/layout-core.css',import.meta.url),'utf8');
  assert.match(css,/grid-template-areas:'brand search tools'/);
  assert.match(css,/top:auto!important/);
  assert.match(readFileSync(new URL('../src/map-scale-docking.js',import.meta.url),'utf8'),/maplibregl-ctrl-bottom-left/);
});
test('엘리베이터·에스컬레이터·계단 마커는 아이콘 이미지 누락 시에도 텍스트 기호를 표시',()=>{
  const source=readFileSync(new URL('../src/station-accessibility.js',import.meta.url),'utf8');
  assert.match(source,/registerAccessibilityPictogram\(type\)/);
  assert.match(source,/icon-image':`dj-access-/);
});
