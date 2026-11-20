import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOBILE_FLOATING_SHEETS} from '../src/dj-v8212-sheet-controller.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Safety Map tab closes but never opens the administrative district picker',()=>{
  const controller=read('src/dj-v8212-sheet-controller.js');
  const toolbar=read('src/v831-swipe-feature-toolbar.js');
  assert.match(controller,/closeAdminOnMapTab/);
  assert.match(controller,/admin\.hidden=true/);
  assert.match(toolbar,/function isPrimary\(key\)\{return key==='map-dong'\|\|primary\.has\(key\);\}/);
  assert.match(toolbar,/featureMap\.get\('map-dong'\)/);
  assert.equal(MOBILE_FLOATING_SHEETS.some(([id])=>id==='admin-dong-picker'),true);
});

test('Mobile top toolbar removes the separate map-options button and uses sliders on More',()=>{
  const toolbar=read('src/mobile-toolbar-v794.js');
  const ux=read('src/v857-requested-ux.js');
  assert.doesNotMatch(toolbar,/\{id:'dj-v794-map'/);
  assert.match(toolbar,/button\('dj-v794-more'/);
  assert.match(ux,/data-dj857-sliders/);
  assert.match(ux,/dj-r2-history-shortcut/);
  assert.match(ux,/win\.MutationObserver\|\|globalThis\.MutationObserver/);
  assert.doesNotMatch(ux,/typeof Observer==='function'/);
});

test('More panel has a fixed header, SVG close control, scroll body and live actions',()=>{
  const chrome=read('src/mobile-chrome-v790.js');
  const features=read('src/v831-swipe-feature-toolbar.js');
  const css=read('src/v857-requested-ux.css');
  assert.match(chrome,/dj856-more-edge-drag/);
  assert.match(chrome,/dj-mobile-utilities-body/);
  assert.match(chrome,/<svg viewBox="0 0 24 24"/);
  assert.match(features,/panel\.querySelector\('\.dj-mobile-utilities-body'\)/);
  assert.match(chrome,/id="dj-mobile-history"/);
  assert.match(chrome,/id="dj-mobile-settings"/);
  assert.match(chrome,/version-history-trigger/);
  assert.match(chrome,/dj:open-map-settings/);
  assert.match(features,/dj800-type-trigger/);
  assert.match(css,/dj-mobile-utilities-body/);
  assert.match(css,/#version-history-modal:not\(\[hidden\]\)\{z-index:7200/);
  assert.match(css,/#dj800-type-panel:not\(\[hidden\]\)\{z-index:7300/);
});

test('Bottom-tab panels use a dedicated top-edge drag handle and rise animation',()=>{
  for(const id of ['route-panel','participation-panel','news-panel','mine-panel']){
    assert.ok(MOBILE_FLOATING_SHEETS.some(([panel,handle])=>panel===id&&handle==='.dj836-edge-drag'),id);
  }
  const css=read('src/v857-requested-ux.css');
  const controller=read('src/dj-v8212-sheet-controller.js');
  assert.match(css,/dj857-sheet-rise/);
  assert.match(css,/dj836-edge-drag/);
  assert.match(controller,/bindHeaderDragInput\(panel,win,/);
  assert.match(read('src/mobile-header-input.js'),/header\.addEventListener\('touchstart'/);
  assert.match(controller,/--dj-sheet-drag-y/);
});

test('Nodeulseom has an independent visible MapLibre label source and layer',()=>{
  const labels=read('src/nearby-place-labels.js');
  assert.match(labels,/dj-nodeulseom-detail-source/);
  assert.match(labels,/dj-nodeulseom-detail-pin/);
  assert.match(labels,/dj-nodeulseom-detail-name/);
  assert.match(labels,/text-allow-overlap':true/);
  assert.match(labels,/text-ignore-placement':true/);
  assert.match(labels,/style\.load/);
});

test('Guide panel uses a stable header, SVG close button and scrollable body',()=>{
  const html=read('index.html');
  const css=read('src/v857-requested-ux.css');
  assert.match(html,/dj856-guide-edge-drag/);
  assert.match(html,/id="map-gesture-guide-close"[^>]*><svg/);
  assert.match(html,/class="dj856-guide-body"/);
  assert.match(css,/dj856-guide-body/);
  assert.match(css,/map-gesture-guide-close svg/);
});

test('Search recommendations expand to the phone viewport and track the visual viewport',()=>{
  const js=read('src/v857-requested-ux.js');
  const css=read('src/v857-requested-ux.css');
  assert.match(js,/visualViewport/);
  assert.match(js,/dj857-search-max-height/);
  assert.match(css,/left:12px!important;right:12px!important/);
  assert.match(css,/position:fixed!important;top:var\(--dj857-search-top/);
});

test('Facility popup exposes route, favorite, share and close actions in a swipeable header',()=>{
  const details=read('src/place-details.js');
  const css=read('src/v857-requested-ux.css');
  assert.match(details,/dj-place-header-actions/);
  assert.match(details,/dj-place-route-actions/);
  assert.match(details,/dj854-place-favorite/);
  assert.match(details,/dj856-place-share/);
  assert.match(details,/dj-place-header-close/);
  assert.match(details,/bindHeaderDragInput\(header,window,/);
  assert.match(read('src/mobile-header-input.js'),/header\.addEventListener\('touchstart'/);
  assert.match(css,/dj-place-edge-drag/);
});

test('Transit header retains existing action nodes but presents favorite as an icon and centers bus arrivals',()=>{
  const transit=read('src/v8215-news-metro-compact-header.js');
  const css=read('src/v857-requested-ux.css');
  assert.match(transit,/dj856-transport-edge-drag/);
  assert.match(transit,/actionRow\.append\(start,end\)/);
  assert.match(css,/dj-news-transport-bookmark::before/);
  assert.match(css,/data-kind="bus".*transport-arrival-row/s);
  assert.match(css,/transport-neighbors.*backdrop-filter:none/s);
});

test('Profile save confirmation is a status notice, not a button-like toast',()=>{
  const profile=read('src/v824-favorites-cloud.js');
  const css=read('src/v857-requested-ux.css');
  assert.match(profile,/dj856-profile-status/);
  assert.match(profile,/표시 이름이 변경되었습니다/);
  assert.match(css,/dj856-profile-status/);
  assert.match(css,/dj840-profile-toast\{display:none/);
});

test('one shared mobile-first layout replaces separate desktop and tablet modes',()=>{
  const main=read('src/main.js');
  const html=read('index.html');
  const css=read('src/mobile-first-layout.css');
  const coordinator=read('src/mobile-ui-coordinator.js');
  const toolbar=read('src/mobile-toolbar-v794.js');
  assert.equal(main.includes('installDesktopSafetyRail('),false);
  assert.equal(main.includes('v881-tablet-'),false);
  assert.equal(main.includes('v913-pc-design-system'),false);
  assert.equal(main.includes('v912-desktop-poi'),false);
  assert.equal(html.includes('v862-pc-mobile-separation'),false);
  assert.equal(html.includes('v876-desktop-final'),false);
  assert.ok(toolbar.includes("matchMedia('(min-width: 0px)')"));
  assert.equal(coordinator.includes('window.innerWidth<=1079'),false);
  assert.ok(css.includes('#bottom-nav:not([hidden])'));
  assert.ok(css.includes('position: fixed !important'));
  assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
  assert.ok(css.includes('.topbar'));
  assert.ok(css.includes('#dj-v794-toolbar'));
});
