import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {approvedProtectionHash} from './support/approved-walk-integration.mjs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
import {isIosHomeScreenPhone} from '../src/ios-pwa-overlay-chrome.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const media=(standalone,phone)=>s=>({matches:s.includes('display-mode')?standalone:phone});
const iosDevice={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X)',standalone:true};

test('v7.9.3 preserves every release and source note',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY.length,136);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[13].version,'v7.9.4');
  assert.equal(RENUMBERED_VERSION_HISTORY[14].version,'v7.9.3');
});
test('only iOS Home Screen phone gets status bar treatment',()=>{
  assert.equal(isIosHomeScreenPhone({navigator:iosDevice,matchMedia:media(true,true)}),true);
  assert.equal(isIosHomeScreenPhone({navigator:{...iosDevice,standalone:false},matchMedia:media(false,true)}),false);
  assert.equal(isIosHomeScreenPhone({navigator:{userAgent:'Windows NT 10.0',standalone:true},matchMedia:media(true,true)}),false);
  assert.equal(isIosHomeScreenPhone({navigator:iosDevice,matchMedia:media(true,false)}),false);
});
test('no deprecated meta; iOS PWA map tone and opaque search are isolated from desktop',()=>{
  const html=read('index.html'); const css=read('src/ios-pwa-overlay-chrome.css');
  const js=read('src/ios-pwa-overlay-chrome.js');
  const manifest=JSON.parse(read('public/manifest-light.webmanifest'));
  assert.doesNotMatch(html,/name="apple-mobile-web-app-status-bar-style"/);
  assert.match(html,/viewport-fit=cover/);
  assert.match(html,/ios-pwa-overlay-chrome.css/);
  assert.match(html,/ios-pwa-overlay-chrome.js/);
  assert.equal(manifest.theme_color,'#eaf0ec');
  assert.equal(manifest.background_color,'#eaf0ec');
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/html\.dj-ios-home-pwa/);
  assert.match(css,/background:#ffffff!important/);
  assert.match(css,/backdrop-filter:none!important/);
  assert.match(js,/isIosHomeScreenPhone/);
  assert.doesNotMatch(js,/maplibregl/);
});
historicalSnapshotTest('protected desktop and map files are byte-identical',()=>{
  const protectedFiles=JSON.parse(read('PC_MAP_PROTECTED_SHA256.json'));
  for(const [path,expected] of Object.entries(protectedFiles)) {
    const got=createHash('sha256').update(path==='src/transport-map.js'?stripApprovedV825TransportUI(read(path)):read(path)).digest('hex');
    assert.equal(got,approvedProtectionHash(path,expected),path);
  }
});
