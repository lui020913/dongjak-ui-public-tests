import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const script=read('src/v831-swipe-feature-toolbar.js');
const styles=read('src/v831-swipe-feature-toolbar.css');
const html=read('index.html');
test('v8.2.11 mobile shortcuts are loaded after the existing toolbar and CSS',()=>{
  assert.ok(html.indexOf('v831-swipe-feature-toolbar.css')>html.indexOf('v829-mobile-layout-system.css'));
  assert.ok(html.indexOf('v831-swipe-feature-toolbar.js')>html.indexOf('mobile-toolbar-v794.js'));
  assert.match(styles,/@media\(max-width:699px\)/);
  assert.match(script,/\(max-width:1079px\)/);
});
test('v8.2.11 live bus and metro original toggles are preserved',()=>{
  for(const type of ['bus','metro']){
    assert.ok(html.includes(`data-live-vehicle="${type}"`));
    assert.ok(script.includes(`[data-live-vehicle="${type}"]`));
  }
  assert.match(script,/source\.click\(\)/);
  assert.doesNotMatch(script,/fetch\(/);
});
test('v8.2.11 more button is not inside the scrolling viewport',()=>{
  assert.match(script,/const more=find\('#dj-v794-more'\)/);
  assert.match(script,/row\.insertBefore\(scroller,more\)/);
  assert.match(script,/child!==scroller&&child!==more/);
  assert.match(styles,/#dj-v794-toolbar > #dj-v794-more/);
});
test('v8.2.11 blurred edge overlays follow horizontal overflow and preserve reduced motion',()=>{
  assert.match(script,/dataset\.fadeLeft=left\?'true':'false'/);
  assert.match(script,/dataset\.fadeRight=right\?'true':'false'/);
  assert.match(script,/positionEdgeBlur\(left,right\)/);
  assert.match(script,/edgeBlurLeft\.hidden=!left;edgeBlurRight\.hidden=!right/);
  assert.match(styles,/dj831-edge-blur-left/);
  assert.match(styles,/dj831-edge-blur-right/);
  assert.match(styles,/backdrop-filter:blur\(5px\)/);
  assert.match(styles,/prefers-reduced-motion:reduce/);
  assert.match(script,/setAttribute\('aria-label',label\)/);
  assert.match(script,/source\.getAttribute\('aria-pressed'\)/);
  assert.match(styles,/overflow-x:auto!important/);
});
