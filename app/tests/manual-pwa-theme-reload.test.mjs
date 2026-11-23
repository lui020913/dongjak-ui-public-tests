import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readManualThemeReload,MANUAL_THEME_RELOAD_KEY,installManualThemeReload} from '../src/manual-pwa-theme-reload.js';

const makeStore=()=>{const items=new Map();return {items,storage:{
 getItem:key=>items.get(key),setItem:(key,val)=>items.set(key,val),
 removeItem:key=>items.delete(key)
}};};
test('legacy iPhone theme snapshot is consumed once, restoring camera and PRI context',()=>{
 const {items,storage}=makeStore();
 const value={theme:'dark',tab:'mine',priMode:'protectionGap',camera:{center:[126.95,37.5],zoom:14,pitch:25,bearing:35},expires:200};
 items.set(MANUAL_THEME_RELOAD_KEY,JSON.stringify(value));
 assert.deepEqual(readManualThemeReload(storage,100),value);
 assert.equal(readManualThemeReload(storage,100),null);
 assert.equal(items.size,0);
});
test('expired and malformed snapshot data is discarded, not applied',()=>{
 const {items,storage}=makeStore();
 for(const [value,now] of [
  [{theme:'dark',expires:200,camera:{center:[0],zoom:14,pitch:0,bearing:0}},100],
  [{theme:'system',expires:200,camera:{center:[0,0],zoom:14,pitch:0,bearing:0}},100],
  [{theme:'dark',expires:200,camera:{center:[126.95,37.5],zoom:14,pitch:0,bearing:0}},201],
  [{theme:'light',expires:200,camera:{center:[126.95,NaN],zoom:14,pitch:0,bearing:0}},100]
 ]){items.set(MANUAL_THEME_RELOAD_KEY,JSON.stringify(value));
   assert.equal(readManualThemeReload(storage,now),null);
   assert.equal(items.size,0);}
});
test('obsolete theme refresh writer is absent but the historical one-time reader survives',()=>{
 const legacy=readFileSync(new URL('../src/manual-pwa-theme-reload.js',import.meta.url),'utf8');
 const env=readFileSync(new URL('../src/ui-environment.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(legacy,/requestIosThemeRefresh|isInstalledIosPhone|location\.reload\s*\(/);
 assert.doesNotMatch(env,/requestIosThemeRefresh|location\.reload\s*\(/);
 assert.match(env,/export function initTheme\(/);
 assert.match(main,/readManualThemeReload/);
 assert.equal(typeof installManualThemeReload(),'function','existing no-op compatibility remains');
});
test('PRI layer restoration after loading is still deferred until the GIS data exists',()=>{
 const pri=readFileSync(new URL('../src/pri-map.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(pri,/let pendingRestore=/);
 assert.match(pri,/if\(pendingRestore\)void loadDefault\(\);/);
 assert.match(pri,/const requested=pendingRestore;pendingRestore=null;activate\(requested\);/);
 assert.match(main,/restoreMode:themeReloadState\?\.priMode/);
});
