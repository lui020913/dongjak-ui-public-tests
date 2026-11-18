import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const coordinator=read('src/v806-unified-ui.js');
const css=read('src/v810-mobile-sheet-motion.css');

test('mobile floating panels share enter motion and close without replaying X',()=>{
  assert.doesNotMatch(coordinator,/dj810-mobile-sheet-open/);
  assert.match(coordinator,/const duration=fadeOnly\?\(opening\?190:160\):\(opening\?340:250\)/);
  assert.match(coordinator,/target\.style\.setProperty\('opacity',String\(/);
  assert.match(coordinator,/win\.requestAnimationFrame\(tick\)/);
  assert.match(coordinator,/if\(playMobileMotion\(target,true,undefined,fadeOnlyMobileIds\.has\(id\)\)\)return;/);
  assert.match(coordinator,/if\(!playMobileMotion\(target,false,finish,fadeOnlyMobileIds\.has\(id\)\)\)finish\(\)/);
  assert.match(coordinator,/const nativeDismiss=e=>/);
});
test('mobile floating animation has entry, exit and reduced-motion keyframes',()=>{
  assert.match(css,/@keyframes dj810-mobile-sheet-open/);
  assert.match(css,/@keyframes dj810-mobile-sheet-close/);
  assert.match(css,/clip-path:inset\(100% 0 0 0 round 24px\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});
test('animation is replayable, restores inline opacity, and guards close-frame flash',()=>{
  assert.match(coordinator,/const beforeOpacity=target\.style\.getPropertyValue\('opacity'\)/);
  assert.match(coordinator,/target\.style\.setProperty\('transition','none','important'\)/);
  assert.match(coordinator,/const eased=progress\*progress\*\(3-2\*progress\)/);
  assert.match(coordinator,/if\(complete&&!opening&&typeof afterClose==='function'\)afterClose\(\)/);
  assert.match(coordinator,/target\.removeAttribute\('data-dj810-animating'\)/);
  assert.match(coordinator,/restore\(\)/);
});
test('new animation is loaded last, preserving three independent iOS light/dark/home icon routes',()=>{
  const html=read('index.html');
  assert.match(html,/v809-precision-polish\.css"\s*\/>[\s\S]*v810-mobile-sheet-motion\.css"\s*\/>/);
  assert.match(html,/dongjak-ios-home-180\.png/);
  assert.match(html,/dongjak-light-512\.png/);
  assert.match(html,/dongjak-dark-512\.png/);
});

test('v887 compact dialogs fade without changing the staged bottom-sheet slide',()=>{
  assert.match(coordinator,/const fadeOnlyMobileIds=new Set/);
  assert.match(coordinator,/'map-gesture-guide','admin-dong-picker','dj-map-settings'/);
  assert.match(coordinator,/if\(!fadeOnly\)target\.style\.setProperty\('translate'/);
});
