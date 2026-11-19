import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWindowLifecycle } from '../src/window-lifecycle-state.js';
const src=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('onboarding controller owns native click before document-level sheet handlers',()=>{
  const code=src('v860-onboarding.js');
  assert.match(code,/overlay\.addEventListener\('click',onClick,true\)/);
  assert.doesNotMatch(code,/doc\.addEventListener\('click',onClick\)/);
  assert.ok(code.indexOf("overlay.addEventListener('click',onSwipeClickCapture,true)") <
    code.indexOf("overlay.addEventListener('click',onClick,true)"),
    'swipe-generated click must be suppressed before an action is handled');
});

test('shared controller does not double-dismiss onboarding Skip',()=>{
  const code=src('v806-unified-ui.js');
  assert.match(code,/if\(id==='dj860-onboarding'(?:\|\|[^\n]*)?\)return;/);
  assert.match(code,/if\(id==='dj860-onboarding'\|\|\(id==='map-gesture-guide'&&win\.matchMedia\?\.\('\(max-width:699px\)'\)\?\.matches\)\)return;/);
  assert.match(code,/dismiss:\(id,options\)=>lifecycle\.dismiss\(id,options\)/);
});

test('intentional onboarding open/close does not throttle the following map guide',()=>{
  let time=1000;
  const lifecycle=createWindowLifecycle({now:()=>time});
  assert.equal(lifecycle.requestOpen('dj860-onboarding',{explicit:true}),true);
  lifecycle.dismiss('dj860-onboarding',{global:false});
  assert.equal(lifecycle.requestOpen('map-gesture-guide',{origin:'automatic'}),true);
  const code=src('v860-onboarding.js');
  assert.match(code,/DongjakWindowLifecycle\?\.requestOpen\?\.\('dj860-onboarding'\)/);
  assert.match(code,/DongjakWindowLifecycle\?\.dismiss\?\.\('dj860-onboarding',\{global:false\}\)/);
});

test('modal stacks above other application sheets with original layout intact',()=>{
  const code=src('v860-onboarding.css');
  assert.match(code,/z-index:24000!important/);
  assert.match(code,/grid-template-columns:minmax\(0,1\.02fr\) minmax\(0,\.98fr\)/);
  assert.match(code,/animation:dj860-card-in/);
});
