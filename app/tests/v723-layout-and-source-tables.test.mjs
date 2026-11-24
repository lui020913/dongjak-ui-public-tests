import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v7.0.29 PC dock persists on all tabs and includes road-width control',()=>{
  const src=read('src/v713-desktop-rail.js');
  assert.match(src,/const enabled=desktopActive\(\);/);
  for(const id of ['map-tools-toggle','night-visibility-quick-off','map-safety-toggle','toggle-road-width'])assert.ok(src.includes(id));
  const style=read('src/mobile-ui-baseline.css');
  assert.match(style,/\[data-tab\]:not\(\[data-tab="map"\]\) #dj-desktop-safety-rail/);
});

test('v7.0.29 right map actions remain fixed while transport sheet is left docked on PC',()=>{
  const src=read('src/mobile-ui-baseline.css');
  assert.match(src,/transport-sheet:not\(\[hidden\]\).*\{/);
  assert.match(src,/right:14px!important/);
  assert.match(src,/left:calc\(var\(--dj-nav-width/);
});

test('v7.0.29 official timetable data is presented as HTML tables without invented arrivals',()=>{
  const src=read('src/transport-map.js');
  assert.match(src,/dj-v723-timetable-table/);
  assert.match(src,/서울시 정류소별 노선 첫차·막차 예정시간/);
  assert.match(src,/실시간 도착시간이 아니며/);
  assert.match(src,/rows\.filter/);
});

test('v7.0.29 facility popup retains direct contact information without external search',()=>{
  const src=read('src/place-details.js');
  assert.doesNotMatch(src,/map\.naver\.com\/p\/search/);
  assert.doesNotMatch(src,/지도에서 시설 주소·연락처 검색/);
  assert.match(src,/row\(meta,'도로명 주소'/);
  assert.match(src,/row\(meta,'전화번호'/);
});

test('v7.0.29 mobile safety/transport/option sheet cannot hide nav or trap close button',()=>{
  const src=read('src/mobile-ui-baseline.css');
  assert.match(src,/#app\[data-tab="map"\] #bottom-nav\{display:flex!important/);
  assert.match(src,/#map-options-mobile-close\{position:static!important/);
  assert.match(src,/#version-history-mobile-trigger\{display:block!important/);
  assert.match(src,/#app #transport-sheet:not\(\[hidden\]\)/);
});

test('v7.0.29 metadata is consistent and CSS appended last',()=>{
  const html=read('index.html'),main=read('src/main.js'),packageJson=JSON.parse(read('package.json'));
  assert.equal(packageJson.version,APP_VERSION);
   assert.match(html,/id="version-history-trigger"[^>]*>업데이트<\/button>/);
  assert.match(main,/mobile-ui-baseline\.css/);
  assert.match(read('src/version-history.js'),/version:'v7\.0\.29'/);
});

import {verifiedPlaceRecord} from "../src/verified-place-directory.js";
test("구립김영삼도서관 주소는 공개 기관 시설 기록으로 확인된 값만 제공한다",()=>{
  const place=verifiedPlaceRecord("구립김영삼도서관");
  assert.equal(place?.address,"서울특별시 동작구 매봉로 1");
  assert.equal(place?.phone,undefined);
});
