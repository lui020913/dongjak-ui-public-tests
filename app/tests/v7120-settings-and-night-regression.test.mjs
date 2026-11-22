import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('v8.0.0 is a single new minor release without changing older release history',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(RENUMBERED_VERSION_HISTORY.length,136);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
test('independent mobile icon and shared desktop settings panel are wired',()=>{
  const html=read('index.html'),js=read('src/v7120-settings.js'),css=read('src/v7120-polish.css');
  assert.match(html,/href="\/src\/v7120-polish\.css"/);
  assert.match(html,/src="\/src\/v7120-settings\.js"/);
  for(const id of ['dj-settings-mobile','dj-settings-pc','dj-map-settings','dj-settings-motion','dj-settings-weather','dj-settings-tools']) assert.match(js,new RegExp(id));
  assert.match(js,/localStorage\.setItem\(KEY/);
  assert.doesNotMatch(js,/dj-settings-theme|dj-settings-text|getElementById\('theme-toggle'\)/);
  assert.match(css,/#dj-settings-mobile/);
  assert.match(css,/map-quick-search-form>\.brand\{display:none!important/);
});
test('theme loading uses the existing single overlay but a new glass-card progress surface',()=>{
  const html=read('index.html'),css=read('src/v7120-polish.css');
  assert.equal((html.match(/id="dj-full-transition"/g)||[]).length,1);
  assert.match(html,/class="dj-transition-card"/);
  assert.match(html,/class="dj-transition-line"/);
  assert.match(css,/dj-polish-track/);
  assert.match(css,/data-theme="dark"\] #dj-full-transition/);
  assert.match(read('src/v711-experience.js'),/dj-transition-message/);
});
test('night analysis options group original controls without recreating any input',()=>{
  const js=read('src/v7120-night-panel.js'),html=read('index.html');
  assert.match(html,/src="\/src\/v7120-night-panel\.js"/);
  assert.match(js,/controls\.append\(advanced,top\)/);
  assert.match(js,/advanced\.append\(node\)/);
  assert.match(js,/top\.append\(node\)/);
  assert.match(read('src/v7120-polish.css'),/\.dj-night-group/);
});
test('original MapLibre entry and walk-safety layer assets remain connected',()=>{
  const main=read('src/main.js');
  assert.match(main,/installSafetyLayers/);
  assert.match(main,/initTransportMap/);
  assert.match(main,/installNightVisibility/);
  assert.ok(read('index.html').includes('id="night-visibility-radius"'));
});
