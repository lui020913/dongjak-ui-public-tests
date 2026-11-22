import test from 'node:test';import assert from 'node:assert/strict';import {readManualThemeReload,MANUAL_THEME_RELOAD_KEY,isInstalledIosPhone,requestIosThemeRefresh} from '../src/manual-pwa-theme-reload.js';
test('reload state is validated and consumed exactly once',()=>{const data=new Map();const s={getItem:k=>data.get(k),removeItem:k=>data.delete(k)};const value={theme:'dark',tab:'mine',camera:{center:[126.95,37.5],zoom:14,pitch:0,bearing:0},expires:200};data.set(MANUAL_THEME_RELOAD_KEY,JSON.stringify(value));assert.deepEqual(readManualThemeReload(s,100),value);assert.equal(readManualThemeReload(s,100),null);data.set(MANUAL_THEME_RELOAD_KEY,JSON.stringify(value));assert.equal(readManualThemeReload(s,201),null);});
test('theme recovery is restricted to installed iPhone web apps',()=>{const mock=(standalone,ua)=>({navigator:{userAgent:ua,standalone},matchMedia:q=>({matches:q.includes('max-width')})});assert.equal(isInstalledIosPhone(mock(true,'iPhone')),true);assert.equal(isInstalledIosPhone(mock(false,'iPhone')),false);assert.equal(isInstalledIosPhone(mock(true,'Android')),false);});

test('reload state rejects malformed camera and invalid theme',()=>{const data=new Map();const s={getItem:k=>data.get(k),removeItem:k=>data.delete(k)};for(const v of [{theme:'dark',expires:200,camera:{center:[0],zoom:14,pitch:0,bearing:0}},{theme:'system',expires:200,camera:{center:[0,0],zoom:14,pitch:0,bearing:0}}]){data.set(MANUAL_THEME_RELOAD_KEY,JSON.stringify(v));assert.equal(readManualThemeReload(s,100),null);}});

test('iOS manual theme refresh preserves the active tab and full map camera',()=>{
 const data=new Map();let reloads=0;
 const win={
  navigator:{userAgent:'Mozilla/5.0 (iPhone)',standalone:true},
  matchMedia:q=>({matches:q.includes('max-width:699px')}),
  sessionStorage:{setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)},
  location:{reload:()=>{reloads++;}}
 };
 const map={getCenter:()=>({lng:126.95,lat:37.5}),getZoom:()=>14.5,getPitch:()=>25,getBearing:()=>35};
 assert.equal(requestIosThemeRefresh({win,app:{dataset:{tab:'news',djPriVisible:'true',djPriMode:'protectionGap'}},map,theme:'light'}),true);
 assert.equal(reloads,1);
 const snapshot=readManualThemeReload(win.sessionStorage,Date.now());
 assert.equal(snapshot.theme,'light');assert.equal(snapshot.tab,'news');assert.equal(snapshot.priMode,'protectionGap');
 assert.deepEqual(snapshot.camera,{center:[126.95,37.5],zoom:14.5,pitch:25,bearing:35});
 assert.equal(readManualThemeReload(win.sessionStorage,Date.now()),null);
});
test('browser tabs and temporary or malformed camera cannot request a native theme refresh',()=>{
 let reloads=0;const data=new Map();
 const win={navigator:{userAgent:'Android',standalone:true},
  matchMedia:q=>({matches:q.includes('max-width:699px')}),
  sessionStorage:{setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
  location:{reload:()=>{reloads++;}}};
 assert.equal(requestIosThemeRefresh({win,map:null,theme:'dark'}),false);
 win.navigator.userAgent='iPhone';
 assert.equal(requestIosThemeRefresh({win,map:{getCenter:()=>null},theme:'dark'}),false);
 assert.equal(reloads,0);assert.equal(data.size,0);
});

test('PRI active layer restoration is deferred until verified data loads',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/pri-map.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(source.includes('let pendingRestore='));
 assert.ok(source.includes('if(pendingRestore)void loadDefault();'));
 assert.ok(source.includes('app.dataset.djPriMode=id'));
 assert.ok(source.includes('const requested=pendingRestore;pendingRestore=null;activate(requested);'));
 assert.ok(main.includes('restoreMode:themeReloadState?.priMode'));
});
