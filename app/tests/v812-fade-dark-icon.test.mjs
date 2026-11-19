import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url));
for(const size of [180,192,512,1024]){
  test(`Dark icon ${size} PNG has transparent canvas corners and opaque center`,()=>{
    const b=read(`public/icons/dongjak-dark-${size}.png`);
    assert.deepEqual([...b.subarray(1,4)],[80,78,71]); // PNG
    // Raw PNG IHDR color type=6 (RGBA)
    assert.equal(b[25],6);
  });
}
test('Shared slide UI with preserved Reduce Motion option',()=>{
  const settings=read('src/v7120-settings.js').toString();
  const motion=read('src/v806-unified-ui.js').toString();
  const css=read('src/v811-mobile-experience.css').toString();
  assert.match(settings,/app\.dataset\.djMotionStyle='soft'/);
  assert.doesNotMatch(settings,/dj-settings-motion-style/);
  assert.match(settings,/id="dj-settings-motion"/);
  assert.match(motion,/const duration=opening\?WINDOW_MOTION\.open:WINDOW_MOTION\.close/);
  assert.match(motion,/windowMotionFrame\(progress,opening,distance,rect\.height,docked\)/);
  assert.doesNotMatch(motion,/dj810-mobile-sheet-open/);
  assert.match(css,/@keyframes dj811-mobile-soft-open/);
  assert.match(css,/gap:2px!important/);
});
