import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');

test('mobile sheet motion slides from below while overriding legacy important styles',()=>{
  assert.match(source,/const duration=fadeOnly\?\(opening\?190:160\):\(opening\?340:250\)/);
  assert.match(source,/target\.style\.setProperty\('opacity',String\(Math\.max\(0,Math\.min\(1,opacity\)\)\),'important'\)/);
  assert.match(source,/progress\*progress\*\(3-2\*progress\)/);
  assert.match(source,/win\.requestAnimationFrame\(tick\)/);
  const fade=source.slice(source.indexOf('function playMobileMotion('),source.indexOf('const motionSupported='));
  assert.match(fade,/beforeTranslate=target\.style\.getPropertyValue\('translate'\)/);
  assert.match(fade,/target\.style\.setProperty\('translate',`0 \$\{offset\}px`,'important'\)/);
  assert.match(fade,/const offset=opening\?entranceDistance\*\(1-eased\):\(docked\?entranceDistance:distance\)\*eased/);
  assert.match(fade,/if\(!fadeOnly&&docked\)target\.style\.setProperty\('clip-path'/);
  assert.doesNotMatch(fade,/clipPath:/);
});

test('mobile fade closes original panel only after transition, restores inline state, and cancels safely',()=>{
  assert.match(source,/if\(complete&&!opening&&typeof afterClose==='function'\)afterClose\(\)/);
  assert.match(source,/const beforeOpacity=target\.style\.getPropertyValue\('opacity'\)/);
  assert.match(source,/if\(frame\)win\.cancelAnimationFrame\?\.\(frame\)/);
  assert.match(source,/if\(activeAnimation\.get\(target\)===record\)activeAnimation\.delete\(target\)/);
  assert.match(source,/const ignoreRepeatTab=/);
});

test('facility popup keeps entrance and map X closes without transport route interception',()=>{
  assert.match(source,/if\(!phone\(\)\|\|!target\?\.style\|\|reduced\(\)\)return false/);
  assert.match(source,/phone\(\)\&\&playMobileMotion\(card,true\)/);
  assert.match(source,/\.dj-place-header-close/);
  assert.match(source,/\.dj-place-route-button/);
  assert.match(source,/'#transport-close'/);
  assert.doesNotMatch(source,/dispatchLocalClick\(button,win\)/);
});
