import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identifyOpenedSurface,panelLayoutTokens} from '../src/v800-ui-architecture.js';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('modal coordinator prioritizes the newly opened surface',()=>{
  assert.equal(identifyOpenedSurface(['overview-sheet'],['overview-sheet','transport-sheet']),'transport-sheet');
  assert.equal(identifyOpenedSurface(['route-panel'],['transport-sheet']),'transport-sheet');
  assert.equal(identifyOpenedSurface(['route-panel'],['route-panel']),null);
});
test('desktop panel origin follows measured sidebar, never a cursor position',()=>{
  const r=panelLayoutTokens({rail:{right:172,top:91},width:1440});
  assert.deepEqual(r,{panelLeft:186,panelTop:91,maxWidth:1236});
  assert.equal(panelLayoutTokens({rail:{right:500,top:20},width:600}).maxWidth,270);
});
test('all popup sources are coordinated without overwriting geographic or transit data processing',()=>{
  const js=read('src/v800-ui-architecture.js');
  for(const id of ['transport-sheet','admin-dong-picker','route-panel','mine-panel','night-visibility-float','pza-road-sheet','dj800-type-panel'])assert.ok(js.includes(id));
  assert.match(js,/MutationObserver/);
  assert.match(js,/if\(other!==winner\)dismiss\(other\)/);
  assert.doesNotMatch(js,/maplibregl|fetch\(|ajax|worker\.postMessage/);
});
test('canonical compass bearing and artwork are mirrored onto the mobile proxy',()=>{
  const js=read('src/v800-ui-architecture.js');
  assert.match(js,/data-for="map-compass"/);
  assert.match(js,/main\.style\.transform/);
  assert.match(js,/mobile\.style\.transform=bearingTransform/);
  assert.match(js,/compassObserver\.observe/);
});
test('early PWA reload uses a theme-matched fade and never a startup icon image',()=>{
  const h=read('index.html');
  const block=h.slice(h.indexOf('/* Critical PWA pre-paint.'),h.indexOf('/* Critical first paint:'));
  assert.ok(block.includes('backdrop-filter:blur(14px)'));
  assert.doesNotMatch(block,/url\(/);
  assert.match(h,/displayTheme=pending \? \(pending\.night==='on'\?'dark':chosen\) : 'light'/);
});
test('mobile and desktop get separate layout, colors and animations',()=>{
  const c=read('src/v800-ui-architecture.css');
  assert.match(c,/@media\(max-width:699px\)/);
  assert.match(c,/@media\(min-width:1080px\)/);
  assert.match(c,/html\[data-theme="dark"\]/);
  assert.match(c,/dj800-sheet-enter/);
  assert.match(c,/--dj800-panel-bottom/);
  assert.match(c,/#dj800-type-trigger/);
});
test('semantic major version v8.0.0 retains prior releases and source history',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
