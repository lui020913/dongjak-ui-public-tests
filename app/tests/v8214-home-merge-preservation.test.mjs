import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.2.14 home integration preserves the new personalized shortcuts and metadata',()=>{
  const html=read('index.html');
  const currentVersion=JSON.parse(read('package.json')).version;
   assert.equal(JSON.parse(read('public/version.json')).version,currentVersion);
   assert.ok(html.includes('id="map-startup-version" aria-label="앱 버전">버전 1.0'));
  assert.match(html,/v833-toolbar-personalization\.css/);
  assert.match(html,/v833-home-sheet-layout\.css/);
  assert.ok(html.indexOf('v833-toolbar-personalization.css')<html.indexOf('v833-home-sheet-layout.css'),
    'shared home-sheet layout should be linked after toolbar personalization');
  assert.match(html,/v831-swipe-feature-toolbar\.js/);
  const toolbar=read('src/v831-swipe-feature-toolbar.js');
  assert.match(toolbar,/dongjak_mobile_shortcut_preferences_v8214/);
  assert.match(toolbar,/function buildWeather\(/);
  assert.match(toolbar,/function requestNight\(/);
  assert.match(toolbar,/rebuildFeatureLocations\(/);
});

test('v8.2.14 navigation centers map/home without losing district option control',()=>{
  const html=read('index.html');
  const tabs=html.match(/<nav id="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.deepEqual([...tabs.matchAll(/data-tab="([^"]+)"/g)].map(x=>x[1]),
    ['route','participate','map','news','mine']);
  const panel=html.match(/<div id="map-advanced-controls"[\s\S]*?<section id="transport-sheet"/)?.[0]||'';
  assert.match(panel,/id="open-admin-dongs-from-options"/);
  assert.match(panel,/id="open-admin-dongs"/);
  const reset=read('src/v833-home-reset.js');
  assert.match(reset,/DEFAULT_BASE_LAYERS/);
  assert.doesNotMatch(reset,/localStorage\.clear\(/);
});
