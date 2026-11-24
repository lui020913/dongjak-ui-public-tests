import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
test('stationary dialogs use shared compositor while geometry-sensitive windows retain their verified motion',()=>{
 assert.match(js,/if\(fade&&!scrim&&!isGuide\)/);
 assert.match(js,/compositor=startOpacityMotion\(\[target\]/);
 assert.match(js,/compositor\?\.cancel\(\)/);
 assert.match(js,/lockTransit=!opening&&target.id==='transport-sheet'/);
 assert.match(js,/windowMotionFrame\(progress,opening,distance,rect.height,docked\)/);
});
