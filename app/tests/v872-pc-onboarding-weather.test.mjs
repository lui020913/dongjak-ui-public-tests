import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const src=read('src/v860-onboarding.js');
const css=read('src/v872-pc-onboarding-weather.css');
const html=read('index.html');
test('PC tour does not capture the pointer and retarget button clicks',()=>{
  assert.match(src,/overlay\.addEventListener\('pointerdown',onPointerDown\)/);
  assert.match(src,/overlay\.addEventListener\('pointerup',onPointerUp\)/);
  assert.doesNotMatch(src,/overlay\.setPointerCapture/);
  assert.match(src,/if\(type==='next'\)/);
  assert.match(src,/if\(type==='skip'\)/);
});
test('PC onboarding is accessible without changing phone rules',()=>{
  assert.match(css,/@media \(min-width:700px\)/);
  assert.match(css,/dj860-description/);
  assert.match(css,/dj860-points li/);
  assert.match(css,/dj860-progress-label/);
  assert.match(css,/dj860-actions button/);
  assert.match(html,/v872-pc-onboarding-weather\.css/);
});
test('PC weather is one equal-height header control with no tiny nested pill',()=>{
  assert.match(css,/#weather-widget/);
  assert.match(css,/height:56px!important;min-height:56px!important;max-height:56px!important/);
  assert.match(css,/#weather-label/);
  assert.match(css,/height:100%!important;min-height:100%!important;max-height:100%!important/);
});
