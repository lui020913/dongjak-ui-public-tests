import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {communityVisualBounds,communityVisibleViewport} from '../src/community-composer-portal.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('visible iOS keyboard viewport cannot reflow the page container',()=>{
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:844,visualTop:0}),{top:0,height:844});
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:510,visualTop:0}),{top:0,height:510});
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:460,visualTop:25}),{top:25,height:460});
  assert.deepEqual(communityVisualBounds({layoutHeight:844,visualHeight:900,visualTop:25}),{top:25,height:819});
  assert.deepEqual(communityVisibleViewport({innerHeight:844,visualViewport:{offsetTop:0,height:510}}),{top:0,height:510,keyboardInset:334});
});
test('entire composer layout is rebuilt as a body-portal with three distinct rows',()=>{
  const js=read('src/community-composer-portal.js');
  const css=read('src/community-composer-portal.css');
  const main=read('src/main.js');
  assert.match(js,/doc\.body\.append\(root\)/);
  assert.match(js,/root\.append\(form\)/);
  assert.match(js,/form\.replaceChildren\(header,scroll,footer\)/);
  assert.match(js,/doc\.body\.dataset\.djCommunityEditor='open'/);
  assert.match(js,/root\.dataset\.keyboard=/);
  assert.match(js,/restoreDock\(\)/);
  assert.match(js,/\['flex','1 1 0%'\]/);
  assert.match(js,/\['height','0px'\]/);
  assert.match(js,/scroll\.style\.setProperty\(property,value,'important'\)/);
  assert.match(css,/#dj-community-editor-portal #community-form\s*\{[\s\S]*?display:flex!important;[\s\S]*?flex-direction:column!important/);
  assert.match(css,/#dj-community-editor-portal #community-form>\.dj-compose-scroll\s*\{[\s\S]*?flex:1 1 0%!important;[\s\S]*?height:0!important/);
  assert.match(css,/#dj-community-editor-portal #community-form>\.dj-compose-scroll\s*\{[\s\S]*?overflow-y:auto!important/);
  assert.match(css,/#dj-community-editor-portal #community-form>\.dj-compose-footer\s*\{/);
  assert.match(css,/#dj-community-editor-portal #community-form>\.community-form-top\s*\{/);
  assert.doesNotMatch(css,/#dj-community-editor-portal\[data-keyboard="open"\] #community-form > \.community-form-top/);
  assert.match(main,/communityComposerPortal\.open\(\{mapOrigin:communityComposerOrigin==='map'\}\)/);
  assert.match(main,/communityForm\.addEventListener\('submit',async\(event\)=>/);
});
test('map-origin report, photo and cloud submission logic remain functional',()=>{
  const main=read('src/main.js');
  const html=read('index.html');
  assert.match(main,/else navigate\('participate'\);\s*communityComposerOrigin=origin/);
  assert.match(main,/communityComposerPortal\?\.close\(\)/);
  for(const name of ['community-map-pick','community-photo-input','community-share-publicly','community-title','community-text'])assert.ok(html.includes('id="'+name+'"'));
  const coord=read('src/public-ui-mobile-surface-coordinator.js');
  assert.match(coord,/const independentComposerOpen=/);
  assert.match(coord,/const focused=Boolean\(!independentComposerOpen&&form/);
});
