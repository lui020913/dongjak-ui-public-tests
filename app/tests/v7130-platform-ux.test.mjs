import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v8.0.0 adds one release but preserves previous v7.12.0',()=>{
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(RENUMBERED_VERSION_HISTORY.length,136);
  assert.equal(RENUMBERED_VERSION_HISTORY.at(-1).version,'v1.0.0');
});
test('PC and mobile independent app icons open the same version history',()=>{
  const settings=read('src/v7120-settings.js'),css=read('src/v7130-ux.css');
  assert.match(settings,/id='dj-about-pc'/);
  assert.match(settings,/id='dj-app-about'/);
  assert.match(settings,/mobile\.addEventListener\('click',openAbout\)/);
  assert.match(settings,/pcLogo\.addEventListener\('click',openAbout\)/);
  assert.match(settings,/id="dj-about-version-number"/);
  assert.match(css,/#app#app #dj-app-about\[hidden\]/);
  assert.match(css,/#dj-about-pc/);
});
test('mobile more panel offers exactly history and settings, no weather duplication',()=>{
  const script=read('src/mobile-chrome-v790.js');
  assert.match(script,/id="dj-mobile-history"/);
  assert.match(script,/id="dj-mobile-settings"/);
  assert.doesNotMatch(script,/id="dj-mobile-weather-copy"/);
  assert.match(script,/dispatchEvent\(new CustomEvent\('dj:open-map-settings'\)\)/);
  assert.match(read('src/v7120-settings.js'),/addEventListener\('dj:open-map-settings',externalOpen\)/);
});
test('mobile transit sheet keeps PC actions and map buttons from covering bus popup',()=>{
  const css=read('src/v7130-ux.css'),rail=read('platforms/shared/mobile-actions-v7104.css');
  assert.match(css,/transport-sheet:not\(\[hidden\]\)/);
  assert.match(css,/#transport-mode-tabs button/);
  assert.match(css,/transport-panel-head\{position:sticky/);
  assert.match(rail,/transport-sheet-open #dj-mobile-map-actions/);
  assert.match(read('src/v7130-ux.js'),/attributeFilter:\['hidden'\]/);
});
test('mobile and desktop keep distinct font-size rules',()=>{
  const css=read('src/v7130-ux.css');
  assert.match(css,/@media\(min-width:700px\)/);
  assert.match(css,/@media\(max-width:699px\)/);
  assert.match(css,/dj-ux-text-delta/);
  assert.match(css,/--dj-ux-bg:#1e3438/);
});
test('iOS Safari offers manual home-screen guidance without an unsolicited overlay',()=>{
  const js=read('src/v7130-ux.js'),html=read('index.html'),ios=read('platforms/ios-pwa/entry.js');
  assert.doesNotMatch(js,/app\.append\(prompt\)/);
  assert.doesNotMatch(js,/dj-ios-add-guide/);
  assert.match(html,/iPhone에서 앱처럼 사용하기/);
  assert.match(html,/홈 화면에 추가/);
  assert.match(ios,/location\.reload\(\),150/);
});
test('mobile typography has one navigation owner, not a duplicate popup close',()=>{
  const toolbar=read('src/v831-swipe-feature-toolbar.js');
  const nav=read('src/v800-ui-architecture.js');
  const windows=read('src/v806-unified-ui.js');
  assert.doesNotMatch(toolbar,/typography\.addEventListener\('click'/);
  assert.match(nav,/if\(mediaMobile\(\)\)/);
  assert.match(nav,/panel\.querySelector\('\.dj834-my-home \[data-dj834-action="type"\]'\)\?\.click\(\)/);
  assert.match(windows,/if\(phone\(\)&&opener\.id==='dj800-type-trigger'\)return ''/);
});
