import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {approvedProtectionHash} from './support/approved-walk-integration.mjs';
const text=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const html=text('../index.html');
const css=text('../src/v729-r2-new-ui.css');
const js=text('../src/v729-r2-new-ui.js');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(new URL(p,import.meta.url))).digest('hex');

test('R2 uses R1 as its base and declares its own presentation resources',()=>{
  assert.match(html,/v729-r2-fresh-ui-from-r1-20261112/);
  assert.match(html,/\/src\/v729-r1-responsive-ui.css/);
  assert.match(html,/\/src\/v729-r2-new-ui.css/);
  assert.match(html,/\/src\/v729-r2-new-ui.js/);
});
test('R2 mobile update shortcut reuses original release dialog rather than replacing it',()=>{
  assert.match(js,/id = 'dj-r2-history-shortcut'/);
  assert.match(js,/existing\.click\(\)/);
  assert.match(js,/app\.classList\.contains\('map-controls-open'\)/);
  assert.match(css,/#dj-r2-history-shortcut/);
});
test('R2 CSS does not modify the map canvas, map container, or startup overlay',()=>{
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g,''),/(^|[\s,{])#map(?=[\s{.,:[>+~])|\.maplibregl-|#map-startup-overlay/);
  assert.doesNotMatch(js,/maplibregl|new Map\(|fetch\(|getSource\(|addLayer\(/);
});
test('R2 uses five adaptive tabs with non-wrapping labels',()=>{
  assert.match(css,/flex:1 1 0%!important/);
  assert.match(css,/text-overflow:clip/);
});
test('R2 maintains distinct line badges and highlights 7호선 independently',()=>{
  assert.match(css,/\.metro-badge-number\[title="7호선"\]/);
  assert.match(css,/\.dj-active-transfer-line/);
});
historicalSnapshotTest('R2 leaves R1 map initialization, transport renderer, and public version unchanged',()=>{
  const baseline=JSON.parse(text('../R2_PRESERVED_BASELINE_SHA256.json'));
  for(const [name,expected] of Object.entries(baseline)){
    // Release history needs a new adapter, but the rest of the R1 baseline must be unchanged.
    if(['src/version-history.js','src/version-history-v7.js','src/v729-r1-visual-check.js','package.json','vite.config.js'].includes(name))continue;
    assert.equal(name==='src/transport-map.js'?crypto.createHash('sha256').update(stripApprovedV825TransportUI(text('../'+name))).digest('hex'):sha('../'+name),approvedProtectionHash(name,expected),`Protected source changed unexpectedly: ${name}`);
  }
  const pkg=JSON.parse(text('../package.json'));
  assert.equal(pkg.version,APP_VERSION);
});
