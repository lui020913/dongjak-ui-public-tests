import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {communityVisualBounds} from '../src/community-composer-portal.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('iOS keyboard viewport uses visual height and offset, not parent sheet or window scroll',()=>{
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:844,visualTop:0}),{top:0,height:844});
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:480,visualTop:0}),{top:0,height:480});
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:440,visualTop:42}),{top:42,height:440});
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:900,visualTop:100}),{top:100,height:744});
});

test('community editor is a body-level portal with one scrollport and retained submit handler',()=>{
  const js=read('src/community-composer-portal.js');
  const css=read('src/community-composer-portal.css');
  const main=read('src/main.js');
  assert.match(js,/doc\.body\.append\(portal\)/);
  assert.match(js,/portal\.append\(form\)/);
  assert.match(js,/anchor\.parentNode\.insertBefore\(form,anchor\.nextSibling\)/);
  assert.match(js,/visual\?\.offsetTop/);
  assert.match(js,/visual\?\.height/);
  assert.match(js,/sc\.scrollTop\+=field\.bottom-bounds\.bottom\+16/);
  assert.match(css,/#dj-community-editor-portal:not\(\[hidden\]\)/);
  assert.match(css,/#community-form > \.djNext-form-scroll\{/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/#community-form > \.dj-community-compose-footer\{/);
  assert.match(css,/order:2!important/);
  assert.match(css,/body\[data-dj-community-editor="open"\] #bottom-nav/);
  assert.match(main,/communityForm\.addEventListener\('submit',async\(event\)=>/);
  assert.match(main,/communityComposerPortal\.open\(\)/);
  assert.match(main,/communityComposerPortal\?\.close\(\)/);
});
