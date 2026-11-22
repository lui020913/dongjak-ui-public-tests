import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAP_TIP_MESSAGES,hasOpenMapWindow,normalizeBottomTabs} from '../src/v840-ui-core.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const chrome=read('src/mobile-chrome-v790.js');
const css=read('src/v840-coordinated-ui.css');
const shell=read('src/v840-coordinated-ui.js');
const home=read('src/v833-home-reset.js');
const search=read('src/map-quick-search.js');
const info=read('src/v834-my-info.js');
const account=read('src/v824-favorites-cloud.js');
const html=read('index.html');
const cls=()=>({active:false,toggle(k,v){this[k]=v;}});
function docState(tab='mine',opened=false){
 const ids=new Map([['mine-panel',{hidden:!opened}],['route-panel',{hidden:true}],['participation-panel',{hidden:true}],['news-panel',{hidden:true}],['overview-sheet',{hidden:true}]]);
 const tabs=['map','route','participate','news','mine'].map(t=>({dataset:{tab:t},classList:cls(),setAttribute(n,v){this[n]=v;},removeAttribute(n){delete this[n];}}));
 const app={dataset:{tab},classList:{contains(){return false;}}};
 return {app,tabs,doc:{getElementById(id){return id==='app'?app:ids.get(id)||null;},querySelectorAll(s){return s==='#bottom-nav>.nav-tab'?tabs:[];}}};
}
test('empty page state selects safety tab, but open My Info retains its tab',()=>{
 const closed=docState('mine',false);
 assert.equal(normalizeBottomTabs(closed.doc,closed.app),'map');
 assert.equal(closed.tabs[0].classList.active,true);
 const open=docState('mine',true);
 assert.equal(normalizeBottomTabs(open.doc,open.app),'mine');
 assert.equal(open.tabs[4].classList.active,true);
});
test('no active sheet allows tips; temporary map tool blocks tips',()=>{
 const state=docState('map',false);
 assert.equal(hasOpenMapWindow(state.doc,state.app),false);
 state.app.classList.contains=x=>x==='map-safety-open';
 assert.equal(hasOpenMapWindow(state.doc,state.app),true);
});
test('home action closes district and overview without clearing accounts',()=>{
 assert.match(home,/const overview=doc\.getElementById\('overview-sheet'\);if\(overview\)overview\.hidden=true/);
 assert.doesNotMatch(home,/removeItem\(['"]favorites/);
});
test('no district information sheet on district shortcut',()=>{
 assert.match(toolbar,/feature\[0\]!=='map-dong'\)openSheet/);
});
test('base and imported layers stay more-only even with saved preference',()=>{
 for(const key of ['base-metro','base-bus','base-buildings','base-boundary','safe-cctv','safe-crosswalk','map-road-width'])assert.ok(toolbar.includes(`'${key}'`),key);
 assert.match(toolbar,/export const MORE_ONLY_KEYS=new Set/);
 assert.match(toolbar,/!MORE_ONLY_KEYS\.has\(f\[0\]\)&&isPrimary/);
 assert.match(toolbar,/parsed\.filter\(k=>!MORE_ONLY_KEYS\.has\(k\)/);
});
test('More menu has a visible fixed title and exposes two working utilities',()=>{
 assert.doesNotMatch(toolbar,/title\.textContent=key==='map-dong'/);
 assert.match(toolbar,/title\.textContent=''/);
 assert.match(chrome,/전체 업데이트 내역/);assert.match(chrome,/지도 설정/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('close events collapse toolbar and release obsolete highlights',()=>{
 assert.match(shell,/dj836:close-overlay-tools/);
 assert.match(shell,/dj832-expanded/);
});
test('search suggestions hide horizontal toolbar',()=>{
 assert.match(css,/data-search-open="true"\] #dj-v794-toolbar/);
});
test('search uses actual loaded OSM POIs as candidate facility data',()=>{
 assert.match(search,/map\.querySourceFeatures\(source,\{sourceLayer:'poi'\}\)/);
 assert.match(search,/loaded-map-poi/);
 assert.match(search,/병원/);assert.match(search,/음식점/);
});
test('tips cycle every 10 seconds with map idle only',()=>{
 assert.ok(MAP_TIP_MESSAGES.length>=5);
 assert.match(shell,/},10000\)/);
 assert.match(shell,/app\.dataset\.tab==='map'&&app\.dataset\.djPriVisible!=='true'&&!hasOpenMapWindow/);
 assert.match(shell,/const advanceTip=/);
 assert.doesNotMatch(shell,/tipHideTimer|showBriefTip/);
});
test('mobile nav rows and labels have same baseline and iPhone-rounded outer pill',()=>{
 assert.match(css,/grid-template-rows:38px 18px/);
 assert.match(css,/border-radius:999px!important/);
});
test('my info removes unused manual theme row while preserving map settings access',()=>{
 assert.doesNotMatch(info,/data-dj834-action="theme"/);
 assert.match(info,/data-dj834-action="map"/);
 assert.match(info,/dispatchEvent\(new Event\('dj:open-map-settings'\)\)/);
});
test('profile save/edit and security recovery modes keep login state',()=>{
 assert.match(account,/savedProfile\?'변경사항 저장':'이름 저장'/);
 assert.match(account,/securityTab\.hidden=!recoveryMode/);
 assert.match(account,/표시 이름을 저장했습니다/);assert.match(account,/표시 이름이 변경되었습니다/);
});
test('help icon is teal and app release UI is not removed',()=>{
 assert.match(css,/#map-gesture-guide-open/);
 assert.match(html,/version-history-trigger/);
});

test('logically closed or CSS-hidden windows do not suppress the map TIP',()=>{
 const state=docState('map',true);const n=state.doc.getElementById('mine-panel');
 n.getAttribute=k=>k==='aria-hidden'?'true':null;
 assert.equal(hasOpenMapWindow(state.doc,state.app),false);
 n.getAttribute=()=>null;n.ownerDocument={defaultView:{getComputedStyle:()=>({display:'none',visibility:'visible'})}};
 assert.equal(hasOpenMapWindow(state.doc,state.app),false);
});

test('the shared visible-sheet flag prevents stale TIP display',()=>{
 const state=docState('map',false);state.app.dataset.dj910SheetOpen='true';
 assert.equal(hasOpenMapWindow(state.doc,state.app),true);
});
