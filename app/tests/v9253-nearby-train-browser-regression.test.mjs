import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('nearby sheet keeps exactly one gesture owner and supports fallback tap',()=>{
  const owner=read('src/dj-v8212-sheet-controller.js');
  const controller=read('src/v889-mobile-sheet-motion.js');
  assert.match(owner,/\['ped-tools-panel','\.ped-tools-panel-head','#ped-tools-close'\]/);
  assert.match(owner,/if\(id==='ped-tools-panel'&&!g\.dragging\)/);
  assert.match(owner,/setMobileSheetExpanded\(panel,!panel\.classList\.contains\('dj871-sheet-expanded'\),doc,win\)/);
  assert.match(owner,/sheetStageAction\(/);
  assert.match(controller,/function setMobileSheetExpanded\(/);
  assert(!read('src/pedestrian-tools.js').includes('installNearbySheetDrag'));
});

test('distant subway vehicle AND beam remain hidden, while bus visibility is unchanged',()=>{
  const script=read('src/features/liveTransit/integrate.js');
  const engine=read('src/features/liveTransit/index.js');
  assert.match(script,/minZoom:13\.2,metroMinZoom:16\.4,intervalMs:60000/);
  assert.match(engine,/LIVE_METRO_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
  assert.match(engine,/TRAIN_BEAM_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
  assert.match(engine,/LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom/);
});

test('mobile Safari moves map tools beneath actual header rather than fixed guess',()=>{
  const script=read('src/mobile-browser-layout.js');
  const css=read('../frontend/production/mobile-next.css');
  assert.match(script,/getBoundingClientRect\?\.\(\)/);
  assert.match(script,/--dj829-tools-top/);
  assert.match(script,/ResizeObserver/);
  assert.match(css,/--dj829-tools-top/);
  assert.match(css,/#ped-tools-panel\.dj871-sheet-expanded:not\(\[hidden\]\)/);
});

test('category-first community, two-part update editions, onboarding fade remain present',()=>{
  const html=read('index.html'),history=read('src/version-history-v7.js');
  const onboarding=read('src/v860-onboarding.js');
  assert(html.indexOf('class="community-category-tabs"')<html.indexOf('class="community-heading-row"'));
  assert.match(history,/dj-edition-minor/);
  assert.match(history,/publicEdition/);
  assert.match(onboarding,/dj860-swapping/);
});
