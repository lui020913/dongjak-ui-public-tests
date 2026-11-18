import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatMetroArrivalCard} from '../src/metro-arrival-display.js';

const CSS=readFileSync(new URL('../src/map-patch/dongjak-v55-mobile-fix.css',import.meta.url),'utf8');
const CORE=readFileSync(new URL('../src/layout-core.css',import.meta.url),'utf8');
const MAIN=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const TRANSPORT=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');

test('실시간 지하철의 도착시각이 종착역과 겹치지 않도록 정규화한다',()=>{
 const v=formatMetroArrivalCard({direction:'상행 · 중앙보훈병원4분 후 (샛강) - 흑석방면 · 일반',directionType:'상행',destination:'중앙보훈병원',message:'중앙보훈병원4분 후 (샛강)'});
 assert.equal(v.heading,'중앙보훈병원행');
 assert.equal(v.details,'흑석방면 · 일반');
 assert.equal(v.arrival,'4분 후 (샛강)');
 assert.ok(!v.heading.includes('4분'));
 assert.deepEqual(formatMetroArrivalCard({direction:'하행 · 개화방면',message:'전역 출발'}),{
   heading:'개화행',details:'',arrival:'전역 출발'
 });
});

test('모바일 실시간 도착 카드는 좁은 화면에서 단일 열 및 세부 정보 영역 사용',()=>{
 assert.match(CSS,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(CSS,/metro-arrival-direction-group/);
 assert.match(TRANSPORT,/formatMetroArrivalCard\(row\)/);
});

test('접힌 모바일 안내판은 고정 높이이며 조작버튼과 축척이 안내판을 덮지 않음',()=>{
 assert.match(CORE,/\[data-sheet-state='collapsed'\]/);
 assert.match(CORE,/height:76px!important/);
 assert.match(MAIN,/nextState === 'collapsed' \? 'collapsed' : 'expanded'/);
 assert.match(readFileSync(new URL('../src/map-scale-docking.js',import.meta.url),'utf8'),/maplibregl-ctrl-bottom-left/);
 assert.match(MAIN,/app\.dataset\.overviewSheetState\s*=\s*validState/);
});

test('모바일 검색 및 날씨 영역은 상세 패널 위로 지속 노출',()=>{
 assert.match(CSS,/\.topbar .header-tools .weather-widget/);
 assert.match(CSS,/#transport-sheet\.transport-sheet:not\(\[hidden\]\)/);
 assert.match(CSS,/--dj-mobile-nav-height/);
});
