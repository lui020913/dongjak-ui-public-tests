import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8215 fix: night consent precedes theme transition capture splash',()=>{
  const src=read('src/v711-experience.js');
  const gate=src.slice(src.indexOf('const transitionClick=e=>'),src.indexOf("listen(doc,'click',transitionClick,true)"));
  assert.match(gate,/if\(target\.id!=='theme-toggle'\)return;/);
  assert.match(gate,/start\('theme'\)/);
  assert.doesNotMatch(gate,/start\(target\.id==='theme-toggle'\?'theme':'night'\)/);
  const night=read('src/v831-swipe-feature-toolbar.js');
  assert.ok(night.lastIndexOf('nightConfirm.hidden=false')>night.indexOf('function requestNight(e)'));
});
test('v8215 fix: My Info cards are inserted into real scroll body and constrained',()=>{
  const source=read('src/v815-map-product.js');
  assert.match(source,/:scope > \.dj836-sheet-body/);
  assert.match(source,/mineBody\?\.appendChild\(myBox\)/);
  assert.doesNotMatch(source,/\(mine\?\.querySelector\('\.dj-sheet-chrome/);
  const css=read('src/v834-my-info.css');
  assert.match(css,/\.dj834-records-container/);
  assert.match(css,/\.dj815-my-places/);
  assert.match(css,/max-width:100%;width:100%/);
});
test('v8215 fix: theme symbol has explicit 50% center and native glyph is circular',()=>{
 const css=read('src/v836-sheet-toolbar-controls.css');
 assert.match(css,/\.topbar #theme-toggle::after\{[\s\S]*?left:50%!important;top:50%!important/);
 assert.match(css,/transform:translate\(-50%,-50%\)!important/);
 assert.match(css,/#bottom-nav \.nav-tab\[data-tab="map"\] \.nav-icon\{[\s\S]*?border-radius:50%!important/);
 assert.match(css,/\.topbar > #dj-settings-mobile\{[\s\S]*?clip-path:circle\(50% at 50% 50%\)!important/);
 const html=read('index.html');
 assert.match(html,/nav-tab active" data-tab="map"[\s\S]*?<circle cx="12" cy="12" r="10"\/>/);
});
test('v8215 fix: shortcut width is measured and eliminates surplus right padding',()=>{
 const js=read('src/v831-swipe-feature-toolbar.js');
 assert.match(js,/ctx\.measureText\(label\)\.width/);
 assert.match(js,/pixels\+46/);
 assert.doesNotMatch(js,/pixels\+60/);
 const css=read('src/v834-toolbar-settings.css');
 assert.match(css,/padding:0 8px!important;gap:5px!important/);
});
