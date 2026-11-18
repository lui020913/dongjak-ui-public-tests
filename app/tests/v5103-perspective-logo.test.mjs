import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {farHazeOpacity,installDistantHaze} from '../src/distant-haze.js';
import {markerBoxHidden} from '../src/map-marker-occlusion.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('middle pitch applies visible CSS haze even without map.setSky',()=>{
  const classes=new Set(),cssProps=new Map(),handlers=new Map();
  const el={classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},style:{getPropertyValue:k=>cssProps.get(k)||'',setProperty:(k,v)=>cssProps.set(k,v)}};
  const map={pitch:0,zoom:12,getPitch(){return this.pitch;},getZoom(){return this.zoom;},getContainer(){return el;},on:(name,fn)=>handlers.set(name,fn)};
  const haze=installDistantHaze({map,app:{dataset:{theme:'light'}}});
  assert.equal(haze.isActive(),false);
  map.pitch=42;handlers.get('move')();
  assert.equal(haze.isActive(),true);
  assert.equal(classes.has('dj-far-haze-active'),true);
  assert.ok(Number(cssProps.get('--dj-far-haze-opacity'))>.5);
  map.pitch=0;handlers.get('move')();
  assert.equal(haze.isActive(),false);
  assert.equal(classes.has('dj-far-haze-active'),false);
});
test('distant overlay is foreground-safe and theme aware',()=>{
  const s=read('src/layout-core.css');
  assert.match(s,/#app #map\.dj-far-haze-active::before/);
  assert.match(s,/height:58%!important/);
  assert.match(s,/backdrop-filter:blur\(2\.2px\)/);
  assert.match(s,/pointer-events:none!important/);
  assert.match(s,/#app\[data-theme='dark'\] #map\.dj-far-haze-active::before/);
  assert.match(s,/#app #map::after,[^\n]*\{content:none!important/);
  assert.ok(farHazeOpacity(36,12)>0);
  assert.equal(farHazeOpacity(0,11),0);
});
test('invalid projection never leaves clipped official logo visible',()=>{
  assert.equal(markerBoxHidden({x:NaN,y:20,width:1642,height:852}),true);
  assert.equal(markerBoxHidden({x:-3,y:20,width:1642,height:852}),true);
  assert.match(read('src/landmark-layer.js'),/const minZoom=12\.7/);
});
test('no night-view code added',()=>{
  for(const x of ['src/distant-haze.js','src/layout-core.css'])assert.doesNotMatch(read(x),/sangdo1-night-map|night-visibility-layer/);
});
