import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {APPROVED_WALK_INTEGRATION_MAIN_SHA256} from './support/approved-walk-integration.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
historicalSnapshotTest('walk safety integrated main is exactly the approved upload while original protected baselines are untouched',()=>{
  const original=JSON.parse(read('PC_MAP_PROTECTED_SHA256.json'));
  const integrated=createHash('sha256').update(readFileSync(new URL('../src/main.js',import.meta.url))).digest('hex');
  assert.notEqual(original['src/main.js'],integrated);
  assert.equal(integrated,APPROVED_WALK_INTEGRATION_MAIN_SHA256);
  assert.match(read('src/main.js'),/fetchDongjakPedestrianVariants/);
  assert.match(read('src/main.js'),/installDongjakOfficialDataLayers/);
});
test('walk safety routes and seven optional layers coexist with v8.0.0 app appearance and controls',()=>{
  const html=read('index.html');
  const layers=['accidents','cctv-security','cctv-parking','cctv-other','slope','survey-crosswalk','metro-elevator'];
  for(const layer of layers)assert.ok(html.includes('data-dj-import="'+layer+'"'),layer);
  for(const id of ['route-data-note','route-map-source','dj-app-manifest','dj-apple-touch-icon'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/src="\/src\/app-artwork-v7104.js"/);
  assert.match(html,/class="dj-app-artwork"/);
  assert.ok(existsSync(new URL('../public/data/safety/walk/dongjak_walk_graph.json',import.meta.url)));
  assert.ok(existsSync(new URL('../public/icons/dongjak-dark-512.png',import.meta.url)));
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
