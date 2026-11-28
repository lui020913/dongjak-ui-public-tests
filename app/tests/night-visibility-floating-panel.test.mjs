import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('retired floating night panel has no live control IDs',()=>{
  const html=read('index.html');
  for(const id of ['night-visibility-controls','night-visibility-radius','night-visibility-stats',
    'night-visibility-float','night-visibility-float-content','night-visibility-float-slot',
    'night-visibility-float-collapse','night-visibility-float-stop']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,0,id);
  }
});
test('retired floating report stylesheet is not imported or present',()=>{
  const main=read('src/main.js');
  assert.doesNotMatch(main,/import '\.\/night-visibility-panel\.css'/);
  assert.throws(()=>read('src/night-visibility-panel.css'),{code:'ENOENT'});
});
