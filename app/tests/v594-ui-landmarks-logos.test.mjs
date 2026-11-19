import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {metroMarkerGeojson} from '../src/metro-marker-geodata.js';
import {NEARBY_PLACE_LABELS} from '../src/nearby-place-labels.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('모바일/PC 검색창은 브랜드와 같은 줄이고 데스크톱 헤더는 고정 높이',()=>{
  const css=read('src/layout-core.css');
  assert.match(css,/grid-template-areas:'brand search tools'/);
  assert.match(css,/--dj-header-h:calc\(64px \+ env\(safe-area-inset-top\)\)/);
  assert.match(css,/--dj-header-h:68px/);
  assert.match(css,/#app\[data-theme='dark'\] \.topbar/);
  assert.match(read('src/map-patch/dongjak-v594-layout-theme.css'),/#app\[data-theme=\"dark\"\] \.version-history-dialog/);
});
test('확대한 환승역의 두 호선 모두 역명을 가져야 한다',()=>{
  const data=metroMarkerGeojson([{kind:'subway',name:'노량진',lng:126.94,lat:37.51,lines:['1호선','9호선']}],{
    normalizeName:x=>x,normalizeLine:x=>x,colors:{'1호선':'#0052A4','9호선':'#B89B2F'},
    placements:()=>[{line:'1호선',lng:126.9400,lat:37.5100},{line:'9호선',lng:126.9405,lat:37.5100}],
    radiusPredicate:()=>true,isDistrict:()=>true
  });
  assert.equal(data.features.filter(f=>f.properties.role==='summary'&&f.properties.labelOn).length,1);
  const detail=data.features.filter(f=>f.properties.role==='detail');
  assert.deepEqual(detail.map(f=>f.properties.labelOn),[true,true]);
  assert.deepEqual(detail.map(f=>f.properties.label),['노량진역','노량진역']);
  const css=read('src/transport-map.js');
  assert.match(css,/dj-metro-detail-name-very-close/);
  assert.match(css,/isSummary\?13\.7:15\.72/);
});
test('여의도·노들섬 주변 지명 오버레이를 표시한다',()=>{
  assert.deepEqual(NEARBY_PLACE_LABELS.map(p=>p.name),['여의도','노들섬']);
  assert.ok(NEARBY_PLACE_LABELS.every(p=>p.lng>126&&p.lng<127&&p.lat>37&&p.lat<38));
  assert.match(read('src/main.js'),/installNearbyPlaceLabels\(map(?:,\{maplibregl\})?\)/);
});
test('사용자 제공 중앙대학교·숭실대학교 로고 파일을 참조한다',()=>{
  assert.ok(existsSync(new URL('../public/logos/chungang.png',import.meta.url)));
  assert.ok(existsSync(new URL('../public/logos/soongsil.png',import.meta.url)));
  const text=read('src/education-layer.js');
  assert.match(text,/university-name-only/);
  assert.doesNotMatch(text,/img\.src=universityLogo/);
});
