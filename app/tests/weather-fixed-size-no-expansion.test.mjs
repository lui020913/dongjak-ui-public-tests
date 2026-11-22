import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('weather information card cannot expand by tapping or dragging its header',()=>{
  const owner=read('src/dj-v8212-sheet-controller.js');
  const weather=read('src/v854-weather-desktop.js');
  assert.doesNotMatch(owner,/\['dj854-weather-sheet','\.dj-weather-edge-drag'/);
  assert.doesNotMatch(owner,/id==='ped-tools-panel'\|\|id==='dj854-weather-sheet'/);
  assert.match(owner,/id==='ped-tools-panel'\&\&!g\.dragging/);
  assert.match(weather,/dataset\.djFixedSize='true'/);
  assert.doesNotMatch(weather,/class="dj-weather-edge-drag"/);
  assert.match(weather,/\.dj854-weather-close.*addEventListener\('click',close\)/);
});
