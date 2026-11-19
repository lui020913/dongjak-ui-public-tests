import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nearestBuildingSheets} from '../src/building-prewarm.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('v7.0.29 landmark logo and label share one MapLibre symbol anchor',()=>{
 const js=read('src/featured-place-labels.js');
 assert.match(js,/filter:\['!=',\['get','name'\],'숭실대학교'\]/);
 assert.match(js,/'icon-offset':\[0,0\]/);
 assert.match(js,/'text-field':\['case',\['==',\['get','name'\],'숭실대학교'\]/);
 assert.doesNotMatch(js,/\[135,0\]/);
});
test('v7.0.29 X buttons use accessible labels but no raw × glyph competing with CSS',()=>{
 const html=read('index.html');
 for(const id of ['overview-sheet-close','night-visibility-float-stop','map-options-desktop-close','map-options-mobile-close','news-close-to-map']){
   const m=html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>([\\s\\S]*?)</button>`));
   assert.ok(m,id);
   assert.doesNotMatch(m[1],/×/);
   if(id==='news-close-to-map')assert.match(m[1],/<svg width="24" height="24"/);
   else assert.equal(m[1].trim(),'');
   assert.match(m[0],/aria-label=/);
 }
 const css=read('src/v711-map-layout.css');assert.match(css,/::after\{content:none!important/);
});
test('initial building prewarm prioritizes closest tile, only requested count',()=>{
 const sheets=[
  {sheet:1,bbox:[125,36,125.02,36.02]},
  {sheet:2,bbox:[126.94,37.49,126.96,37.50]},
  {sheet:3,bbox:[127.5,37.5,127.6,37.6]},
 ];
 assert.deepEqual(nearestBuildingSheets({sheets},[126.95,37.495],2).map(x=>x.sheet),[2,3]);
 assert.deepEqual(nearestBuildingSheets({sheets},[126.95,37.495],0),[]);
 assert.deepEqual(nearestBuildingSheets({},[126,37],3),[]);
 const main=read('src/main.js');assert.match(main,/scheduleInitialBuildingWarmup\(\)/);
 assert.match(main,/requestIdleCallback/);
 assert.match(main,/narrow\?2:4/);
});
test('side panels, right controls, top search helpers and scale are coherently aligned',()=>{
 const css=read('src/v711-map-layout.css');
 for(const s of ['--dj-side-panel-w:430px','--dj-search-h:56px','--dj-left-dock-x:148px','#map-advanced-controls','.map-actions','#app .topbar .header-tools .weather-widget'])assert.ok(css.includes(s),s);
 const dock=read('src/map-scale-docking.js');assert.match(dock,/toolsRect\.top-mapRect\.top/);
 assert.match(dock,/cardWidth=430/);
 assert.match(dock,/dockNight=app\.dataset\.sangdoNight==='on'/);
 assert.match(dock,/aboveTools>=minimumTop/);
});
