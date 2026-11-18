import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {approvedProtectionHash} from './support/approved-walk-integration.mjs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.0.0 preserves the original v7.9 release chain',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY.length,136);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  for(const [index,version] of [[12,'v7.9.5'],[13,'v7.9.4'],[14,'v7.9.3'],[15,'v7.9.2'],[16,'v7.9.1'],[17,'v7.9.0']]){
    assert.equal(RENUMBERED_VERSION_HISTORY[index].version,version);
  }
});
historicalSnapshotTest('map, desktop and previous UI source bytes are preserved',()=>{
  const preserved=JSON.parse(read('PC_MAP_PROTECTED_SHA256.json'));
  for(const [path,hash] of Object.entries(preserved)){
    assert.equal(createHash('sha256').update(path==='src/transport-map.js'?stripApprovedV825TransportUI(read(path)):read(path)).digest('hex'),approvedProtectionHash(path,hash),'Changed protected file: '+path);
  }
});
test('mobile chrome styles are restricted to mobile media queries',()=>{
  const css=read('src/mobile-chrome-v790.css');
  assert.match(css,/\@media \(max-width:699px\)/);
  assert.match(css,/#dj-mobile-safe-top/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.ok(!css.includes('@media(min-width:'));
  assert.ok(!css.includes('\n#map{'));
  assert.ok(!css.includes('maplibregl'));
  assert.match(css, /:not\(\[data-tab="map"\]\)/);
  assert.match(css, /\.map-immersive/);
});
test('mobile actions reuse existing buttons without changing their parent nodes',()=>{
  const js=read('src/mobile-chrome-v790.js');
  const html=read('index.html');
  // Include large landscape touch tablets, without activating on desktop pointers.
  assert.ok(js.includes("matchMedia('(max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)')"));
  assert.ok(!js.includes('maplibregl'));
  assert.ok(!js.includes('appendChild(mapToolsToggle)'));
  assert.ok(js.includes("doc.getElementById('version-history-trigger')?.click()"));
  assert.doesNotMatch(js, /dj-mobile-weather-location/);
  assert.ok(html.includes('/src/mobile-chrome-v790.css'));
  assert.ok(html.includes('/src/mobile-chrome-v790.js'));
});
