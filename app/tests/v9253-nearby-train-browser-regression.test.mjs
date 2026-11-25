import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('nearby sheet has exactly one captured header gesture owner and retains all three stages',()=>{
  const globalController=read('src/dj-v8212-sheet-controller.js');
  const nearby=read('src/pedestrian-tools.js');
  const motion=read('src/v889-mobile-sheet-motion.js');
  // The global controller must not register nearby; document-captured gestures
  // were fighting the global pointer drag and lifting the sheet over search.
  assert.doesNotMatch(globalController,/\['ped-tools-panel','\.ped-tools-panel-head','#ped-tools-close'\]/);
  assert.match(nearby,/bindHeaderDragInput\(document,window/);
  assert.match(nearby,/nearbyHeader\.getBoundingClientRect\(\)/);
  assert.match(nearby,/event\.clientX<rect\.left\+4/);
  assert.match(nearby,/event\.target\?\.closest\?\.\('button,a,input,textarea,select,label,\[role="button"\]'\)/);
  assert.match(nearby,/checkNearbyUpward\(event\)/);
  assert.match(nearby,/setMobileSheetExpanded\(panel,true,document,window\)/);
  assert.match(nearby,/setMobileSheetExpanded\(panel,false,document,window\)/);
  assert.match(nearby,/panel\.querySelector\('#ped-tools-close'\)\?\.click\(\)/);
  assert.match(nearby,/Math\.abs\(dy\)<8/); // tap expands compact card
  assert.match(nearby,/panel\.classList\.remove\('dj871-sheet-expanded'\)/);
  assert.match(motion,/export function setMobileSheetExpanded\(/);
  assert.match(motion,/syncPedestrianExpandedBounds\(panel,doc,win\)/);
  assert.match(motion,/startDelta\.y=Math\.max\(startDelta\.y,minDelta\)/);
  assert(!nearby.includes('installNearbySheetDrag'));
});

test('distant subway vehicle AND beam remain hidden, while bus visibility is unchanged',()=>{
  const script=read('src/features/liveTransit/integrate.js');
  const engine=read('src/features/liveTransit/index.js');
  assert.match(script,/METRO_LIVE_MIN_ZOOM=13\.0/);
  assert.match(script,/minZoom:13\.2,metroMinZoom:METRO_LIVE_MIN_ZOOM,intervalMs:60000/);
  assert.match(engine,/LIVE_METRO_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
  assert.match(engine,/TRAIN_BEAM_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
  assert.match(engine,/LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom/);
});

test('mobile Safari moves map tools beneath actual header rather than fixed guess',()=>{
  const script=read('src/mobile-browser-layout.js');
  // The release builder runs this same suite in an isolated app/ copy.
  // It generates src/mobile-next.css there, but intentionally excludes the
  // repository's frontend/ directory. Source CI uses the canonical file.
  let css;
  try { css=read('src/mobile-next.css'); }
  catch (error) {
    if(error?.code!=='ENOENT')throw error;
    css=read('../frontend/production/mobile-next.css');
  }
  assert.match(script,/getBoundingClientRect\?\.\(\)/);
  assert.match(script,/--dj829-tools-top/);
  assert.match(script,/ResizeObserver/);
  assert.match(css,/--dj829-tools-top/);
  assert.match(css,/#ped-tools-panel\.dj871-sheet-expanded:not\(\[hidden\]\)/);
});

test('category-first community, two-part update editions, onboarding fade remain present',()=>{
  const html=read('index.html'),history=read('src/version-history-v7.js');
  const onboarding=read('src/v860-onboarding.js');
  assert(html.indexOf('class="community-category-tabs"')<html.indexOf('class="community-toolbar" role="group"'));
  assert.equal(html.includes('class="community-heading-row"'),false);
   assert.match(history,/CHANGE_TYPE_GROUPS/);
   assert.match(history,/historyHighlights/);
  assert.match(onboarding,/dj860-swapping/);
});
