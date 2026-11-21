import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('independent primary page headers are not registered as drag or CSS grab surfaces',()=>{
  const html=read('index.html');
  const controller=read('src/dj-v8212-sheet-controller.js');
  const css=read('../frontend/production/mobile-next.css');
  for(const tab of ['route','participate','news','mine']){
    assert.match(html,new RegExp('<header class="dj-sheet-chrome dj-primary-fullscreen-header" data-dj-sheet-header="'+tab+'"'));
  }
  assert.match(controller,/panel\?\.classList\.contains\('page-panel'\)&&win\.matchMedia\('\(max-width:699px\)'\)\.matches\)continue/);
  assert.equal((css.match(/\.dj-sheet-chrome:not\(\.dj-primary-fullscreen-header\),\.admin-dong-heading/g)||[]).length,2);
  assert.match(read('src/mobile-primary-fullscreen.css'),/touch-action:auto!important/);
});
