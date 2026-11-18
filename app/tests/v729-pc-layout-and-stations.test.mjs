import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canNavigateToMetroNeighbor,metroTransferBadgeLines} from '../src/transport-map.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/v729-pc-consistency.css');

test('v729 is desktop-only and all main panel starts share one measured rail top',()=>{
  const main=read('src/main.js');
  assert.match(main,/v728-exclusive-responsive\.css';\s*import '\.\/v729-pc-consistency\.css'/);
  assert.match(css,/@media\(min-width:1080px\)/);
  for(const selector of ['#route-panel.page-panel','#news-panel.page-panel','#mine-panel.page-panel','#transport-sheet',
    '#map-advanced-controls','#map-safety-controls','#road-width-legend','#overview-sheet'])
    assert.ok(css.includes(selector),selector);
  assert.match(css,/top:var\(--dj-v729-rail-top\)!important/);
});

test('PC right action column and scale stay visible regardless of tab or panel',()=>{
  assert.match(css,/#app\[data-tab\]:not\(\[data-tab="unused"\]\) \.map-actions/);
  assert.match(css,/z-index:4100!important/);
  assert.match(css,/top:10px!important;right:12px!important/);
  assert.match(css,/\.maplibregl-ctrl-bottom-left \.maplibregl-ctrl-scale/);
});

test('search dropdown leaves the navigation stationary and preserves the wider submit',()=>{
  const rail=read('src/v713-desktop-rail.js');
  assert.match(rail,/const push=0;/);
  assert.match(rail,/--dj-v725-search-rail-push/);
  assert.match(css,/transition:top \.34s/);
  assert.match(css,/width:120px!important;min-width:120px!important/);
});

test('neighbor station cannot navigate outside Dongjak except near-boundary allowance',()=>{
  const target={name:'외부',lng:126.95,lat:37.5};
  assert.equal(canNavigateToMetroNeighbor(target,()=>true,()=>false),true);
  assert.equal(canNavigateToMetroNeighbor(target,()=>false,()=>true),true);
  assert.equal(canNavigateToMetroNeighbor(target,()=>false,()=>false),false);
  assert.equal(canNavigateToMetroNeighbor(target,()=>null,()=>false),false);
  assert.equal(canNavigateToMetroNeighbor({lng:NaN,lat:37.5},()=>true,()=>true),false);
  const transport=read('src/transport-map.js');
  assert.match(transport,/if\(!canNavigateToMetroNeighbor\(destination,isDongjak,isNearBoundary\)\)/);
  assert.match(transport,/동작구 밖의 지역입니다/);
});

test('transfer station keeps its distinct line badges and selection outline',()=>{
  assert.deepEqual(metroTransferBadgeLines('보라매',['7호선']),['7호선','신림선']);
  assert.deepEqual(metroTransferBadgeLines('이수',['7호선']),['7호선','4호선']);
  assert.deepEqual(metroTransferBadgeLines('노량진',['9호선']),['9호선','1호선']);
  assert.match(read('src/transport-map.js'),/makeLineBadge\(line,'metro-panel-badge'\)/);
  assert.match(css,/\.dj-active-transfer-line/);
});

test('manual theme switch blurs the whole PC viewport; history intro removed',()=>{
  assert.match(css,/#app \.dj-theme-switch-flash:not\(\[hidden\]\)/);
  assert.match(css,/inset:0!important/);
  assert.match(css,/backdrop-filter:blur\(5px\)/);
  const src=read('src/version-history-v7.js');
  assert.doesNotMatch(src,/버전별 개발 기록/);
  assert.doesNotMatch(src,/최신 버전부터 시간순으로 모든 변경사항을/);
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
});
