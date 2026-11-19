import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile administrative district picker is the only open sheet',()=>{
  const js=read('platforms/shared/mobile-panel-layout.js');
  const css=read('platforms/shared/mobile-panel-layout.css');
  assert.match(js,/if\(picker\.hidden\)open\.click\(\);\s*overview\.hidden=true;/);
  assert.match(css,/#app:has\(#admin-dong-picker:not\(\[hidden\]\)\) #overview-sheet/);
  assert.match(css,/display:none!important;visibility:hidden!important/);
});

test('all four mobile panels remain scrollable with pinned header and compact sheet',()=>{
  const css=read('platforms/shared/mobile-panel-layout.css');
  const js=read('platforms/shared/mobile-panel-layout.js');
  assert.match(css,/height:min\(43dvh,480px\)!important/);
  assert.match(css,/flex:0 0 auto!important/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(js,/\['route-panel','participation-panel','news-panel','mine-panel'\]/);
  assert.match(js,/panel\.replaceChildren\(header,content\)/);
});

test('theme switch has clearly visible progress and iOS PWA theme roots are in sync',()=>{
  const css=read('platforms/shared/mobile-panel-layout.css');
  const ios=read('platforms/ios-pwa/ios-pwa.css');
  const pwa=read('src/mobile-pwa-status-tone-v793.js');
  assert.match(css,/blur\(14px\)/);
  assert.match(css,/테마 전환 중…/);
  assert.match(css,/#app#app#app \.dj-theme-switch-flash/);
  assert.match(ios,/color-scheme:dark!important/);
  assert.match(ios,/color-scheme:light!important/);
  assert.match(pwa,/root\.style\.colorScheme=theme/);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
});
