import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyBusStopLabelTheme} from '../src/bus-stop-label-theme.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('Only fade is available, and previously saved rise/none preferences are ignored',()=>{
  const src=read('src/v7120-settings.js');
  const motion=read('src/v806-unified-ui.js');
  const css=read('src/v811-mobile-experience.css');
  assert.match(src,/app\.dataset\.djMotionStyle='soft'/);
  assert.match(src,/delete prefs\.motionStyle/);
  assert.doesNotMatch(src,/dj-settings-motion-style/);
  assert.match(motion,/function playMobileMotion/);
  assert.match(motion,/target\.style\.setProperty\('opacity'/);
  assert.doesNotMatch(motion,/dj810-mobile-sheet-open/);
  assert.match(css,/@keyframes dj811-mobile-soft-open/);
  assert.match(css,/from \{ opacity:0; \}/);
  assert.match(css,/gap:2px!important/);
});
test('Re-tapping the already active nav does not re-open a sheet',()=>{
  const motion=read('src/v806-unified-ui.js');
  assert.match(motion,/tab\.dataset\.tab===app\.dataset\.tab/);
  assert.match(motion,/e\.stopImmediatePropagation\(\)/);
});
test('Suggested searches synchronize the real input before executing actual search',()=>{
  const search=read('src/map-quick-search.js');
  assert.match(search,/query\.dispatchEvent\(new Event\('input'/);
  assert.match(search,/void performSearch\(name\)/);
  assert.match(search,/searchPlaces\(term/);
  const mirror=read('src/v807-ui-refine.js');
  assert.match(mirror,/searchForm\?\.querySelectorAll\('\.dj807-search-copy'\)/);
});
test('Place popup uses an actual geographic pin and the same mobile-first sheet anchor on all screens',()=>{
  const place=read('src/place-details.js');
  assert.match(place,/createSelectedLocationPin\(document\)/);
  assert.match(read('src/selected-location-pin.js'),/dj807-facility-pin/);
  assert.match(place,/const viewportFocus=isPhone/);
  assert.match(place,/map\.easeTo\?\.\(\{center:\[p\.lng,p\.lat\]/);
  assert.match(place,/offset:\[0,offsetY\],duration:380/);
  assert.ok(place.includes("anchor:'top'"));
  assert.ok(place.includes("maxWidth:'min(520px, calc(100vw - 24px))'"));
  assert.equal(place.includes('desktopDetail'),false);
});
test('Bus name labels appear alongside icons from street zoom with normal collision',()=>{
  const calls=[];
  const m={getLayer:id=>id==='transport-bus-names'?{}:null,
    setLayerZoomRange:(...args)=>calls.push(args),setPaintProperty:()=>{}};
  applyBusStopLabelTheme(m,'dark');
  assert.deepEqual(calls,[['transport-bus-names',16.5,18.4]]);
});
test('Mobile sheets are compact and zoom lock only concerns the page, not map gestures',()=>{
  const css=read('src/v811-mobile-experience.css');
  const html=read('index.html');
  assert.match(css,/max-height:min\(65dvh,580px\)/);
  assert.match(css,/dj-place-detail-popup/);
  assert.match(css,/#bottom-nav>\.nav-tab/);
  assert.match(html,/user-scalable=no/);
  assert.match(read('src/v811-mobile-experience.js'),/if\(!allowed && now-last<280/);
});
