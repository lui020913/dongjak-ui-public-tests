import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/phone-ux-20261121.css');
const controller=read('src/phone-ux-20261121.js');
const main=read('src/main.js');
const theme=read('src/manual-pwa-theme-reload.js');
const pwa=read('src/mobile-pwa-status-tone-v793.js');
const night=read('src/v831-swipe-feature-toolbar.js');
const my=read('src/v834-my-info.js');

test('one mobile UX stylesheet owns the fullscreen phone and search geometry',()=>{
  assert.match(main,/import '\.\/phone-ux-20261121\.css'/);
  assert.doesNotMatch(read('index.html'),/v9267-phone-surface-regressions\.css/);
  assert.match(css,/#map-quick-search-dropdown:not\(\[hidden\]\)/);
  assert.match(css,/right:max\(12px,env\(safe-area-inset-right,0px\)\)/);
  assert.match(css,/--dj884-search-room/);
});

test('voice recording cannot displace the fixed AI orb',()=>{
  assert.match(css,/\.topbar \.header-tools #dj890-ai-orb/);
  assert.match(css,/position:fixed!important/);
  assert.match(css,/top:calc\(env\(safe-area-inset-top,0px\) \+ 8px\)!important/);
});

test('one opaque screen shield masks map tiles during fullscreen tab switches',()=>{
  assert.match(css,/#dj-phone-tab-background/);
  assert.match(css,/#dj-phone-tab-shield/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(controller,/function startTransition\(\)/);
  assert.match(controller,/app\.dataset\.djPhoneTabShield='true'/);
  assert.match(controller,/win\.addEventListener\('click',onNavClick,true\)/);
});

test('My Info matches the independent phone page and uses updated icons',()=>{
  assert.match(css,/#mine-panel :is\(\.dj834-profile-card,\.dj834-settings-group\)/);
  assert.match(css,/--dj-phone-screen-bg/);
  assert.match(my,/profile:'<circle cx="12" cy="8" r="3\.6"/);
  assert.match(my,/map:'<path d="m3 5 6-2/);
});

test('night consent remains centered and its re-entry cancels stale motion',()=>{
  assert.match(css,/#dj833-night-modal:not\(\[hidden\]\)/);
  assert.match(css,/place-items:center!important/);
  assert.match(css,/#dj-v794-night\[data-active="true"\]/);
  assert.match(night,/function openNightConfirm\(\)/);
  assert.match(night,/DongjakWindowMotion\?\.cancel\?\.\(card\)/);
});

test('standalone iOS manual theme change saves camera and refreshes even without map idle',()=>{
  assert.match(theme,/map\.getCenter\(\)/);
  assert.match(theme,/win\.sessionStorage\.setItem/);
  assert.doesNotMatch(theme,/baseline===null\|\|baseline!==layerSnapshot/);
  assert.match(pwa,/nightActive=app\.dataset\.sangdoNight==='on'/);
  assert.match(pwa,/data-sangdo-night/);
});
