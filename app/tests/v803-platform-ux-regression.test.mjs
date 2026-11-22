import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/v803-ui-consistency.css');
const motion=read('src/v803-ui-consistency.js');
const boot=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
function firstPaint(saved='dark',pending=null){
  const meta={content:'#f3f7f5'};
  const storage={setItem(){},getItem(){return saved;}};
  const session={getItem:()=>pending&&JSON.stringify(pending),removeItem(){}};
  const document={documentElement:{dataset:{},classList:{toggle(){}}},getElementById(id){return id==='dj-browser-theme-color'?meta:null;}};
  vm.runInNewContext(boot,{document,localStorage:storage,sessionStorage:session,Date,Number},{timeout:1000});
  return {theme:document.documentElement.dataset.theme,meta:meta.content};
}
test('cold start always defaults to light and ignores stale night tokens',()=>{
  assert.deepEqual(firstPaint('dark'),{theme:'light',meta:'#f3f7f5'});
  assert.deepEqual(firstPaint('light'),{theme:'light',meta:'#f3f7f5'});
  const pending={expires:Date.now()+5000,night:null};
  assert.deepEqual(firstPaint('dark',pending),{theme:'light',meta:'#f3f7f5'});
});
test('new release follows v8.0.2 and preserves original sources',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[1].version,'v8.0.2');
  assert.equal(RENUMBERED_VERSION_HISTORY.length,136);
  assert.match(read('index.html'),/v803-ui-consistency.css/);
});
test('mobile sheets animate on a visible/open transition with a clip-path and respect reduced motion',()=>{
  assert.match(motion,/const now=showing\(n\)/);
  assert.match(motion,/if\(now&&!states\.get\(id\)\)/);
  assert.match(motion,/clipPath:'inset\(25%/);
  assert.match(motion,/prefers-reduced-motion: reduce/);
  assert.match(motion,/\['map-advanced-controls','map-controls-open'\]/);
  assert.match(motion,/\['map-safety-controls','map-safety-open'\]/);
});
test('desktop header and rail use consistent sizing and settings remain interactive',()=>{
  assert.match(css,/height:56px!important;min-height:56px!important;max-height:56px!important/);
  assert.match(css,/width:60px!important;min-width:60px!important;max-width:60px!important/);
  assert.match(css,/grid-template-columns:25px 76px!important/);
  assert.match(css,/border:0!important;border-radius:16px!important/);
  const preferences=read('src/v7120-settings.js');
  assert.doesNotMatch(preferences,/prefs\.text=b\.dataset\.size;apply\(\)/);
  assert.match(read('src/v834-my-info.js'),/data-dj885-type="scale"/);
  assert.match(preferences,/prefs\.motion=event\.target\.checked/);
  assert.match(preferences,/prefs\.weather=event\.target\.checked/);
  assert.match(preferences,/prefs\.tools=event\.target\.checked/);
});
test('app information and help contain requested text, safety drawer does not expose readability',()=>{
  assert.match(read('src/v7120-settings.js'),/동작구 아이디어 리그 안전팀 시범 운영 프로그램/);
  assert.match(html,/Safari에서 동작하는 안전지도를 엽니다/);
  assert.equal((html.match(/<div><b>[123]<\/b>/g)||[]).length,3);
  assert.match(css,/#map-safety-controls #dj-type-settings\{display:none!important;/);
  assert.match(css,/#map-gesture-guide \.dj803-ios-install-help/);
  assert.match(css,/#dj-map-settings :is\(\.dj-map-settings-head h2/);
});
test('dark palette and close glyphs have dedicated mobile-safe rules',()=>{
  assert.match(css,/#app#app\[data-theme="dark"\]/);
  assert.match(css,/rotate:45deg!important/);
  assert.match(css,/rotate:-45deg!important/);
  assert.match(css,/background:rgba\(17,40,43,\.92\)!important/);
  assert.match(css,/visibility:hidden!important;opacity:0!important;pointer-events:none!important/);
});
