import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
import {approvedProtectionHash} from './support/approved-walk-integration.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('v8.0.0 preserves every prior release and adds the v8 major bump',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(RENUMBERED_VERSION_HISTORY.length,136);
  assert.equal(RENUMBERED_VERSION_HISTORY.reduce((sum,entry)=>sum+entry.items.length,0),623);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
test('mobile map rail uses original PC button SVG and preserves event proxy',()=>{
  const rail=read('platforms/shared/mobile-actions-v7104.js');
  assert.match(rail,/button\.innerHTML=original\.innerHTML/);
  assert.match(rail,/doc\.getElementById\(action\.id\)\?\.click\(\)/);
  const ids=['map-gesture-guide-open','map-compass','center-dongjak','current-location'];
  ids.forEach(id=>assert.match(rail,new RegExp(id)));
});
test('mobile logo expands on click; search focus collapses without hiding the input',()=>{
  const source=read('src/v711-experience.js');const css=read('src/v711-experience.css');
  assert.match(source,/dj-v711-brand-expanded/);
  assert.match(source,/logo\.setAttribute\('role','button'\)/);
  assert.match(source,/listen\(query,'focus'/);
  assert.match(css,/\.brand\.dj-placeholder-nonexistent\b|\.dj-v711-brand-expanded/);
  assert.match(css,/map-quick-search-query/);
  assert.match(css,/max-width:699px/);
});
test('transition overlay uses spinner + strong blur, with no PWA reload logo',()=>{
  const html=read('index.html');const css=read('src/v711-experience.css');const js=read('src/v711-experience.js');
  assert.match(html,/id="dj-full-transition"/);
  assert.match(html,/class="dj-progress-spinner"/);
  assert.match(css,/backdrop-filter:blur\(19px\)/);
  assert.match(css,/@keyframes dj-v711-spin/);
  assert.match(css,/data-dj-reload-splash="true"\] body::before/);
  assert.match(js,/attributeFilter:\['data-dj-reload-splash'\]/);
  assert.match(js,/night-visibility-quick-off/);
});
test('PC transport switches lines only through adjacent station-title badges',()=>{
  const transport=read('src/transport-map.js');
  const style=read('src/v711-experience.css');
  assert.match(transport,/dj-metro-line-selector/);
  assert.match(transport,/button\.addEventListener\('click'/);
  assert.match(transport,/open\(\{\.\.\.current,selectedLine:line\},true\)/);
  assert.match(transport,/createMetroLineCard\(place\.selectedLine,place\.name\)/);
  assert.match(style,/transport-sheet\[data-kind="subway"\] #transport-chips\{display:none!important/);
  assert.match(style,/left:calc\(var\(--dj-v724-rail-right,130px\) \+ 8px\)/);
});
test('history and road-width animations respect reduced motion',()=>{
  const css=read('src/v711-experience.css');
  assert.match(css,/v707-history-columns/);
  assert.match(css,/#road-width-legend:not\(\[hidden\]\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/dj-v711-entrance/);
});
historicalSnapshotTest('protected map layers and safety imports stay byte-identical',()=>{
  const expected=JSON.parse(read('PC_MAP_PROTECTED_SHA256.json'));
  for(const [name,baseline] of Object.entries(expected)){
    const hash=createHash('sha256').update(name==='src/transport-map.js'?stripApprovedV825TransportUI(read(name)):readFileSync(new URL('../'+name,import.meta.url))).digest('hex');
    assert.equal(hash,approvedProtectionHash(name,baseline),name);
  }
  const core=read('src/main.js');
  assert.match(core,/safety|pedestrian|maplibre|transport/i);
});
