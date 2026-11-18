import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('floating night panel keeps original range/filters and no duplicated control IDs',()=>{
  const html=read('index.html');
  for(const id of ['night-visibility-controls','night-visibility-radius','night-visibility-stats',
    'night-visibility-float','night-visibility-float-content','night-visibility-float-slot',
    'night-visibility-float-collapse','night-visibility-float-stop']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  const script=read('src/night-visibility-map.js');
  assert.match(script,/floatingSlot\?\.append\?\.\(controls\)/);
  assert.match(script,/originalControlsParent\?\.append\?\.\(controls\)/);
  assert.match(script,/statsLine\('골목·차도 조명 미도달 추정'/);
  assert.match(script,/statsLine\('보행로 조명 미도달 추정'/);
  assert.match(script,/totalPoles/);
  assert.match(script,/statsLine\('간선도로 제외'/);
});
test('floating report is scrollable, responsive, and accessible to mobile',()=>{
  const css=read('src/night-visibility-panel.css');
  const main=read('src/main.js');
  assert.match(main,/import '\.\/night-visibility-panel\.css'/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/#night-visibility-float-content\[hidden\]\{display:none!important/);
  assert.match(css,/#app\[data-tab\]:not/);
});
