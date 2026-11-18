import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canNavigateToMetroNeighbor,metroTransferBadgeLines} from '../src/transport-map.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/mobile-first-layout.css');

test('PC-only workspaces and tool rails are not loaded; all widths use the same bottom dock',()=>{
 const main=read('src/main.js'),html=read('index.html');
 for(const old of ['v725-layout-state.css','v726-desktop-polish.css','v729-pc-consistency.css','v881-tablet-workspace.css','v881-tablet-header-unified.css','v881-tablet-tool-rail.js'])assert.equal(main.includes(old),false,old);
 for(const old of ['v729-r1-responsive-ui.css','v729-r2-new-ui.css','v809-precision-polish.css','v815-pc-visual-fixes.css','v853-pc-responsive-fixes.css'])assert.equal(html.includes(old),false,old);
 assert.equal(main.includes('installDesktopSafetyRail('),false);
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
 assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
});

test('map controls and search chrome use shared floating positions',()=>{
 assert.ok(css.includes('.map-actions'));
 assert.ok(css.includes('right: var(--mf-gutter) !important'));
 assert.ok(css.includes('.topbar'));
 assert.ok(css.includes('#dj-v794-toolbar'));
 assert.ok(css.includes('top: var(--mf-toolbar-top) !important'));
 assert.ok(css.includes('.maplibregl-ctrl-bottom-left'));
});

test('search suggestions sit below the header and the feature rail remains horizontally scrollable',()=>{
 assert.ok(css.includes('.map-quick-search-dropdown'));
 assert.ok(css.includes('overflow-x: auto !important'));
 assert.ok(css.includes('scroll-snap-type: x proximity !important'));
 assert.ok(css.includes('.dj831-edge-blur'));
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

test('transfer station keeps distinct line badges and 7호선 highlight semantics',()=>{
 assert.deepEqual(metroTransferBadgeLines('보라매',['7호선']),['7호선','신림선']);
 assert.deepEqual(metroTransferBadgeLines('이수',['7호선']),['7호선','4호선']);
 assert.deepEqual(metroTransferBadgeLines('노량진',['9호선']),['9호선','1호선']);
 assert.match(read('src/transport-map.js'),/makeLineBadge\(line,'metro-panel-badge'\)/);
 assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
});
