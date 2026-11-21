import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/v864-refinements.css');
const js=read('src/v864-refinements.js');
const controls=read('src/mobile-map-controls.js');
const onboarding=read('src/v860-onboarding.js');
const sheet=read('src/dj-v8212-sheet-controller.js');
const metro=read('src/v8215-news-metro-compact-header.js');
const main=read('src/main.js');
const html=read('index.html');

test('mobile onboarding card floats above the map instead of occupying the whole screen',()=>{
  assert.match(css,/\.dj860-card[\s\S]*?width:min\(560px,calc\(100vw - 28px\)\)/);
  assert.match(css,/border-radius:26px!important/);
  assert.match(css,/overflow:hidden!important;background:transparent!important/);
  assert.match(css,/-webkit-backdrop-filter:none!important;backdrop-filter:none!important/);
  assert.doesNotMatch(css,/background:rgba\(12,30,25,\.48\)!important|backdrop-filter:blur\(5px\)!important/);
  assert.match(css,/\.dj860-brand[\s\S]*?display:none!important/);
});

test('guide accordions animate and update-history action is aligned at the right',()=>{
  assert.match(js,/installDetailsMotion/);
  assert.match(js,/installTipMotion/);
  assert.match(css,/transition:max-height \.24s/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(css,/justify-self:end!important/);
});

test('closing the guide cancels pending automatic reopening and onboarding uses one open event',()=>{
  assert.match(controls,/if\(launchTimer\)\{clearTimeout\(launchTimer\);launchTimer=null;\}/);
  assert.match(controls,/dongjak:open-map-guide/);
  assert.match(controls,/event\?\.stopImmediatePropagation\?\.\(\)/);
  assert.match(onboarding,/dongjak:open-map-guide/);
});

test('transit actions are text labels and transport header can be dragged without hijacking buttons',()=>{
  assert.match(metro,/dj-news-transport-label[^>]*>출발/);
  assert.match(metro,/dj-news-transport-label[^>]*>도착/);
  assert.match(sheet,/if\(headerSelector\)/);
  assert.match(sheet,/event\.target\.closest\?\.\(INTERACTIVE\)/);
});

test('closing transit no longer reopens the overview sheet',()=>{
  assert.match(main,/onClose:\(\)=>\{\s*\/\/ Closing a station\/stop sheet[\s\S]*?overview\.hidden=true;/);
  assert.doesNotMatch(main,/onClose:\(\)=>\{\s*if\(app\.dataset\.tab==='map'[\s\S]*?showOverviewOnlyWithContent\(\)/);
});

test('bus arrivals use a two-card grid and TIP pill retains a right inset',()=>{
  assert.match(css,/data-kind="bus"\] #transport-arrivals:has\(\.transport-arrival-row\)[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/padding:0 14px 0 4px!important/);
  assert.match(css,/margin:0 8px 0 0!important/);
  assert.match(html,/dj864-accordion-content/);
});
