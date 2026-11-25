import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CLOSE_BUTTON_SELECTORS,SAFETY_GROUP_IDS,makeCloseGlyph} from '../src/v817-dialog-search-safety.js';
import {LATEST_V803_UI_PATCH} from '../src/version-history.js';
import {searchLocalPlaces} from '../src/route-search.js';
import {VERIFIED_STATIONS} from '../src/fixed-rail-data.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v817: close controls share one SVG X instead of overlapping CSS crosses',()=>{
  const nodes=[];
  const fakeDoc={createElementNS(ns,tag){const obj={namespaceURI:ns,tagName:tag,attrs:{},children:[],
    classList:{add(x){obj.className=x}},setAttribute(k,v){obj.attrs[k]=v},append(x){obj.children.push(x)}};
    nodes.push(obj);return obj;}};
  const svg=makeCloseGlyph(fakeDoc);
  assert.equal(svg.tagName,'svg');
  assert.equal(svg.children[0].attrs.d,'M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5');
  const css=read('src/v817-dialog-search-safety.css');
  assert.match(css,/\.dj817-close-button::before/);
  assert.match(css,/\.dj817-close-button::after/);
  assert.match(css,/content:none!important/);
  for(const s of ['#version-history-close','#road-width-legend-close','#map-quick-search-close'])assert.ok(CLOSE_BUTTON_SELECTORS.includes(s));
});

test('v817: PC safety menu is category rail and one right-side detail pane',()=>{
  const js=read('src/v817-dialog-search-safety.js'),css=read('src/v817-dialog-search-safety.css');
  assert.deepEqual(SAFETY_GROUP_IDS,['dj-safety-data','dj-safety-facilities','dj-safety-traffic','dj-safety-night','dj-safety-actions']);
  assert.match(css,/grid-template-columns:206px minmax\(0,1fr\)/);
  assert.match(css,/\[data-dj817-active-group="dj-safety-night"\]/);
  assert.match(js,/panel\.dataset\.dj817ActiveGroup=selected/);
  assert.match(read('src/safety-workbench-v7103.js'),/panel\.scrollTop=0;return/);
});

test('v817: map suggestions participate in the one-window owner',()=>{
  const html=read('index.html');const owner=read('src/v806-unified-ui.js');
  assert.match(html,/id="map-quick-search-dropdown"/);
  const surfaceList=owner.slice(owner.indexOf('const ids=['),owner.indexOf('const visible=id=>'));
  assert.match(surfaceList,/'map-quick-search-dropdown'(?=,|\])/);
  assert.match(surfaceList,/'dj854-weather-sheet','djNext-layer-panel'/);
  assert.match(owner,/dispatchLocalClick\(element\('map-quick-search-close'\),win\)/);
  assert.match(owner,/'open-admin-dongs':'admin-dong-picker'/);
  assert.match(owner,/pendingIntent='map-quick-search-dropdown'/);
});

test('v817: search submit and default suggestions use real search routine',()=>{
  const js=read('src/map-quick-search.js');
  assert.match(js,/searchButton\?\.addEventListener\('click'/);
  assert.match(js,/form\.addEventListener\('submit'/);
  assert.match(js,/void performSearch\(name\)/);
  assert.match(js,/localResults\(term\)/);
  assert.match(js,/VERIFIED_STATIONS/);
  assert.ok(VERIFIED_STATIONS.노량진);
  assert.ok(searchLocalPlaces('중앙대학교').some(x=>x.name==='중앙대학교'));
});

test('v817: latest hotfix notes are unique and inserted above preserved releases',()=>{
  const history=read('src/version-history.js');const catalog=read('src/version-history-v7.js');
  assert.equal(LATEST_V803_UI_PATCH.items.length,8);
  assert.equal(new Set(LATEST_V803_UI_PATCH.items).size,LATEST_V803_UI_PATCH.items.length);
  assert.equal(LATEST_V803_UI_PATCH.items.filter(item=>item.includes("스크롤 없는 대분류·소분류")).length,1);
  assert.match(history,/currentRelease:LATEST_APP_RELEASE/);
  assert.match(history,/LATEST_V803_UI_PATCH/);
  assert.match(history,/\.\.\.RENUMBERED_VERSION_HISTORY/);
  assert.match(catalog,/currentRelease\?\[currentRelease\]:\[\]/);
  assert.doesNotMatch(read('index.html'),/id="version-history-list"/);
});

test('v817: update footer clears the floating tab and duplicate source box is visually absent',()=>{
  const css=read('src/v817-dialog-search-safety.css');
  assert.match(css,/version-history-modal:not\(\[hidden\]\)/);
  assert.match(css,/var\(--dj800-panel-bottom,96px\)/);
  assert.match(css,/\.dj-map-attribution-details\{display:none!important/);
  assert.match(read('index.html'),/class="dj-map-attribution-details"/); // retain source for legacy integrity
  assert.ok(existsSync(new URL('../src/v817-dialog-search-safety.css',import.meta.url)));
});
