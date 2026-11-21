import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('route setup, community, news, and my info are mobile standalone tab pages',()=>{
 const html=read('index.html');
 for(const name of ['route','participate','news','mine']){
  assert.match(html,new RegExp('<main id="[^"]+-panel" class="page-panel dj-mobile-fullscreen-page" data-page="'+name+'"'));
 }
 const css=read('src/mobile-fullscreen-tabs.css');
 assert.match(css,/max-width:699px/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/z-index:7300!important/);
 assert.match(css,/overscroll-behavior-y:contain!important/);
 assert.match(css,/\.dj-sheet-chrome-grip,\.dj836-edge-drag/);
 assert.match(css,/\.topbar/);
 assert.match(read('src/main.js'),/import '\.\/mobile-fullscreen-tabs\.css'/);
});

test('standalone pages are excluded from bottom-sheet gesture/detent ownership',()=>{
 const drag=read('src/dj-v8212-sheet-controller.js');
 const coordinator=read('src/v877-mobile-settings.js');
 assert.match(drag,/panel\.classList\.contains\('dj-mobile-fullscreen-page'\)/);
 assert.match(coordinator,/filter\(panel=>panel&&!panel\.classList\.contains\('dj-mobile-fullscreen-page'\)\)/);
 const tabs=read('src/bottom-tab-navigation.js');
 assert.match(tabs,/if\(panel\?\.classList\.contains\('dj-mobile-fullscreen-page'\)\)/);
 const main=read('src/main.js');
 assert.match(main,/if\(active\?\.classList\.contains\('dj-mobile-fullscreen-page'\)/);
 assert.match(main,/const full=panel\?\.classList\.contains\('dj-mobile-fullscreen-page'\)/);
});
