import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syncOnboardingStatusSurface,ONBOARDING_STATUS_TONE} from '../src/onboarding-status-surface.js';

const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('standalone iPhone onboarding reuses the normal status color',()=>{
  const pwa=read('mobile-pwa-status-tone-v793.js');
  assert.match(pwa,/const baselineColor=\(\)=>root\.dataset\.theme==='dark'\?'#22282e':'#edf3ef'/);
  assert.ok(pwa.includes('(startup||onboarding)?baselineColor()'));
  assert.ok(!pwa.includes("onboarding?(theme==='dark'?'#22282e':'#f5faf7')"));
  assert.ok(pwa.includes("themeMeta.setAttribute('content',color)"));
  assert.ok(pwa.includes("sample.style.setProperty('background-color',color,'important')"));
});

test('onboarding uses status color across whole page but retains its illustration',()=>{
  const css=read('v860-onboarding.css');
  assert.ok(css.includes('Onboarding light PWA seamless background contract'));
  assert.ok(css.includes('#dj860-onboarding:not([hidden]) > .dj860-card'));
  assert.ok(css.includes('.dj860-head,.dj860-content,.dj860-footer'));
  assert.ok(css.includes('background:#edf3ef!important'));
  assert.ok(css.includes('background-color:#edf3ef!important'));
  const appended=css.slice(css.indexOf('/* Onboarding light PWA seamless background contract'));
  assert.ok(!appended.includes('.dj860-screen-image'),'do not override supplied banners');
  assert.ok(!appended.includes('.dj860-visual-pane'),'do not recolor illustrated panel');
});

test('onboarding phone canvas is painted inline-important before first visible frame',()=>{
  const createNode=()=>{
    const properties=new Map();
    return {
      properties,
      style:{
        setProperty(key,value,priority){properties.set(key,{value,priority});},
        removeProperty(key){properties.delete(key);}
      }
    };
  };
  const outer=createNode(),card=createNode(),head=createNode(),content=createNode(),footer=createNode();
  const nodes=[card,head,content,footer];
  const overlay={...outer,querySelector(selector){
    if(selector.includes('>.dj860-card'))return card;
    if(selector.endsWith('.dj860-head'))return head;
    if(selector.endsWith('.dj860-content'))return content;
    if(selector.endsWith('.dj860-footer'))return footer;
    return null;
  }};
  // Resolve child controls by exact role; neither artwork nor buttons are targets.
  overlay.querySelector=selector=>selector.endsWith('.dj860-head')?head:selector.endsWith('.dj860-content')?content:selector.endsWith('.dj860-footer')?footer:selector.endsWith('.dj860-card')?card:null;
  const win={matchMedia:()=>({matches:true})},doc={documentElement:{dataset:{theme:'light'}}};
  const app={dataset:{theme:'light'}};
  assert.equal(syncOnboardingStatusSurface({app,doc,win,overlay}),ONBOARDING_STATUS_TONE.light);
  for(const node of [overlay, ...nodes]){
    assert.deepEqual(node.properties.get('background'),{value:'#edf3ef',priority:'important'});
    assert.deepEqual(node.properties.get('background-color'),{value:'#edf3ef',priority:'important'});
  }
  app.dataset.theme='dark';
  assert.equal(syncOnboardingStatusSurface({app,doc,win,overlay}),ONBOARDING_STATUS_TONE.dark);
  for(const node of [overlay,...nodes]){
    assert.deepEqual(node.properties.get('background'),{value:'#22282e',priority:'important'});
  }
  assert.equal(syncOnboardingStatusSurface({app,doc,win:{matchMedia:()=>({matches:false})},overlay}),null);
  for(const node of [overlay,...nodes])assert.equal(node.properties.has('background'),false);
});

test('onboarding sets background before hidden=false and tracks theme changes',()=>{
  const source=read('v860-onboarding.js');
  assert.ok(source.includes('surfaceObserver.observe(app,'));
  assert.ok(source.includes("attributeFilter:['data-theme']"));
  assert.match(source,/syncSurface\(\);\s*overlay\.hidden=false/);
});
