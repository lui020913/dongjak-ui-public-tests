import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v7.0.29 mobile starts with map while retaining an accessible safety overview',()=>{
  const html=read('index.html');
  const main=read('src/main.js');
  const css=read('src/v714-map-first-layout.css');
  assert.match(html,/<section id="overview-sheet"[^>]*hidden>/);
  assert.match(main,/let firstMapEntryPending = true;/);
  assert.match(main,/overview\.hidden = !hasSafetyOverviewContent\(\) \|\| \(initialMapEntry && window\.innerWidth < 1080\);/);
  assert.match(main,/if \(!overview\.hidden\) applyOverviewSheetState\('expanded'\)/);
  assert.match(css,/#app #overview-sheet\[hidden\]/);
});

test('v7.0.29 desktop controls use a coherent rail without invading tablet navigation',()=>{
  const rail=read('src/v713-desktop-rail.js');
  const css=read('src/v714-map-first-layout.css');
  assert.match(rail,/minWidth=1080/);
  assert.match(css,/@media\(min-width:1080px\)/);
  assert.match(css,/#dj-desktop-safety-rail::before/);
  assert.match(css, /height:43px!important/);
  assert.match(css, /height:55px!important/);
  assert.match(css,/@media\(max-width:1079px\)/);
});

test('v7.0.29 mobile bottom navigation remains floating, sources remain accessible',()=>{
  const css=read('src/v714-map-first-layout.css');
  assert.match(css,/bottom:calc\(10px \+ env\(safe-area-inset-bottom\)\)!important/);
  assert.match(css,/border-radius:24px!important/);
  assert.match(css,/\.maplibregl-ctrl-bottom-right/);
  assert.doesNotMatch(css,/\.maplibregl-ctrl-attrib\{[^}]*display:none/);
  const index=read('index.html');
  assert.match(index,/name="viewport" content="width=device-width, initial-scale=1\.0, maximum-scale=1\.0, user-scalable=no, viewport-fit=cover"/);
});

test('v7.0.29 metadata has a version entry and preserves previous changes',async()=>{
  const {VERSION_HISTORY}=await import('../src/version-history.js');
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(VERSION_HISTORY.some(v=>v.version==='v7.0.13'));
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
});
