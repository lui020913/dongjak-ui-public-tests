import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('v7.0.29 restores the complete v7.0.18 feature import chain instead of older v7.0.7 main',()=>{
  const js=read('src/main.js');
  for(const css of ['mobile-ui-baseline.css','mobile-ui-baseline.css','mobile-ui-baseline.css',
    'mobile-ui-baseline.css','mobile-ui-baseline.css','mobile-ui-baseline.css',
    'mobile-ui-baseline.css','mobile-ui-baseline.css','mobile-ui-baseline.css',
    'mobile-ui-baseline.css','mobile-ui-baseline.css']) assert.ok(js.includes(css),`missing ${css}`);
  assert.match(js,/attributionControl:false/);
});
test('v8.6.9 Safety Map tab is home-only while original overview remains an explicit tool',()=>{
  const js=read('src/main.js');
  assert.match(js,/let firstMapEntryPending = true/);
  assert.match(js,/let overviewExplicitOpen=false/);
  assert.doesNotMatch(js,/overviewExplicitOpen=overview.hidden/);
  assert.doesNotMatch(js,/overview.hidden=!overviewExplicitOpen/);
  assert.match(js,/navigate\('map',\{suppressOverview:true\}\)/);
  assert.match(js,/!hasSafetyOverviewContent\(\) && !overviewExplicitOpen/);
});
test('v7.0.29 usable help label and theme-aware user icon, credits in map options',()=>{
  const html=read('index.html'),css=read('src/mobile-ui-baseline.css');
  assert.match(html,/id="map-gesture-guide-open"[^>]*>\?<\/button>/);
  assert.match(html,/nav-icon-user/);
  assert.match(html,/dj-map-attribution-details/);
  assert.match(css,/night-visibility-quick-off\[aria-pressed="true"\]/);
  assert.match(css,/maplibregl-ctrl-attrib\{display:none!important/);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
