import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');

test('mobile sheet motion slides from below while overriding legacy important styles',()=>{
  assert.match(source,/const slideDuration=opening\?WINDOW_MOTION\.open:WINDOW_MOTION\.close/);
  assert.match(source,/sheetFadeOpacity\(progress,opening,slideFrom\)/);
  assert.match(source,/windowMotionFrame\(progress,opening,distance,rect\.height,docked\)/);
  assert.match(source,/win\.requestAnimationFrame\(tick\)/);
  const fade=source.slice(source.indexOf('function playMobileMotion('),source.indexOf('const motionSupported='));
  assert.match(fade,/beforeTranslate=target\.style\.getPropertyValue\('translate'\)/);
  assert.match(fade,/target\.style\.setProperty\('translate',`0 \$\{frame\.offset\}px`,'important'\)/);
  assert.match(fade,/const frame=windowMotionFrame\(progress,opening,distance,rect\.height,docked\)/);
  assert.match(fade,/if\(docked\)target\.style\.setProperty\('clip-path'/);
  assert.doesNotMatch(fade,/clipPath:/);
});

test('mobile slide closes original panel only after transition, restores inline state, and cancels safely',()=>{
  assert.match(source,/if\(complete&&!opening&&typeof afterClose==='function'\)afterClose\(\)/);
  assert.match(source,/const beforeOpacity=target\.style\.getPropertyValue\('opacity'\)/);
  assert.match(source,/if\(frame\)win\.cancelAnimationFrame\?\.\(frame\)/);
  assert.match(source,/if\(activeAnimation\.get\(target\)===record\)activeAnimation\.delete\(target\)/);
  assert.match(source,/const ignoreRepeatTab=/);
});

test('facility popup keeps entrance and map X closes without transport route interception',()=>{
  assert.match(source,/if\(!phone\(\)\|\|!target\?\.style\|\|reduced\(\)\)return false/);
  assert.match(source,/if\(phone\(\)\)\{\s*if\(card&&newest\.classList\.contains\('dj-place-detail-popup'\)&&!activeAnimation\.has\(card\)\)playMobileMotion\(card,true\);\s*return;/);
  assert.match(source,/\.dj-place-header-close/);
  assert.match(source,/\.dj-place-route-button/);
  assert.match(source,/'#transport-close'/);
  assert.doesNotMatch(source,/dispatchLocalClick\(button,win\)/);
});
