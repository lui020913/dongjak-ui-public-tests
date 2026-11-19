import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_MAP_SEARCH_TERMS,mergeMapSearchResults} from '../src/map-quick-search.js';
import {filterDistrictAccessibility,parseVisibleOSMEntranceFeatures} from '../src/station-accessibility.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
test('지도 상단 검색창과 추천 목록이 존재하며 중복 좌표를 제외한다',()=>{
  assert.match(html,/id="map-quick-search"/);
  assert.ok(DEFAULT_MAP_SEARCH_TERMS.includes('노량진역'));
  const a={name:'상도',lat:37.5,lng:126.9};
  assert.equal(mergeMapSearchResults([a],[a]).length,1);
  assert.equal(mergeMapSearchResults([a],[]).length,1);
});
test('출구는 공개 좌표로 유지하고 교통약자 시설은 동작구 내부로 필터링한다',()=>{
  const entry={type:'Feature',geometry:{type:'Point',coordinates:[126.96,37.50]},properties:{type:'exit'}};
  const liftInside={type:'Feature',geometry:{type:'Point',coordinates:[126.96,37.50]},properties:{type:'elevator'}};
  const liftOutside={type:'Feature',geometry:{type:'Point',coordinates:[127.02,37.57]},properties:{type:'elevator'}};
  const filtered=filterDistrictAccessibility([entry,liftInside,liftOutside],(x,y)=>x<127&&y<37.52);
  assert.deepEqual(filtered,[entry,liftInside]);
});
test('빈 지도 클릭 시 시트 접기 및 옵션 닫기, 자동 버전 배너 미사용',()=>{
  assert.match(code,/applyOverviewSheetState\('collapsed'\)/);
  assert.match(code,/closeTransportPanel\(true\)/);
  assert.doesNotMatch(code,/initSiteUpdateMonitor\(\)/);
  assert.doesNotMatch(html,/id="site-update-banner"/);
  assert.match(css,/map-quick-search-dropdown/);
});
test('밝은 테마 건물은 회녹색, 시설 심볼은 캔버스 도형 사용',()=>{
  const building=readFileSync(new URL('../src/map-appearance.js',import.meta.url),'utf8');
  const facility=readFileSync(new URL('../src/station-accessibility.js',import.meta.url),'utf8');
  assert.match(building,/#c4d1d0/);
  assert.match(facility,/registerAccessibilityPictogram/);
});

test('공개 지도에서 출입구로 명시된 OSM 포인트만 보완하고 좌표는 생성하지 않는다',()=>{
  const input=[
    {geometry:{type:'Point',coordinates:[126.95,37.51]},properties:{subclass:'subway_entrance',ref:'2'}},
    {geometry:{type:'Point',coordinates:[126.95,37.51]},properties:{subclass:'subway_entrance',ref:'2'}},
    {geometry:{type:'Point',coordinates:[126.96,37.5]},properties:{subclass:'restaurant'}}
  ];
  const result=parseVisibleOSMEntranceFeatures(input);
  assert.equal(result.length,1);
  assert.equal(result[0].properties.number,'2');
  assert.equal(result[0].properties.type,'exit');
});
