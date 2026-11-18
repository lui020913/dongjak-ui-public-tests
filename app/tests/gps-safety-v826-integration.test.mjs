import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeGpsSafety,DATASET_PATHS} from '../src/gps-safety-model.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const input=()=>({type:'FeatureCollection',features:[]});
const known={crossings:input(),boundary:input(),accidents:input(),schoolZones:input(),cctv:input(),streetLights:[],securityLights:[],slope:input()};

test('v8.2.6 GPS snapshot loads after existing walking navigation without touching navigation module',()=>{
 const html=read('index.html');
 const existing=html.indexOf('src="/src/v825-navigation-experience.js"');
 const addon=html.indexOf('src="/src/gps-safety-popup.js"');
 assert.ok(existing>0&&addon>existing,'addon must mount after navigation');
 assert.equal((html.match(/src="\/src\/gps-safety-popup.js"/g)||[]).length,1);
 assert.match(read('src/main.js'),/addEventListener\('click',\(\)=>startGpsTracking\(\{manual:true\}\)\)/);
});
test('v8.2.6 GPS brief closes on navigation switch, and returns focus on intentional close',()=>{
 const js=read('src/gps-safety-popup.js');
 assert.match(js,/classList\.contains\('route-guiding'\)/);
 assert.match(js,/attributeFilter:\['data-tab','class','data-dj-settings-text'\]/);
 assert.match(js,/document\.getElementById\('stop-gps-tracking'\)/);
 assert.match(js,/restoreFocus\.focus\(\{preventScroll:true\}\)/);
});
test('v8.2.6 mobile overlay respects nav and dark mode; compact sheet and scroll are deliberate',()=>{
 const css=read('src/gps-safety-popup.css');
 assert.match(css,/bottom:var\(--dj-gps-bottom-offset/);
 assert.match(css,/max-height:min\(43svh,390px\)/);
 assert.match(css,/\.dj-gps-content\{[^}]*overflow:auto/);
 assert.match(css,/html\[data-theme='dark'\] \.dj-gps-popup/);
 assert.match(css,/\.dj-gps-close svg\{[^}]*visibility:visible!important/);
});
test('v8.2.6 missing GPS accuracy and missing reference boundary cannot certify nearby safety',()=>{
 const a=analyzeGpsSafety([126.95,37.5],null,known,new Date(2026,10,13,23));
 assert.equal(a.level,'unknown');assert.equal(a.gpsReliable,false);
 assert.equal(a.boundaryDataAvailable,false);assert.equal(a.night,true);
 const b=analyzeGpsSafety([126.95,37.5],10,known,new Date(2026,10,13,12));
 assert.equal(b.level,'unknown');assert.equal(b.night,false);
});
test('v8.2.6 missing static dataset is not silently labeled a working device or safe road',()=>{
 const js=read('src/gps-safety-popup.js');
 for(const phrase of ['가동 여부','직선거리','현장 미검증','GPS 오차','자료 미확보','경사자료 조회 불가'])assert.ok(js.includes(phrase),phrase);
 for(const asset of Object.values(DATASET_PATHS))assert.doesNotThrow(()=>JSON.parse(read('public'+asset)));
});
