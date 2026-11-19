import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metroMarkerVisibleAtZoom,METRO_PLATFORM_SPLIT_ZOOM} from '../src/transport-map.js';
const client=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('확대·축소 시 MapLibre 지리 좌표 레이어를 사용한다',()=>{
  assert.equal(METRO_PLATFORM_SPLIT_ZOOM,15.55);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,10.8),false);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,10.1),false);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,12),false);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,14),true);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,18),false);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,12),false);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,15.55),true);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,18),true);
  assert.match(client,/metroMarkerGeojson\(items/);
  assert.match(client,/map.addSource\(stationSource,\{type:'geojson'/);
  assert.doesNotMatch(client,/new maplibregl.Marker\(\{element:markerEl/);
});
test('환승역은 확대하면 각 호선 좌표의 아이콘으로 클릭된다',()=>{
  assert.match(client,/dj-metro-detail-icon/);
  assert.match(client,/dj-metro-summary-icon/);
  assert.match(client,/place.lines=\[p.line\]/);
  assert.match(client,/place.selectedLine=p.line/);
  assert.match(client,/if\(p.role==='summary'\)/);
  assert.match(client,/icon-offset':\['get','iconOffset'\]/);
});
test('PC·태블릿·모바일 패널을 서로 다른 레이아웃으로 표시',()=>{
  for(const breakpoint of ['min-width:1100px','min-width:768px','max-width:767px']){
    assert.ok(css.includes(breakpoint),`${breakpoint} media query is required`);
  }
  assert.match(css,/left:50%!important;right:auto!important;transform:translateX\(-50%\)!important/);
  assert.match(css,/#news-panel\.page-panel\{/);
  assert.match(css,/\.page-panel, #news-panel\.page-panel\{/);
  assert.match(css,/height:min\(72dvh,calc\(100dvh - 142px/);
});
