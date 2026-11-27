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

test('decorative canopy layers never install or fetch, vegetation fills remain',async()=>{
 const {installDecorativeParkTrees}=await import('../src/map-polish.js');
 const removed=[],hidden=[],sources=[];
 const map={getLayer:id=>id.startsWith('dongjak-tree-'),removeLayer:id=>removed.push(id),getSource:()=>true,removeSource:id=>sources.push(id),getStyle:()=>({layers:[{id:'native-tree',type:'symbol'},{id:'forest',type:'fill'},{id:'park',type:'fill'}]}),setLayoutProperty:(id,key,value)=>hidden.push([id,value])};
 installDecorativeParkTrees({map});
 assert.equal(removed.length,3);assert.equal(sources.length,2);assert.deepEqual(hidden,[['native-tree','none']]);
 const body=read('src/map-polish.js').split('export function installDecorativeParkTrees')[1].split('export function installMapOrientationControls')[0];
 assert.doesNotMatch(body,/addLayer|addSource|queryOverpass|map\.on\(/);
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
