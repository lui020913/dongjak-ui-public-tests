import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {districtExteriorThemePaint} from '../src/ui-environment.js';
import {subwayStationQueryCandidates} from '../src/transport-map.js';

test('동작구 외부 음영이 다크모드에서 어두운 색으로 바뀐다', () => {
  assert.deepEqual(districtExteriorThemePaint('light'), {
    'fill-color':'#d8e0e3', 'fill-opacity':0.65
  });
  assert.deepEqual(districtExteriorThemePaint('dark'), {
    'fill-color':'#22272d', 'fill-opacity':0.34
  });
});

test('상도역과 숭실대입구역은 기본 역명 조회 뒤 부역명 표기를 재시도한다', () => {
  assert.deepEqual(subwayStationQueryCandidates('상도역'), [
    '상도','상도(LG전자사거리)','상도(중앙대앞)','상도역'
  ]);
  assert.deepEqual(subwayStationQueryCandidates('숭실대입구역'), [
    '숭실대입구','숭실대입구(살피재)','숭실대입구역'
  ]);
  assert.deepEqual(subwayStationQueryCandidates('노량진역'), ['노량진']);
});

test('테마 전환 시 외부 음영 레이어를 갱신하며 경계 로딩 시 현재 테마를 적용한다',async()=>{
  const [theme,main]=await Promise.all([
    readFile(new URL('../src/ui-environment.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(theme,/getLayer\('district-exterior-fade'\)/);
  assert.match(theme,/districtExteriorThemePaint\(themeState\.value\)/);
  assert.match(main,/paint:\{\.\.\.districtExteriorThemePaint\(visualTheme\.currentTheme\(\)\)/);
  assert.match(main,/djTransitExterior==='true'\?\{'fill-opacity':0\}/);
  assert.match(main,/visualTheme\.refresh\(\)/);
});

test('7호선 역명 재시도는 실시간 응답이 비었을 때만 수행하고 새로고침 캐시를 우회한다',async()=>{
  const src=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(src,/if\(isBus \|\| result\.items\.length\)/);
  assert.match(src,/requestArrival\(place,\{forceRefresh:refresh&&!sameStationLineChange\}\)/);
  assert.match(src,/const rank=\{ 'status-only':5,'expired':4,'stale':3,'unverified':2,'empty':1 \}/);
  assert.match(src,/if\(!firstEmpty \|\| \(rank\[result\.sourceStatus\]\|\|0\)>/);
});
