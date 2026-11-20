import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('nearby full-header browser mouse swipe is capture-safe and leaves the existing animation owner intact',()=>{
  const script=readFileSync(new URL('../src/pedestrian-tools.js',import.meta.url),'utf8');
  const owner=readFileSync(new URL('../src/dj-v8212-sheet-controller.js',import.meta.url),'utf8');
  assert.match(script,/document\.addEventListener\('mousedown',onNearbyMouseDown,true\)/);
  assert.match(script,/window\.addEventListener\('mouseup',onNearbyMouseUp,true\)/);
  assert.match(script,/nearbyHeader\.getBoundingClientRect\(\)/);
  assert.match(script,/if\(dy>-42\|\|Math\.abs\(dx\)>Math\.abs\(dy\)\*\.8\)return/);
  assert.match(script,/if\(!panel\.hidden&&!panel\.classList\.contains\('dj871-sheet-expanded'\)\)\s*setMobileSheetExpanded\(panel,true,document,window\)/);
  assert.match(script,/document\.removeEventListener\('mousedown',onNearbyMouseDown,true\)/);
  assert.match(script,/window\.removeEventListener\('mouseup',onNearbyMouseUp,true\)/);
  assert.match(owner,/setMobileSheetExpanded\(panel,!panel\.classList\.contains\('dj871-sheet-expanded'\),doc,win\)/);
  assert(!script.includes('installNearbySheetDrag'));
});
