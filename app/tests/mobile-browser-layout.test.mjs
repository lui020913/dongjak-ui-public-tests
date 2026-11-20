import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {detectMobileRunMode,installMobileBrowserLayout} from '../src/mobile-browser-layout.js';

function mockedWindow({phone=true,pwa=false,iosStandalone=false,native=false,height=844,visible=844}={}){
  const handlers=new Map();
  return {
    innerWidth:phone?390:1440,innerHeight:height,
    navigator:{standalone:iosStandalone},
    Capacitor:native?{isNativePlatform:()=>true}:undefined,
    visualViewport:{height:visible,offsetTop:0,
      addEventListener(name,fn){handlers.set('vv:'+name,fn);},
      removeEventListener(name){handlers.delete('vv:'+name);}
    },
    matchMedia:(query)=>({
      matches:query==='(max-width: 699px)'?phone
        :query==='(display-mode: standalone)'?pwa:false,
      addEventListener(name,fn){handlers.set(query+':'+name,fn);},
      removeEventListener(name){handlers.delete(query+':'+name);}
    }),
    addEventListener(name,fn){handlers.set(name,fn);},
    removeEventListener(name){handlers.delete(name);},
    __fire(name){handlers.get(name)?.();}
  };
}
function mockedDocument(){
  const variables=new Map();const handlers=new Map();
  const root={dataset:{},style:{
    setProperty(k,v){variables.set(k,v);},
    removeProperty(k){variables.delete(k);},
    getPropertyValue(k){return variables.get(k)||'';}
  }};
  return {documentElement:root,activeElement:null,
    addEventListener(name,fn){handlers.set(name,fn);},
    removeEventListener(name){handlers.delete(name);},
    __fire(name){handlers.get(name)?.();}
  };
}
test('Browser profile is ONLY a phone tab, not desktop, standalone PWA or Capacitor native',()=>{
  assert.equal(detectMobileRunMode(mockedWindow()),'browser');
  assert.equal(detectMobileRunMode(mockedWindow({phone:false})),'desktop');
  assert.equal(detectMobileRunMode(mockedWindow({pwa:true})),'pwa');
  assert.equal(detectMobileRunMode(mockedWindow({iosStandalone:true})),'pwa');
  assert.equal(detectMobileRunMode(mockedWindow({native:true})),'native');
});
test('Visual viewport height is published only in mobile browsers',()=>{
  const w=mockedWindow({height:844,visible:810});const d=mockedDocument();
  const dispose=installMobileBrowserLayout(d,w);
  assert.equal(d.documentElement.dataset.djRunMode,'browser');
  assert.equal(d.documentElement.style.getPropertyValue('--dj-browser-vvh'),'810px');
  assert.equal(d.documentElement.dataset.djBrowserKeyboard,'closed');
  w.visualViewport.height=795;w.__fire('vv:resize');
  assert.equal(d.documentElement.style.getPropertyValue('--dj-browser-vvh'),'795px');
  dispose();
  assert.equal(d.documentElement.dataset.djRunMode,undefined);
  assert.equal(d.documentElement.style.getPropertyValue('--dj-browser-vvh'),'');
});
test('Toolbar collapse must not be mistaken for a software keyboard',()=>{
  const w=mockedWindow({height:844,visible:770});const d=mockedDocument();
  const dispose=installMobileBrowserLayout(d,w);
  d.activeElement={tagName:'INPUT'};
  d.__fire('focusin');
  assert.equal(d.documentElement.dataset.djBrowserKeyboard,'closed');
  w.visualViewport.height=510;w.__fire('vv:resize');
  assert.equal(d.documentElement.dataset.djBrowserKeyboard,'open');
  assert.equal(d.documentElement.style.getPropertyValue('--dj-browser-keyboard-lift'),'334px');
  d.activeElement=null;d.__fire('focusout');
  assert.equal(d.documentElement.dataset.djBrowserKeyboard,'closed');
  dispose();
});
test('Switching to installed PWA removes every browser-only geometry variable',()=>{
  const w=mockedWindow({height:844,visible:600});const d=mockedDocument();
  const dispose=installMobileBrowserLayout(d,w);
  assert.equal(d.documentElement.dataset.djRunMode,'browser');
  w.navigator.standalone=true;w.__fire('pageshow');
  assert.equal(d.documentElement.dataset.djRunMode,'pwa');
  assert.equal(d.documentElement.style.getPropertyValue('--dj-browser-vvh'),'');
  assert.equal(d.documentElement.style.getPropertyValue('--dj-browser-keyboard-lift'),'');
  assert.equal(d.documentElement.dataset.djBrowserKeyboard,undefined);
  dispose();
});
test('Source binds only scoped CSS after v885 and preserves iOS PWA overlay chrome controller',()=>{
  const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const styles=fs.readFileSync(new URL('../src/mobile-browser-layout.css',import.meta.url),'utf8');
  const anchor=source.indexOf("import './v885-mobile-unified-layout.css';");
  const browser=source.indexOf("import './mobile-browser-layout.css';");
  assert.ok(anchor>=0&&browser>anchor);
  assert.match(source,/import '.\/mobile-browser-layout\.js';/);
  assert.match(styles,/html\[data-dj-run-mode="browser"\]/);
  assert.doesNotMatch(styles,/\)\s+:not\(\[hidden\]\)/,'Sheet state guards must target the sheet, not descendants');
  assert.doesNotMatch(styles,/@media\s*\(min-width:/);
  assert.doesNotMatch(styles,/maplibre-canvas|#map(?=[\\s>.:,{])/);
  assert.match(fs.readFileSync(new URL('../src/ios-pwa-overlay-chrome.js',import.meta.url),'utf8'),/isIosHomeScreenPhone/);
});
