import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v8.7.1: search overlay moves out of narrow topbar only on phones and restores on PC',()=>{
 const js=read('src/map-quick-search.js');
 assert.match(js,/dropdown\.parentNode!==app\)app\.appendChild\(dropdown\)/);
 assert.match(js,/originalParent\.appendChild\(dropdown\)/);
 assert.match(js,/!shell\.contains\(event\.target\)&&!dropdown\.contains\(event\.target\)/);
 assert.match(read('src/v815-map-product.js'),/document\.getElementById\('map-quick-search-dropdown'\)/);
});
test('v8.7.1: mobile search respects viewport and uses fade entry/exit',()=>{
 const css=read('src/v871-mobile-search-sheet.css');
 assert.match(css,/width:calc\(100vw - 24px\)!important/);
 assert.match(css,/dj871-search-in/);assert.match(css,/dj871-search-out/);
 const js=read('src/map-quick-search.js');
 assert.match(js,/visualViewport/);assert.match(js,/dj871-search-top/);
 assert.match(js,/closeTimer/);
});
test('v8.7.1: headers drag up to expand, down to collapse or dismiss while keeping buttons interactive',()=>{
 const js=read('src/dj-v8212-sheet-controller.js');
 assert.match(js,/const INTERACTIVE=/);
 assert.match(js,/event\.target\.closest\?\.\(INTERACTIVE\)/);
 assert.match(js,/sheetStageAction\(delta,g\.velocity,panel\.classList\.contains\('dj871-sheet-expanded'\),expandable\)/);
 assert.match(js,/action==='expand'/);assert.match(js,/action==='collapse'/);assert.match(js,/const close=action==='dismiss'/);
 assert.match(js,/setMobileSheetExpanded\(panel,true,doc,win\)/);
 assert.match(js,/setMobileSheetExpanded\(panel,false,doc,win\)/);
 assert.match(js,/dj871-sheet-expanded/);
});
test('v8.7.1: Nodeulseom has a fallback geographic marker and verified facility popup on click',()=>{
 const js=read('src/nearby-place-labels.js');
 assert.match(js,/dj-nodeulseom-detail-dot/);
 assert.match(js,/installNodeulseomInteraction/);
 assert.match(js,/openPlaceDetails\(\{map,maplibregl,place:/);
 assert.match(js,/style\.load/);
});


test('search dismissal releases the whole retained surface on its actual animation end',()=>{
 const js=read('src/map-quick-search.js');
 assert.match(js,/event\.target===dropdown&&event\.animationName==='dj871-search-out'\)finishClose\?\.\(\)/);
 assert.match(js,/closeTimer=window\.setTimeout\(finish,210\)/);
 assert.doesNotMatch(js,/closeTimer=window\.setTimeout\(finish,300\)/);
 assert.match(js,/const show=\(\)=>\{\s*cancelClose\(\)/);
 assert.match(js,/cancelClose\(\);mapFooter\.hidden=true/);
 assert.match(js,/closeBtn\?\.addEventListener\('click',\(\)=>\{query\.blur\(\)/);
});
