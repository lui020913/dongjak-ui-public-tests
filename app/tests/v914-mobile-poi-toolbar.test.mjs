import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const poi=read('src/v912-poi-presentation.js');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const css=read('src/v831-swipe-feature-toolbar.css');

test('mobile POI categories join the existing top toolbar instead of creating a second row',()=>{
  assert.match(poi,/app\.querySelector\('#dj-v794-toolbar > #dj831-scrollport'\)/);
  assert.match(poi,/rail\.appendChild\(button\)/);
  assert.match(poi,/shell\.dataset\.dj912Integrated='true'/);
  assert.match(css,/#dj912-poi-categories\[data-dj912-integrated="true"\]/);
  assert.match(poi,/app\.addEventListener\('click'/);
});

test('food and cafe remain independent, accessible filters in the unified toolbar',()=>{
  assert.match(poi,/food:'M5 3v7/);
  assert.match(poi,/cafe:'M4 8h13/);
  assert.match(poi,/buttonSet\.has\(button\)/);
  assert.match(poi,/groups\.has\(id\)/);
  assert.match(poi,/const buttons=\[reset,\.\.\.categoryButtons\.slice\(0,2\),traffic/);
  assert.match(poi,/setAttribute\('aria-pressed'/);
});

test('desktop facility category row is restored outside the mobile toolbar',()=>{
  assert.match(poi,/shell\.removeAttribute\('data-dj912-integrated'\)/);
  assert.match(poi,/scroll\.appendChild\(button\)/);
  assert.match(poi,/restorePoiCategoryButton\(button,label\)/);
});

test('edge blur tracks the scrollport and does not block touch interaction',()=>{
  assert.match(toolbar,/positionEdgeBlur\(left,right\)/);
  assert.match(toolbar,/edgeBlurLeft\.hidden=!left;edgeBlurRight\.hidden=!right/);
  assert.match(css,/backdrop-filter:blur\(5px\)/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(css,/data-theme="dark"/);
});

test('phone priority rail initializes once only after onboarding and never after user interaction',()=>{
  assert.match(toolbar,/function settleInitialPhoneScroll\(cancel=false\)/);
  assert.match(toolbar,/app\.dataset\.dj860AutoResolved!=='true'/);
  assert.match(toolbar,/initialPhonePending=false;/);
  assert.match(toolbar,/scroller\.scrollTo\(\{left:0,behavior:'instant'\}\)/);
  assert.match(toolbar,/row\.addEventListener\('pointerdown',cancelInitialScroll/);
  assert.match(css,/overflow-anchor:none!important/);
});
test('phone panel follow-up keeps scroll body, fixed route footer and onboarding copy separated',()=>{
  const ui=read('src/mobile-ui/current.css');
  assert.match(ui,/#app#app \.page-panel > \.dj836-sheet-body/);
  assert.match(ui,/#app#app #route-panel > #dj910-route-footer/);
  assert.match(ui,/\.dj860-copy \{margin:0 auto auto!important/);
  assert.match(ui,/@media \(max-width:399px\)/);
});
