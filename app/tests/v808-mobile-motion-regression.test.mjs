import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const coordinator=source('v806-unified-ui.js');

test('one mobile opening owner: old clip animations do not play after unified owner activates',()=>{
  assert.match(source('v803-ui-consistency.js'),/if\(app\.dataset\.dj806Motion==='on'\)return;/);
  assert.match(source('v803-ui-consistency.js'),/if\(app\.dataset\.dj806Motion==='on'\|\|!node/);
  assert.match(coordinator,/app\.dataset\.dj806Motion='on'/);
});

test('mobile panels enter with visible upward motion and reset their Web Animation fill',()=>{
  assert.match(coordinator,/const offset=vertical\?'0 34px'/);
  assert.match(coordinator,/duration:phone\(\)\?410:260/);
  assert.match(coordinator,/activeAnimation\.delete\(target\);anim\.cancel\(\)/);
  assert.match(coordinator,/let previous=new Map\(ids\.map\(id=>\[id,false\]\)\)/);
});

test('mobile X dismisses using original handler once without a deferred fake click',()=>{
  assert.match(coordinator,/const nativeDismiss=e=>/);
  assert.match(coordinator,/lifecycle\.dismiss\(id\)/);
  assert.match(coordinator,/on\(doc,'click',nativeDismiss,true\)/);
  assert.doesNotMatch(coordinator,/dispatchLocalClick\(button,win\)/);
  assert.doesNotMatch(coordinator,/button\.click\(\)/);
});

test('no fixed sheet repositioning on older Safari; reduced-motion preference stays effective',()=>{
  assert.match(coordinator,/motionSupported=\(\)=>!!win\.CSS\?\.supports\?\.\('translate','0px 1px'\)/);
  assert.match(coordinator,/clipPath:vertical\?'inset\(88% 0 0 0 round 22px\)'/);
  assert.match(coordinator,/prefers-reduced-motion: reduce/);
  assert.match(coordinator,/app\.classList\.contains\('dj-reduced-animation'\)/);
});

test('metro transfer changes content without cancelling the sheet entrance animation',()=>{
  const js=source('v807-ui-refine.js');
  assert.match(js,/transport\.dataset\.dj807Switching='true'/);
  assert.doesNotMatch(js,/transport\.getAnimations\?\.\(\)/);
  assert.match(coordinator,/id==='transport-sheet'&&element\(id\)\?\.dataset\.dj807Switching==='true'/);
});
