import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const coordinator=read('src/v806-unified-ui.js');
const css=read('src/v810-mobile-sheet-motion.css');

test('mobile floating panels share enter motion and close without replaying X',()=>{
  assert.doesNotMatch(coordinator,/dj810-mobile-sheet-open/);
  assert.match(coordinator,/const duration=opening\?WINDOW_MOTION\.open:WINDOW_MOTION\.close/);
  assert.match(coordinator,/target\.style\.setProperty\('opacity'/);
  assert.match(coordinator,/win\.requestAnimationFrame\(tick\)/);
  assert.match(coordinator,/if\(phone\(\)\)\{playMobileMotion\(target,true\);return;\}/);
  assert.match(coordinator,/if\(!playMobileMotion\(target,false,finish\)\)finish\(\)/);
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
  assert.match(coordinator,/windowMotionFrame\(progress,opening,distance,rect\.height,docked\)/);
  assert.match(coordinator,/if\(complete&&!opening&&typeof afterClose==='function'\)afterClose\(\)/);
  assert.match(coordinator,/target\.removeAttribute\('data-dj810-animating'\)/);
  assert.match(coordinator,/restore\(\)/);
});
test('mobile sheet animation remains loaded while legacy PC precision assets stay disabled',()=>{
  const html=read('index.html');
  assert.ok(html.includes('v810-mobile-sheet-motion.css'));
  assert.equal(html.includes('v809-precision-polish.css'),false);
  assert.ok(html.includes('dongjak-ios-home-180.png'));
  assert.ok(html.includes('dongjak-light-512.png'));
  assert.ok(html.includes('dongjak-dark-512.png'));
});
test('mobile compact dialogs no longer fade independently',()=>{
  assert.doesNotMatch(coordinator,/fadeOnlyMobileIds/);
  assert.match(coordinator,/windowMotionFrame/);
  assert.match(coordinator,/target\.style\.setProperty\('opacity','1','important'\)/);
});
