import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('protected overlay script recognizes the live weather-enabled shared-sheet anchors',()=>{
  const src=read('app/src/dj-v8212-sheet-controller.js');
  const patcher=read('scripts/apply-mobile-17-followup.mjs');
  const old="'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','ped-tools-panel'].includes(id)";
  const weather="'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','ped-tools-panel','dj854-weather-sheet'].includes(id)";
  const chosen=[old,weather].find(anchor=>src.split(anchor).length===3);
  assert.equal(chosen,weather,'two live expand actions match weather-enabled contract');
  assert.match(patcher,/\[oldExpandable,weatherExpandable\]\.find\(/);
  assert.match(patcher,/controllerSource\.replaceAll\(matchingAnchor,/);
});
