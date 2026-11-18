import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placeData} from '../src/place-details.js';
const read = (name) => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('노들섬은 공식 확인된 주소와 연락처를 기다림 없이 사용하고 그 외 미확인 주소는 추측하지 않는다',()=>{
  const nod=placeData({name:'노들섬',lng:126.96,lat:37.51,type:'문화공간'});
  assert.equal(nod.address,'서울특별시 용산구 양녕로 445');
  assert.equal(nod.phone,'02-749-4500');
  assert.equal(nod.website,'https://nodeul.org/');
  const unknown=placeData({name:'확인되지 않은 시설',lng:126.95,lat:37.5,address:'동작구 근처 어딘가'});
  assert.equal(unknown.address,'');
  const foreign=placeData({name:'확인되지 않은 다른 시설',lng:126.95,lat:37.5,address:'서울특별시 용산구 양녕로 445'});
  assert.equal(foreign.address,'서울특별시 용산구 양녕로 445');
});

test('저장된 안전정보가 없으면 빈 안내창은 다시 열지 않고 지도 옵션에서 행정동을 조회할 수 있다',()=>{
  const main=read('src/main.js'),html=read('index.html');
  assert.match(main,/function hasSafetyOverviewContent\(\)\{return points\.length>0;\}/);
  assert.match(main,/showOverviewOnlyWithContent\(\)/);
  assert.match(main,/!hasSafetyOverviewContent\(\) \|\| \(initialMapEntry/);
  assert.match(html,/id="open-admin-dongs-from-options"/);
  assert.match(main,/getElementById\('open-admin-dongs-from-options'\)/);
});

test('시설 상세 레이아웃은 주소·연락처 두 열 정렬이고 지도 출처는 지도 옵션에서 확인하고 우하단 독립 아이콘은 없앤다',()=>{
  assert.match(read('src/v718-facts-empty.css'),/grid-template-columns:minmax\(64px,75px\) minmax\(0,1fr\)/);
  assert.match(read('src/main.js'),/attributionControl:false/);
  assert.doesNotMatch(read('src/main.js'),/new maplibregl\.AttributionControl/);
  assert.match(read('index.html'),/dj-map-attribution-details/);
  assert.match(read('src/main.js'),/import '\.\/v718-facts-empty\.css'/);
});
