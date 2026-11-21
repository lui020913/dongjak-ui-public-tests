import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/v835-news-style-drawer.css');
const ids=['route-panel','participation-panel','news-panel','mine-panel','admin-dong-picker'];

test('new shared header replaces legacy header classes in all five floating pages',()=>{
 for(const id of ids){
  const start=html.indexOf(`id="${id}"`);
  assert.ok(start>0,id);
  const end=html.indexOf('</header>',start);
  const header=html.slice(start,end);
  assert.match(header,/<header class="dj-sheet-chrome(?: dj-primary-fullscreen-header)?"/);
  assert.match(header,/<span class="dj-sheet-chrome-grip"/);
  assert.match(header,/<div class="dj-sheet-chrome-title"/);
  assert.match(header,/<h2>/);
  assert.match(header,/<button type="button" class="dj-sheet-chrome-close page-dismiss"/);
  assert.doesNotMatch(header,/class="page-heading|class="admin-dong-heading|dj-page-title-icon/);
 }
});
test('news baseline: fixed-size icon, accessible X and identical drag affordance',()=>{
 for(const id of ids){
  const start=html.indexOf(`id="${id}"`);
  const header=html.slice(start,html.indexOf('</header>',start));
  assert.match(header,/<svg class="dj-sheet-chrome-icon" width="24" height="24"/);
  assert.match(header,/<button[^>]+aria-label="[^"]+"/);
  assert.match(header,/<svg width="24" height="24"/);
 }
 assert.match(css,/max-height:min\(50dvh/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/position:sticky!important/);
 assert.match(css,/justify-content:space-between!important/);
});
test('existing controllers target new shared header without replacing native panel functions',()=>{
 assert.match(read('src/dj-v8212-sheet-controller.js'),/\.dj836-edge-drag/);
 assert.match(read('src/dj-v8212-sheet-controller.js'),/\['admin-dong-picker','\.dj836-edge-drag'/);
 assert.match(read('src/dj-v8212-sheet-controller.js'),/\['transport-sheet','\.dj856-transport-edge-drag'/);
 assert.match(read('src/dj-v8212-sheet-controller.js'),/\['detail-sheet','\.dj856-detail-edge-drag'/);
 assert.match(read('src/v834-my-info.js'),/\.dj-sheet-chrome, \.page-heading/);
 assert.match(read('src/v815-map-product.js'),/:scope > \.dj836-sheet-body/);
 assert.match(read('src/v815-map-product.js'),/mineBody\?\.appendChild\(myBox\)/);
 assert.match(html,/href="\/src\/v835-news-style-drawer.css"/);
});
