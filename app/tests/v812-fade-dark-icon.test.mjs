import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url));
for(const size of [180,192,512,1024]){
  test(`Light icon ${size} is a valid PNG and retired dark icon is absent`,()=>{
    const b=read(`public/icons/dongjak-light-${size}.png`);
    assert.deepEqual([...b.subarray(1,4)],[80,78,71]);
    assert.equal(b.readUInt32BE(16),size);
    assert.equal(b.readUInt32BE(20),size);
    assert.equal(existsSync(new URL(`../public/icons/dongjak-dark-${size}.png`,import.meta.url)),false);
  });
}
test('Shared slide UI with preserved Reduce Motion option',()=>{
  const settings=read('src/v7120-settings.js').toString();
  const motion=read('src/v806-unified-ui.js').toString();
  const css=read('src/v811-mobile-experience.css').toString();
  assert.match(settings,/app\.dataset\.djMotionStyle='soft'/);
  assert.doesNotMatch(settings,/dj-settings-motion-style/);
  assert.match(settings,/id="dj-settings-motion"/);
  assert.match(motion,/const slideDuration=opening\?WINDOW_MOTION\.open:WINDOW_MOTION\.close/);
  assert.match(motion,/windowMotionFrame\(progress,opening,distance,rect\.height,docked\)/);
  assert.doesNotMatch(motion,/dj810-mobile-sheet-open/);
  assert.match(css,/@keyframes dj811-mobile-soft-open/);
  assert.match(css,/gap:2px!important/);
});
