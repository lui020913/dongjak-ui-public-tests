import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldRenderScreenHaze,installDistantHaze} from '../src/distant-haze.js';

const css=readFileSync(new URL('../src/mobile-ui-v610.css',import.meta.url),'utf8');

test('mobile rendering never enables screen-space haze but desktop still can',()=>{
  assert.equal(shouldRenderScreenHaze(()=>({matches:true})),false);
  assert.equal(shouldRenderScreenHaze(()=>({matches:false})),true);
  assert.equal(shouldRenderScreenHaze(null),true);
});

test('mobile viewport suppresses both screen and native fog to keep the search edge clear',()=>{
  const oldWindow=globalThis.window;
  globalThis.window={matchMedia:()=>({matches:true}),addEventListener(){}};
  try{
    const classes=new Set();let paintCount=0;
    const map={getPitch:()=>57,getZoom:()=>15,getSky:()=>null,
      setSky:()=>{paintCount++},on(){},getContainer:()=>({classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)},style:{getPropertyValue:()=>'',setProperty(){}}})};
    const h=installDistantHaze({map,app:{dataset:{theme:'light'}}});
    assert.equal(h.isActive(),false); // mobile perspective must not add fog
    assert.equal(classes.has('dj-far-haze-active'),false);
    assert.equal(paintCount,0); // no native fog added to the initial mobile map
  }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

test('final mobile CSS disables old map overlays and makes header/search solid',()=>{
  assert.match(css,/v6\.1\.1 · 2026-11-10: iOS\/mobile upper-screen clarity hotfix/);
  const tail=css.split('upper-screen clarity hotfix')[1];
  assert.match(tail,/#app #map::before/);
  assert.match(tail,/#app #map::after/);
  assert.match(tail,/display:none!important/);
  assert.match(tail,/background-image:none!important/);
  assert.match(tail,/input::placeholder/);
  assert.match(tail,/border:1px solid #bdcdc6!important/);
});
