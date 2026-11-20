import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('onboarding exit owns opacity even when old CSS marks a panel opaque important',()=>{
  const code=read('src/v860-onboarding.js');
  assert.match(code,/visualPane\.style\.setProperty\('opacity','0','important'\)/);
  assert.match(code,/copy\.style\.setProperty\('opacity','0','important'\)/);
  assert.match(code,/render\(target,direction\);\s*clearSlideOpacity\(\)/);
  assert.match(code,/if\(reduced\)\{[^}]*clearSlideOpacity\(\)/);
  assert.match(code,/swapEpoch\+\+/);
});

test('nearby shared swipe handles visible header, never a second drag owner',()=>{
  const code=read('src/dj-v8212-sheet-controller.js');
  assert.match(code,/const inputSurface=id==='ped-tools-panel'\?\(handleNodes\[0\]\|\|panel\):panel/);
  assert.match(code,/bindHeaderDragInput\(inputSurface,win,\{down,move,up,cancel\}\)/);
  assert.match(code,/if\(id==='ped-tools-panel'&&!g\.dragging\)/);
  assert.match(code,/setMobileSheetExpanded\(panel,!panel\.classList\.contains\('dj871-sheet-expanded'\),doc,win\)/);
  const ped=read('src/pedestrian-tools.js');
  assert(!ped.includes('installNearbySheetDrag'));
});
