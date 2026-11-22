import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('standalone iPhone onboarding reuses the normal status color',()=>{
  const pwa=read('mobile-pwa-status-tone-v793.js');
  assert.match(pwa,/const baselineColor=\(\)=>root\.dataset\.theme==='dark'\?'#22282e':'#edf3ef'/);
  assert.ok(pwa.includes('(startup||onboarding)?baselineColor()'));
  assert.ok(!pwa.includes("onboarding?(theme==='dark'?'#22282e':'#f5faf7')"));
  assert.ok(pwa.includes("themeMeta.setAttribute('content',color)"));
  assert.ok(pwa.includes("sample.style.setProperty('background-color',color,'important')"));
});

test('onboarding uses status color across whole page but retains its illustration',()=>{
  const css=read('v860-onboarding.css');
  assert.ok(css.includes('Onboarding light PWA seamless background contract'));
  assert.ok(css.includes('#dj860-onboarding:not([hidden]) > .dj860-card'));
  assert.ok(css.includes('.dj860-head,.dj860-content,.dj860-footer'));
  assert.ok(css.includes('background:#edf3ef!important'));
  assert.ok(css.includes('background-color:#edf3ef!important'));
  const appended=css.slice(css.indexOf('/* Onboarding light PWA seamless background contract'));
  assert.ok(!appended.includes('.dj860-screen-image'),'do not override supplied banners');
  assert.ok(!appended.includes('.dj860-visual-pane'),'do not recolor illustrated panel');
});
