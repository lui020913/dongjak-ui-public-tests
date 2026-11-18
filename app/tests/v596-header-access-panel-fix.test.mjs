import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizePedestrianAccess} from '../src/pedestrian-tools.js';
const code=readFileSync(new URL('../src/pedestrian-tools.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/layout-core.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const point=(lng,lat,props)=>({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:props});

test('교통약자 시설 집계는 등록된 실제 좌표만 사용하며 인접 중복을 제거한다',()=>{
  const osm=[point(126.95000,37.50000,{kind:'lift',name:'승강기'}),
    point(126.95000,37.50000,{kind:'lift',name:'중복 승강기'}),
    point(126.95032,37.5001,{kind:'steps',name:'계단'}),
    point(126.95067,37.50014,{kind:'kerb',name:'연석'})];
  const metro=[point(126.95000,37.50000,{type:'elevator',station:'시험역'}),
    point(126.94920,37.50014,{type:'exit',station:'시험역',number:'1'})];
  const got=summarizePedestrianAccess(osm,metro);
  assert.deepEqual([got.elevators,got.exits,got.barriers,got.total],[1,1,2,4]);
  assert.equal(got.locations.length,4);
  assert.deepEqual(summarizePedestrianAccess(),{elevators:0,exits:0,barriers:0,total:0,locations:[]});
});

test('교통약자 화면은 원천 API 응답 전에 요약 카드와 확대 및 재조회 버튼을 표시한다',()=>{
  assert.match(code,/renderAccessSummary\('loading'\)/);
  assert.match(code,/ped-access-stat-grid/);
  assert.match(code,/현재 지도 확대/);
  assert.match(code,/시설정보 다시 조회/);
  assert.match(code,/현재 확인된 등록 시설이 없습니다/);
  assert.match(code,/공개지도 서버 연결 실패/);
});

test('헤더 최종 스타일은 기존 CSS 뒤에 로드되고 모바일 검색 하단 여백이 확보된다',()=>{
  assert.match(main,/dongjak-v597-header-access\.css';\s*import '\.\/map-patch\/dj-v5911-place-polish\.css';\s*import '\.\/layout-core\.css';/);
  assert.match(css,/grid-template-areas:'brand search tools'/);
  assert.match(css,/--dj-header-h:calc\(64px \+ env\(safe-area-inset-top\)\)/);
  assert.match(css,/height:40px!important;min-height:40px!important/);
  assert.doesNotMatch(css,/#map\s*\{\s*position:\s*relative/);
});
