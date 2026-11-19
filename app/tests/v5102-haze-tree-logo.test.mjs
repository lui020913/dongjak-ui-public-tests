import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOG_ENABLE_PITCH,FOG_DISABLE_PITCH,makeDistantHazeSky,installDistantHaze} from '../src/distant-haze.js';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');

test('native MapLibre atmosphere reacts only to oblique pitch and supports theme',()=>{
  assert.ok(FOG_DISABLE_PITCH<FOG_ENABLE_PITCH);
  const listeners=new Map(), calls=[];
  const map={pitch:0,getPitch(){return this.pitch;},setSky(value){calls.push(value);},on(name,fn){listeners.set(name,fn);}};
  const app={dataset:{theme:'light'}};
  let onTheme=null;
  const themeButton={addEventListener:(name,fn)=>{if(name==='click')onTheme=fn;}};
  const haze=installDistantHaze({map,app,themeButton});
  assert.equal(haze.isActive(),false);
  map.pitch=15;listeners.get('pitchend')();assert.equal(haze.isActive(),false);
  map.pitch=35;listeners.get('pitchend')();assert.equal(haze.isActive(),true);
  assert.equal(calls.at(-1)['fog-color'],makeDistantHazeSky('light')['fog-color']);
  app.dataset.theme='dark';onTheme();
  assert.equal(calls.at(-1)['fog-color'],makeDistantHazeSky('dark')['fog-color']);
  map.pitch=60;listeners.get('pitchend')();
  assert.ok(calls.at(-1)['fog-ground-blend']>makeDistantHazeSky('dark')['fog-ground-blend']);
  map.pitch=25;listeners.get('pitchend')();assert.equal(haze.isActive(),true);
  map.pitch=20;listeners.get('pitchend')();assert.equal(haze.isActive(),false);
  assert.equal(calls.at(-1),undefined);
});

test('decorative canopy markers cannot appear in broad zoom or at a distance',()=>{
  const s=read('src/map-polish.js');
  assert.match(s,/id:'dongjak-tree-symbols'[\s\S]*?minzoom:15\.5/);
  assert.match(s,/const flat=zoom>=15\.5 && pitch<30/);
  assert.match(s,/const visible=zoom>=15\.3 && pitch>=30/);
  assert.match(s,/if\(zoom<15\.3\|\|loaded/);
});

test('logo is not replaced and left header has no stray white tab or shadow',()=>{
  assert.match(read('index.html'),/img class="dj-app-artwork" src="\/icons\/dongjak-light-192\.png"/);
  const s=read('src/layout-core.css');
  assert.match(s,/#app \.topbar,#app\[data-theme='dark'\] \.topbar\{[\s\S]*?box-shadow:none!important/);
  assert.match(s,/#app \.topbar::before,#app \.topbar::after\{content:none!important/);
  assert.match(s,/#app:not\(\.map-controls-open\) \.map-advanced-controls/);
});

test('no night-visibility analysis feature or its sources added',()=>{
  assert.doesNotMatch(read('src/distant-haze.js'),/night-map|street-light|security-light|야간 시야/);
});
