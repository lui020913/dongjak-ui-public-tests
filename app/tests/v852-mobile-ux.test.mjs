import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {responsiveMapPixelRatio} from '../src/map-scale-docking.js';
import {APPROVED_WALK_INTEGRATION_MAIN_SHA256} from './support/approved-walk-integration.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('mobile map guide keeps its heading and close control fixed and hides scrollbars',()=>{
  const css=read('src/v852-mobile-ux.css');
  assert.match(css,/map-gesture-guide:not\(\[hidden\]\)[\s\S]*?overflow-y:auto/);
  assert.match(css,/map-gesture-guide \.map-gesture-guide-head[\s\S]*?position:sticky/);
  assert.match(css,/map-gesture-guide::-webkit-scrollbar\s*\{\s*display:none/);
  assert.match(css,/dj852-tip-toggle/);
  assert.match(css,/\#version-history-modal,\#route-map-card,\#map-gesture-guide/);
  const sheetMotion=css.slice(css.indexOf('Every mobile sheet rises'),css.indexOf('@media(prefers-reduced-motion:reduce)'));
  assert.match(sheetMotion,/#map-gesture-guide[\s\S]*?animation:dj852-sheet-rise/);
  assert.match(css,/prefers-reduced-motion:reduce[\s\S]*?\#map-gesture-guide/);
});

test('map TIP remains visible between cycles, fades only its message, and opens the gesture guide',()=>{
  const js=read('src/v840-coordinated-ui.js');
  assert.match(js,/label\.addEventListener\('click',openGuideFromTip\)/);
  assert.match(js,/const advanceTip=/);
  assert.match(js,/advanceTip\(\);\s*sync\(\)/);
  assert.match(js,/tipText\.classList\.add\('dj852-tip-copy-fade'\)/);
  assert.doesNotMatch(js,/tipHideTimer|showBriefTip/);
  const advance=js.slice(js.indexOf('const advanceTip='),js.indexOf('const sync=',js.indexOf('const advanceTip=')));
  assert.doesNotMatch(advance,/label\.classList\.remove\('is-visible'\)/,'the TIP pill itself must not blink');
  const css=read('src/v852-mobile-ux.css');
  assert.match(css,/dj840-map-tip\.is-visible:not\(\[hidden\]\)/);
  assert.match(css,/right:max\(12px,env\(safe-area-inset-right/);
  assert.match(css,/span\.dj852-tip-copy-fade \{opacity:0!important/);
});

test('map scale is not suppressed by the map TIP and uses a pill surface',()=>{
  const scale=read('src/map-scale-docking.js');
  assert.doesNotMatch(scale,/MOBILE_SCALE_BLOCKERS[\s\S]{0,160}#dj840-map-tip/);
  const css=read('src/v852-mobile-ux.css');
  assert.match(css,/maplibregl-ctrl-scale[\s\S]*?border-radius:999px/);
});

test('shortcut toolbar only animates after a hidden-to-visible transition',()=>{
  const js=read('src/v852-mobile-ux.js');
  assert.match(js,/previous===false&&current/);
  assert.match(js,/data-search-open/);
  assert.match(js,/setProperty\('opacity','0','important'\)/);
  assert.match(js,/setProperty\('opacity','1','important'\)/);
});

test('More panel slides down and cancels stale dismiss timers on reopen',()=>{
  const chrome=read('src/mobile-chrome-v790.js');
  const hideMore=chrome.slice(chrome.indexOf('function hideMore('),chrome.indexOf('function extractTemperature'));
  assert.match(hideMore,/const token=\+\+moreCloseToken/);
  assert.match(hideMore,/win\.clearTimeout\(moreCloseTimer\)/);
  assert.match(hideMore,/target\.setAttribute\('aria-hidden','true'\)/);
  assert.match(hideMore,/target\.classList\.add\('dj870-more-leaving'\)/);
  assert.match(hideMore,/if\(token!==moreCloseToken\|\|target!==panel\)return/);
  assert.match(hideMore,/},260\)/);
  assert.match(chrome,/event\.preventDefault\(\);event\.stopPropagation\(\);hideMore\(\)/);
  assert.match(read('src/v870-mobile-ui.css'),/dj870-more-leaving/);
});

test('all primary sheets, transit and detail sheets use a dedicated top-edge swipe handle',()=>{
  const js=read('src/dj-v8212-sheet-controller.js');
  for(const selector of ['.dj836-edge-drag','.dj856-transport-edge-drag','.dj856-detail-edge-drag','.entry-head']){
    assert.ok(js.includes(selector),`missing swipe handle ${selector}`);
  }
  const css=read('src/v852-mobile-ux.css');
  assert.match(js,/panel\.querySelectorAll\(handles\)/);
  assert.match(js,/surface\.setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(js,/event\.target\.closest\?\.\(headerSelector\?/);
  assert.match(js,/bindHeaderDragInput\(panel,win,/);
  assert.match(css,/\.dj-sheet-swipe-zone\s*\{\s*touch-action:pan-x/);
});

test('my-info typography enters with a nonblocking fade and retains existing account nodes',()=>{
  const js=read('src/v834-my-info.js');
  assert.match(js,/function showDetail\(view\)/);
  assert.match(js,/landing\.hidden=true/);
  assert.match(js,/detail\.hidden=false/);
  assert.match(js,/enter\(detail\)/);
  assert.match(js,/content\.append\(accountBox,typography,records\)/);
  assert.doesNotMatch(js,/await animation\.finished/);
  assert.doesNotMatch(js,/지도 &amp; 이동/);
});

test('all controls suppress iOS press highlight and use a transition instead of a green hold state',()=>{
  const css=read('src/v852-mobile-ux.css');
  assert.match(css,/:is\(button,a,\[role=\"button\"\],summary,\.nav-tab\)/);
  assert.match(css,/transition:background-color[\s\S]*?transform \.17s ease/);
  assert.doesNotMatch(css,/filter:brightness\(\.975\)/);
});

test('mobile map pixel ratio is applied on resize and its listener is removed correctly',()=>{
  const source=read('src/map-scale-docking.js');
  assert.match(source,/map\.setPixelRatio\(target\)/);
  assert.match(source,/const onViewportResize=\(\)=>\{syncPixelRatio\(\);schedule\(\);\}/);
  assert.match(source,/window\.removeEventListener\('resize',onViewportResize\)/);
  assert.doesNotMatch(source,/removeEventListener\('resize',schedule\)/);
});

test('profile back navigation cannot remain locked by suspended iOS animations',()=>{
  const source=read('src/v834-my-info.js');
  assert.match(source,/function back\(\)/);
  assert.match(source,/detail\.hidden=true;\s*landing\.hidden=false/);
  assert.match(source,/enter\(landing\)/);
  assert.match(source,/reducedMotion\(\)/);
  assert.doesNotMatch(source,/if\(transitioning\)return/);
  assert.doesNotMatch(source,/await fadeOpacity/);
  assert.doesNotMatch(source,/지도 &amp; 이동/);
});

test('map tab icon and label keep fixed geometry in the selected state',()=>{
  const css=read('src/v852-mobile-ux.css');
  assert.match(css,/nav-tab\.active[\s\S]*?grid-template-rows:34px 18px/);
  assert.match(css,/nav-tab\[data-tab="map"\][\s\S]*?transform:none/);
});

test('only coarse-pointer phones receive the slightly higher MapLibre pixel ratio',()=>{
  assert.equal(responsiveMapPixelRatio({width:390,coarse:true,deviceRatio:3}),1.75);
  assert.equal(responsiveMapPixelRatio({width:390,coarse:true,deviceRatio:1.5}),1.5);
  assert.equal(responsiveMapPixelRatio({width:1440,coarse:false,deviceRatio:3}),1.5);
  assert.equal(responsiveMapPixelRatio({width:390,coarse:false,deviceRatio:3}),1.5);
});

historicalSnapshotTest('PC-protected map initialization remains byte-identical',()=>{
  const protectedBaseline=JSON.parse(read('PC_MAP_PROTECTED_SHA256.json'));
  const actual=createHash('sha256').update(read('src/main.js')).digest('hex');
  assert.equal(actual,APPROVED_WALK_INTEGRATION_MAIN_SHA256);
  assert.notEqual(actual,protectedBaseline['src/main.js']);
});
