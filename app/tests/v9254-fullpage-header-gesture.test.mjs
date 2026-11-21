import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('independent primary headers keep original markup but never own a sheet drag',()=>{
  const html=read('index.html');
  const controller=read('src/dj-v8212-sheet-controller.js');
  // Isolated release builds copy the canonical stylesheet into src/.
  // Source CI uses the production reference before that copy exists.
  const css=(()=>{try{return read('src/mobile-next.css')}catch(error){if(error?.code!=='ENOENT')throw error;return read('../frontend/production/mobile-next.css')}})();
  for(const tab of ['route','participate','news','mine']){
    assert.match(html,new RegExp('<header class="dj-sheet-chrome" data-dj-sheet-header="'+tab+'">'));
    assert(css.includes(':not([data-dj-sheet-header="'+tab+'"])'));
  }
  assert.match(controller,/panel\?\.classList\.contains\('page-panel'\)&&win\.matchMedia/);
  assert.equal((css.match(/\.dj-sheet-chrome:not\(\[data-dj-sheet-header="route"\]\)/g)||[]).length,2);
  assert.match(read('src/mobile-primary-fullscreen.css'),/touch-action:auto!important/);
});
