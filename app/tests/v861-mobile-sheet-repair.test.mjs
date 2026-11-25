import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('More opens as a bottom floating sheet instead of the legacy top-right dropdown',()=>{
  const css=read('src/v861-mobile-sheet-repair.css');
  const html=read('index.html');
  assert.match(html,/src="\/src\/v861-mobile-sheet-repair\.js"/);
  assert.match(css,/bottom:calc\(var\(--dj829-panel-bottom,86px\) \+ 8px\)!important/);
  assert.match(css,/height:min\(72dvh,620px\)!important/);
  assert.match(css,/max-height:min\(72dvh,620px,calc\(100dvh/);
  assert.match(css,/dj861-more-enter/);
  assert.match(css,/dj-mobile-utilities-body/);
  assert.match(css,/overflow-y:auto!important/);
});

test('More close runs its original handler instead of deferred redispatch',()=>{
  const chrome=read('src/mobile-chrome-v790.js');
  const coordinator=read('src/v806-unified-ui.js');
  assert.match(coordinator,/on\(doc,'click',nativeDismiss,true\)/);
  assert.doesNotMatch(coordinator,/dispatchLocalClick\(button,win\)/);
  assert.match(chrome,/function hideMore\(\{immediate=false\}\=\{\}\)/);
  assert.match(chrome,/target\.setAttribute\('aria-hidden','true'\)/);
  assert.match(chrome,/target\.classList\.remove\('dj852-panel-fade-in','dj852-panel-fade-out'\)/);
  assert.match(chrome,/event\.stopPropagation\(\);hideMore\(\)/);
});

test('More quick actions close synchronously before opening their destination',()=>{
  const chrome=read('src/mobile-chrome-v790.js');
  assert.doesNotMatch(chrome,/dj-mobile-history[\s\S]*?hideMore\(\{immediate:true\}\)[\s\S]*?version-history-trigger/);
  assert.match(chrome,/dj-mobile-settings[\s\S]*?hideMore\(\{immediate:true\}\)[\s\S]*?dj:open-map-settings/);
});

test('Mobile TIP is compact and right-aligned with a reserved scale-bar lane',()=>{
  const css=read('src/v861-mobile-sheet-repair.css');
  assert.match(css,/right:12px!important/);
  assert.match(css,/width:min\(248px,calc\(100vw - 150px\)\)!important/);
  assert.match(css,/left:auto!important/);
  assert.match(css,/pointer-events:auto!important/);
});

test('First-use map guide is centered and constrained to the visual screen',()=>{
  const css=read('src/v861-mobile-sheet-repair.css');
  assert.match(css,/map-gesture-guide\.dj-guide-centered:not\(\[hidden\]\)/);
  assert.match(css,/left:50%!important/);
  assert.match(css,/top:50%!important/);
  assert.match(css,/transform:translate\(-50%,-50%\)!important/);
  assert.match(css,/max-height:calc\(100dvh - env\(safe-area-inset-top/);
});
