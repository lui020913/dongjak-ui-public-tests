import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {usableMapSelectionOffset} from '../src/transport-selection-marker.js';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const node=(top,bottom)=>({hidden:false,getBoundingClientRect:()=>({top,bottom,height:bottom-top,width:320})});
const doc={querySelector:selector=>{
 if(selector==='.topbar')return node(115,258);
 if(selector==='#djNext-toolbar')return node(288,397);
 return null;
}};
const win={innerHeight:844,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
const map={getContainer:()=>({clientHeight:844,getBoundingClientRect:()=>({top:0,bottom:844,height:844})})};

test('all selected facility/metro/bus markers use actual midpoint between toolbar and sheet',()=>{
 const panel=node(650,850);
 const offset=usableMapSelectionOffset({map,panel,doc,win});
 // toolbar bottom 397 + 14 = 411; sheet top 650 - 18 = 632.
 // Their midpoint 521.5 sits visibly above the sheet and below the tools.
 assert.equal(offset,100);
 assert(422+offset>397&&422+offset<650);
 const v=source('src/transport-map.js'),p=source('src/place-details.js');
 assert.match(v,/usableMapSelectionOffset\(\{map,panel,doc:document,win:globalThis\.window\}\)/);
 assert.match(p,/usableMapSelectionOffset\(\{map,panel:popup\.getElement\(\),doc:document,win:window\}\)/);
 assert.match(p,/window\.requestAnimationFrame\(focusSelectedPlace\)/);
 assert.doesNotMatch(p,/Math\.min\(h\*\.42,h-180\)/);
});

test('overlapping unavailable panel measurement uses a bounded fallback',()=>{
 const result=usableMapSelectionOffset({map,panel:node(420,844),doc,win});
 assert(Number.isFinite(result));
 assert(result>=-260&&result<=260);
 assert.equal(usableMapSelectionOffset({map,panel:node(650,844),doc,win}),100);
});

test('map preferences and advanced tools use one child navigation owner',()=>{
 const info=source('src/v834-my-info.js');
 assert.match(info,/language:languageSettings,map:mapBox/);
 assert.match(info,/advancedTools\.append\(advancedTitle,toolsBox\);mapBox\.append\(advancedTools\)/);
 assert.match(info,/\['profile','records','type','language','tools','map'\]/);
 assert.match(info,/if\(view==='map'\)syncMapChoices\(\)/);
 assert.match(info,/enter\(detail,'forward'\)/);
 assert.match(info,/enter\(landing,'back'\)/);
 assert.doesNotMatch(info,/action==='map'\)\{doc\.dispatchEvent/);
 assert.match(info,/native\.dispatchEvent\(new Event\('change'/);
});

test('redundant actions and the 68dvh white sheet were eliminated without changing APIs',()=>{
 const main=source('src/main.js');
 assert.doesNotMatch(main,/communityButton\('첫 글 작성하기'/);
 assert.match(main,/if\(clear\)clear\.hidden=/);
 const transit=source('src/v875-mobile-stability.css');
 assert.match(transit,/height:auto!important;min-height:0!important/);
 assert.doesNotMatch(transit,/height:min\(68dvh,700px\)!important/);
 const css=source('src/phone-surface-consistency-20261123.css');
 assert.match(source('src/route-experience.css'),/#route-panel #route-clear\[hidden\]/);
 assert.match(css,/\.dj834-tools-container .dj17-feature-details/);
 assert.match(css,/\.dj834-map-setting-row/);
 assert.match(css,/:focus:not\(:focus-visible\)/);
 let followup;
 try{followup=source('src/mobile-17-followup.js');}
 catch{followup=source('../frontend/production/mobile-17-followup.js');}
 assert.match(followup,/target\.querySelector\('\.dj840-more-quick-actions'\)\?\.remove\(\)/);
});
