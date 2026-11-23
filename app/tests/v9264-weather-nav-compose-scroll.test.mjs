import {readPrimaryPhoneCss} from './helpers/primary-phone-css.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('weather sheet anchors to the visible bottom nav instead of hardcoded iOS inset',()=>{
  const weather=read('src/v854-weather-desktop.js');
  const css=read('src/mobile-first-layout.css');
  assert.match(weather,/const rect=nav\.getBoundingClientRect\(\)/);
  assert.match(weather,/win\.innerHeight-rect\.top\+8/);
  assert.match(weather,/syncWeatherDock\(\);win\.DongjakWindowMotion\?\.open\(sheet\)/);
  assert.match(css,/bottom: var\(--dj-weather-panel-bottom, var\(--mf-panel-bottom\)\) !important/);
});
test('weather card header and city now have separate box geometry',()=>{
 const css=read('src/mobile-first-layout.css');
 const panel=css.slice(css.indexOf('#dj854-weather-sheet:not([hidden])'),css.indexOf('.dj854-weather-close {'));
 assert.match(panel,/padding: 0 !important/);
 assert.match(panel,/top: 0 !important/);
 assert.match(panel,/margin: 0 0 8px !important/);
 assert.match(css,/\.dj854-weather-place \{\s*display: block !important;\s*margin: 16px 18px 7px !important/);
});
test('composer maintains scroll affordance without a second 110px artificial footer',()=>{
 const css=readPrimaryPhoneCss();
 assert.match(css,/scroll-padding-bottom:calc\(28px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
 assert.match(css,/touch-action:pan-y!important/);
 assert.doesNotMatch(css,/padding-bottom:calc\(110px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
});
