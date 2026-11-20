import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const css=read('src/v610-mobile-safety.css');
const js=read('src/main.js');
const html=read('index.html');
test('safety drawer hides competing controls on mobile and provides a separate backdrop',()=>{
  assert.match(css, /@media \(max-width:1079px\)/);
  assert.match(css, /#app\[data-tab="map"\]\.map-safety-open #map-safety-controls\{/);
  assert.match(css, /bottom:var\(--dj-mobile-nav-h\)!important/);
  assert.match(css, /max-height:min\(66dvh/);
  assert.match(css, /#map-tools-toggle,#map-safety-toggle,#night-visibility-quick-off/);
  assert.match(css, /\.sheet\.overview-sheet,\.map-actions/);
  assert.match(css, /\.night-visibility-float,\.transport-sheet/);
  assert.match(css, /#map-safety-backdrop:not\(\[hidden\]\)/);
  assert.match(css, /#app\[data-tab="map"\]\.map-safety-open \.topbar/);
  assert.match(html, /id="map-safety-backdrop"[^>]+hidden/);
});
test('mobile safety menu state stays synchronized with independent close actions and viewport changes',()=>{
  assert.match(js, /syncSafetyPresentation/);
  assert.match(js, /safetyStateObserver\.observe\(app,\{attributes:true,attributeFilter:\['class','data-tab'\]\}\)/);
  assert.match(js, /safetyMobileView\.addEventListener\?\.\('change',syncSafetyPresentation\)/);
  assert.match(js, /mapSafetyBackdrop\?\.addEventListener\('click',\(\)=>syncSafetyMenu\(false\)\)/);
  assert.match(js, /mapSafetyBackdrop\.hidden=!\(open&&safetyMobileView\.matches&&!app\.classList\.contains\('dj-safety-peek'\)\)/);
  assert.match(js, /mapSafetyControls\?\.setAttribute\('aria-hidden',String\(!open\)\)/);
  assert.match(js, /import '\.\/v610-mobile-safety\.css';/);
});
test('iOS PWA topbar stays opaque and distant map haze cannot blur it',()=>{
  assert.match(css, /background:#fcfefd!important/);
  assert.match(css, /#app\[data-theme="dark"\] \.topbar\{background:#192d31!important\}/);
  assert.match(css, /#app #map\.dj-far-haze-active::before\{/);
  assert.match(css, /-webkit-backdrop-filter:none!important/);
  assert.match(css, /@media \(max-width:1079px\) and \(display-mode:standalone\)/);
  assert.match(css, /orientation:landscape/);
});
