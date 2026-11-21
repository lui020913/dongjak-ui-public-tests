import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileScaleBlockerVisible,shouldHideMobileScale,MOBILE_SCALE_BLOCKERS} from '../src/map-scale-docking.js';
const contents=path=>readFileSync(new URL(path,import.meta.url),'utf8');
function element({id='',hidden=false,display='block',rect={top:10,left:10,right:70,bottom:45,width:60,height:35},classes=[]}={}){
 const classList={contains:s=>classes.includes(s)};
 return {id,hidden,classList,closest:()=>null,getBoundingClientRect:()=>rect};
}
const win={innerWidth:390,innerHeight:844,getComputedStyle:node=>({display:node.display||'block',visibility:'visible',opacity:'1'})};
const docWith=(selectors={})=>({querySelectorAll:s=>selectors[s]||[]});
const app=({tab='map',search='false',classes=[]}={})=>({dataset:{tab,searchOpen:search},classList:{contains:s=>classes.includes(s)}});
test('scale is visible on the map alone, hidden for floating map UI, and independent from the TIP',()=>{
 assert.equal(shouldHideMobileScale(app(),docWith(),win),false);
 assert.equal(shouldHideMobileScale(app({tab:'news'}),docWith(),win),true);
 assert.equal(shouldHideMobileScale(app({search:'true'}),docWith(),win),true);
 assert.equal(shouldHideMobileScale(app({classes:['map-controls-open']}),docWith(),win),true);
 for(const selector of ['#transport-sheet','#map-quick-search-dropdown','#road-width-legend','.maplibregl-popup','#dj-transit-signin-prompt','#dj854-weather-sheet']){
  assert.equal(shouldHideMobileScale(app(),docWith({[selector]:[element()]}),win),true,selector);
 }
 assert.equal(shouldHideMobileScale(app(),docWith({'#transport-sheet':[element({hidden:true})]}),win),false);
 assert.equal(shouldHideMobileScale(app(),docWith({'#dj854-weather-sheet':[element({id:'dj854-weather-sheet',hidden:true})]}),win),false,'closing weather restores map-only scale');
 assert.ok(MOBILE_SCALE_BLOCKERS.includes('#dj854-weather-sheet'));
 assert.match(contents('../src/map-scale-docking.js'),/for\(const selector of \[\.\.\.MOBILE_SCALE_BLOCKERS,tipSelector\]\)/,'weather sheet state is included in the scale observer');
 assert.equal(shouldHideMobileScale(app(),docWith({'#dj840-map-tip':[element()]}),win),false,'TIP is a separate HUD lane');
 assert.ok(!MOBILE_SCALE_BLOCKERS.includes('#dj840-map-tip'));
 assert.equal(shouldHideMobileScale(app(),docWith({'#toast':[element({id:'toast'})]}),win),false);
 assert.equal(shouldHideMobileScale(app(),docWith({'#toast':[element({id:'toast',classes:['show']})]}),win),true);
});
test('window blockers need a visible, onscreen element and not a hidden ancestor',()=>{
 let e=element({rect:{top:100,left:800,right:900,bottom:180,width:100,height:80}});
 assert.equal(mobileScaleBlockerVisible(e,win),false);
 e=element({});e.closest=()=>({hidden:true});
 assert.equal(mobileScaleBlockerVisible(e,win),false);
 e=element({});e.display='none';
 assert.equal(mobileScaleBlockerVisible(e,win),false);
 assert.ok(MOBILE_SCALE_BLOCKERS.includes('.maplibregl-popup'));
});
test('map hint remains available and updates its copy without blocking the scale',()=>{
 const source=contents('../src/v840-coordinated-ui.js');
 assert.match(source,/const advanceTip=/);
 assert.match(source,/dj852-tip-copy-fade/);
 assert.doesNotMatch(source,/tipShownThisMapVisit|tipHideTimer|showBriefTip/);
 const dock=contents('../src/map-scale-docking.js');
 assert.match(dock,/shouldHideMobileScale\(app,app\.ownerDocument,window\)/);
 assert.match(dock,/watchOverlayNodes\(\)/);
});

test('aria-hidden exiting controls cannot keep the idle map HUD blocked',()=>{
 const n=element();n.getAttribute=k=>k==='aria-hidden'?'true':null;
 assert.equal(mobileScaleBlockerVisible(n,win),false);
 assert.equal(shouldHideMobileScale(app(),docWith({'#transport-sheet':[n]}),win),false);
});
