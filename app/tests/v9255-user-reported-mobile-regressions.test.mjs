import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=(()=>{try{return read('src/mobile-next.css')}catch(e){if(e?.code!=='ENOENT')throw e;return read('../frontend/production/mobile-next.css')}})();
test('community classification remains one fixed-height horizontal scroll lane',()=>{
 assert.match(css,/community-category-tabs\{[^}]*flex:0 0 auto!important;height:52px!important/);
 assert.match(css,/community-category-tabs>\.community-filter\{[^}]*height:42px!important/);
 assert.doesNotMatch(css,/community-category-tabs\{[^}]*flex:1 1 auto!important/);
});
test('weather panel shares expansion stages and safe map header bounds',()=>{
 const drag=read('src/dj-v8212-sheet-controller.js');
 assert.equal((drag.match(/'map-gesture-guide','ped-tools-panel','dj854-weather-sheet'\]\.includes\(id\)/g)||[]).length,2);
 assert.match(css,/#dj854-weather-sheet\.dj871-sheet-expanded:not\(\[hidden\]\)\{position:fixed!important;top:var\(--dj910-map-top/);
});
test('live metro is initially enabled but never fetched while hidden by the zoom cutoff',()=>{
 const integrate=read('src/features/liveTransit/integrate.js'),overlay=read('src/features/liveTransit/index.js');
 assert.match(integrate,/let saved=\{metro:true,bus:false\}/);
 assert.match(overlay,/const metroZoomReady=\(\)=>/);
 assert.match(overlay,/\(!quotaActive\(\)&&metroZoomReady\(\)\)/);
 assert.match(overlay,/map\.on\?\.\('zoomend',onZoomEnd\)/);
 assert.match(overlay,/map\.off\?\.\('zoomend',onZoomEnd\)/);
 assert.match(integrate,/METRO_QUOTA_NOTICE/);
});
