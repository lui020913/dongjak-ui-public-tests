import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispatchLocalClick} from '../src/v865-close-dispatch.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('close action is dispatched to the button without bubbling into the map',()=>{
  class FakeEvent {
    constructor(type,init={}){this.type=type;Object.assign(this,init);}
  }
  const dispatched=[];
  const button={isConnected:true,dispatchEvent(event){dispatched.push(event);return true;}};
  assert.equal(dispatchLocalClick(button,{Event:FakeEvent}),true);
  assert.equal(dispatched.length,1);
  assert.equal(dispatched[0].type,'click');
  assert.equal(dispatched[0].bubbles,false);
  assert.equal(dispatched[0].cancelable,true);
  assert.equal(dispatched[0].composed,false);
});

test('unified close never replays a user X via fake bubbling or non-bubbling click',()=>{
  const source=read('src/v806-unified-ui.js');
  assert.match(source,/const nativeDismiss=e=>/);
  assert.match(source,/on\(doc,'click',nativeDismiss,true\)/);
  assert.doesNotMatch(source,/button\.click\(\)/);
  assert.doesNotMatch(source,/dispatchLocalClick\(button,win\)/);
  assert.match(source,/lifecycle\.dismiss\(id\)/);
});

test('closing a registered-place detail leaves the map unobstructed',()=>{
  const main=read('src/main.js');
  const close=main.slice(main.indexOf('function closeDetailToMap('),main.indexOf('function clearPending()'));
  assert.match(close,/detail\.hidden=true;editor\.hidden=true;overview\.hidden=true/);
  assert.doesNotMatch(close,/showOverview\(/);
  assert.match(main,/getElementById\('close-detail'\)\.addEventListener\('click',closeDetailToMap\)/);
  assert.match(main,/getElementById\('back-to-map'\)\.addEventListener\('click',closeDetailToMap\)/);
});

test('closing an auxiliary page returns to the map without reopening the overview sheet',()=>{
  const main=read('src/main.js');
  assert.match(main,/function navigate\(tab,\{suppressOverview=false\}=\{\}\)/);
  assert.match(main,/if\(suppressOverview\)\{\s*overview\.hidden=true;\s*overviewExplicitOpen=false;/);
  assert.match(main,/for\(const button of document\.querySelectorAll\('\[data-close-page\]'\)\)\{[\s\S]*?const finish=\(\)=>navigate\('map',\{suppressOverview:true\}\);if\(panel&&window\.DongjakWindowMotion\)window\.DongjakWindowMotion\.close\(panel,finish\);else finish\(\);/);
  assert.match(main,/news-close-to-map[\s\S]*?navigate\('map',\{suppressOverview:true\}\)/);
});

test('canceling a new point registration does not call the overview-opening path twice',()=>{
  const main=read('src/main.js');
  const handler=main.slice(main.indexOf("document.getElementById('cancel-add').addEventListener"),main.indexOf("document.getElementById('edit-point').addEventListener"));
  assert.match(handler,/setAddMode\(false,\{restoreOverview:false\}\)/);
  assert.match(handler,/closeDetailToMap\(\)/);
  assert.doesNotMatch(handler,/showOverview\(/);
});

test('pedestrian utility X discards the previous overview restore marker',()=>{
  const source=read('src/pedestrian-tools.js');
  assert.match(source,/close\?\.addEventListener\('click',\(\)=>\{[\s\S]*?panel\.hidden=true;seq\+\+;[\s\S]*?delete overview\.dataset\.pedToolsHidden;/);
});

test('swipe-dismiss and home-reset close actions also use non-bubbling dispatch',()=>{
  assert.match(read('src/dj-v8212-sheet-controller.js'),/dispatchLocalClick\(btn,win\)/);
  const home=read('src/v833-home-reset.js');
  assert.match(home,/dispatchLocalClick\(close,win\)/);
  assert.match(home,/dispatchLocalClick\(node,win\)/);
  assert.match(home,/function closeMapWindows\(doc=document,win=doc\.defaultView\|\|globalThis\.window\)/);
});
