import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METRO_LIVE_MIN_ZOOM} from '../src/features/liveTransit/integrate.js';
import {railGeojson} from '../src/fixed-rail-data.js';
import {mergeOfficialRail} from '../src/rail-official-shapes.js';
import {fixedRailCollection} from '../src/fixed-rail-lines.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('vehicle zoom is less restrictive than street-only 16.4 and reused for render/status',()=>{
  assert.equal(METRO_LIVE_MIN_ZOOM,13.0);
  const src=read('src/features/liveTransit/integrate.js');
  assert.equal((src.match(/map.getZoom\?\.\(\)<METRO_LIVE_MIN_ZOOM/g)||[]).length,2);
  assert.doesNotMatch(src,/metroMinZoom:16\.4/);
});
test('AI opens only from an actual pointer gesture on its own trigger or explicit orb request',()=>{
  const entry=read('src/v880-supabase-safety-ai.js');
  const orb=read('src/v890-mobile-ai-orb.js');
  assert.match(entry,/document\.addEventListener\('pointerdown',capturePointer,true\)/);
  assert.match(entry,/currentTarget\.contains\(pointerStart\.target\)/);
  assert.match(orb,/startedOnOrb/);
  assert.match(orb,/dongjak:explicit-ai-open/);
  assert.doesNotMatch(orb,/\.showModal\(/);
});
test('unverified distant official rail segments do not replace local known-station line',()=>{
  const fallback=fixedRailCollection();
  const isolated=[[126.938,37.498],[126.939,37.499]];
  const result=mergeOfficialRail(fallback,[{line:'7',coordinates:isolated}]);
  assert.equal(result.lines.length,0);
  assert.deepEqual(result.collection.features,fallback.features);
  assert.equal(railGeojson.features.length,6);
});
test('iOS status and gradient share a consistent light appearance',()=>{
  const js=read('src/mobile-pwa-status-tone-v793.js');
  const css=read('src/mobile-pwa-status-tone-v793.css');
  assert.match(js,/'#22282e':'#edf3ef'/);
  assert.match(css,/--dj-pwa-native-edge:#edf3ef/);
});
