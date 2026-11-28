import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const at=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const html=at('index.html');
const css=at('src/mobile-ui-baseline.css');
const main=at('src/main.js');
test('overview uses a short title and only one close control',()=>{
  const panel=html.match(/<section id="overview-sheet"[\s\S]*?<\/section>/)?.[0]||'';
  assert.match(panel,/<h1>안전정보<\/h1>/);
  assert.equal((panel.match(/id="overview-sheet-close"/g)||[]).length,1);
  assert.doesNotMatch(panel,/우리 동네 안전정보 살펴보기/);
});
test('public overview still has a single visibility owner after night scene retirement',()=>{
  assert.doesNotMatch(main,/exclusiveNightPanelObserver/);
  assert.match(main,/safetyOverviewObserver\.observe\(overview/);
});
test('single X glyph and consistent panel controls',()=>{
  assert.match(css,/::after\s*\{\s*content:none!important;display:none!important;/);
  assert.match(css,/::before\s*\{[\s\S]*?linear-gradient\(45deg/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css,/width:36px!important;min-width:36px!important/);
});
test('mobile safe-area and shared card max width are preserved',()=>{
  assert.match(html,/viewport-fit=cover/);
  assert.match(css,/top:calc\(3px \+ env\(safe-area-inset-top\)\)/);
  assert.match(css,/width:calc\(100% - 24px\)!important/);
});
