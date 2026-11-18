import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('src/v831-swipe-feature-toolbar.js');
const css=read('src/v832-priority-feature-toolbar.css');
const html=read('index.html');

test('important map shortcuts stay on the rail and auxiliary items move to More',()=>{
  for(const key of ['live-metro','live-bus','safe-accidents','safe-cctv','safe-crosswalk','safe-slope','safe-zones','safe-aed'])
    assert.ok(js.includes(`'${key}'`));
  assert.match(js,/FEATURES\.filter\(f=>f\[0\]!=='map-dong'&&!MORE_ONLY_KEYS\.has\(f\[0\]\)&&isPrimary\(f\[0\]\)\)/);
  assert.match(js,/FEATURES\.filter\(f=>!used\.has\(f\[0\]\)&&test\(f\[0\]\)\)/);
  assert.match(js,/panel\.querySelector\('\.dj-mobile-utilities-body'\)\|\|panel\)\.appendChild\(extra\)/);
  assert.match(js,/const more=find\('#dj-v794-more'\)/);
});
test('caption expands with same-button collapse, and explanation sheet is linked',()=>{
  assert.match(js,/const same=current\?\.\[0\]===feature\[0\]/);
  assert.match(js,/if\(same\|\|\(alreadyOn&&button/);
  assert.match(js,/if\(!quickToggle&&feature\[0\]!=='map-dong'\)openSheet\(feature,button,valid\)/);
  assert.match(js,/button\.classList\.add\('dj832-expanded'\)/);
  assert.match(js,/button\.setAttribute\('aria-expanded','true'\)/);
  assert.match(js,/sheet\.querySelector\('\.dj832-sheet-close'\)\.addEventListener\('click',closeSheet\)/);
  assert.match(css,/\.dj832-feature\.dj832-expanded/);
  assert.match(css,/transition:flex-basis/);
});
test('native map/safety/night/weather round controls keep their actions; font moves to More',()=>{
  for(const id of ['dj-v794-map','dj-v794-safety','dj-v794-night','dj800-type-trigger','dj-v794-weather']) assert.ok(js.includes(id));
  assert.match(js,/scroller\.addEventListener\('click',nativeClicked\)/);
  assert.match(js,/native\.classList\.add\('dj832-expanded'\)/);
  assert.match(css,/\.dj832-native\.dj832-expanded::after/);
});
test('sheet is displayed above bottom navigation, and drag-down closes it',()=>{
  assert.match(css,/#dj832-data-sheet/);
  assert.match(css,/--dj832-bottom,var\(--dj829-panel-bottom,90px\)/);
  assert.match(css,/touch-action:none!important/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/if\(delta>68\)closeSheet\(\)/);
  assert.match(js,/sheet\.hidden=true/);
  assert.match(js,/activeButton\.classList\.remove\('dj832-expanded'\)/);
});
test('release and logo styling are isolated from map service code',()=>{
  assert.match(html,/v832-priority-feature-toolbar\.css/);
  assert.ok(html.indexOf('v832-priority-feature-toolbar.css')>html.indexOf('v831-swipe-feature-toolbar.css'));
  assert.match(css,/topbar > #dj-settings-mobile img/);
  assert.match(css,/scale\(1\.13\)/);
  assert.doesNotMatch(js,/fetch\(/);
});
