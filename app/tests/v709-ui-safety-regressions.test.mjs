import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileScalePosition} from '../src/map-scale-docking.js';
const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('night shortcut stays visible and provides active night-off action',()=>{
  const src=read('src/night-visibility-map.js');
  assert.match(src,/quickOff\.hidden=false;/);
  assert.match(src,/enabled\?'야간 시야 해제':'야간 시야'/);
  assert.match(src,/quickOff\.addEventListener\('click',\(\)=>\{void setMode\(!enabled\);\}\)/);
});

test('new overrides load after old floating CSS, preserving button and X centering',()=>{
  const main=read('src/main.js');
  const css=read('src/v709-control-fixes.css');
  assert.ok(main.indexOf("import './v709-control-fixes.css';")>main.indexOf("import './v708-floating-ux.css';"));
  for(const item of ['#map-tools-toggle','#night-visibility-quick-off','#map-safety-toggle',
    '#overview-sheet-close','#news-close-to-map','#night-visibility-float-stop'])assert.ok(css.includes(item),item);
  assert.match(css,/translate:-50% -50%/);
  assert.match(css,/night-visibility-float:not\(\.dj-float-user-positioned\)/);
  assert.match(css,/#app\[data-theme="dark"\]/);
});

test('mobile scale is located above active floating surfaces or suppressed when no room',()=>{
  assert.deepEqual(mobileScalePosition({mapTop:0,boundaryTop:680,headerBottom:80,scaleHeight:28,gap:12}),{top:640,visible:true});
  assert.deepEqual(mobileScalePosition({mapTop:0,boundaryTop:110,headerBottom:95,scaleHeight:28,gap:12}),{top:107,visible:false});
  const code=read('src/map-scale-docking.js');
  for(const value of ["'#bottom-nav'","'#overview-sheet:not([hidden])'","'#night-visibility-float:not([hidden])'", "dock.visible"])
    assert.ok(code.includes(value),value);
});
