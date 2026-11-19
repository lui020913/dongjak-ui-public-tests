import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileScaleLeft, shouldHideMobileScale} from '../src/map-scale-docking.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('safety tab does not automatically click admin selector',()=>{
 const source=read('src/v805-responsive-readability.js');
 assert.doesNotMatch(source,/pendingAdmin|openAdminAfterNavigation|opener\.click\(\)/);
 assert.match(read('src/main.js'),/getElementById\('open-admin-dongs-from-options'\)/);
});
test('mobile scale follows nav inset with side margin',()=>{
 assert.equal(mobileScaleLeft({mapLeft:0,mapWidth:390,navLeft:20,scaleWidth:82}),28);
 assert.equal(mobileScaleLeft({mapLeft:0,mapWidth:320,navLeft:-12,scaleWidth:80}),18);
 assert.equal(mobileScaleLeft({mapLeft:0,mapWidth:320,navLeft:290,scaleWidth:80}),222);
});
test('retain integrated route and persistent TIP behavior, while changing copy on ten-second ticks',()=>{
 const src=read('src/v840-coordinated-ui.js');
 assert.match(src,/tipMark\.textContent='TIP'/);
 assert.match(src,/tipText\.textContent=MAP_TIP_MESSAGES\[tip\]/);
 assert.match(src,/const advanceTip=/);
 assert.match(src,/dj852-tip-copy-fade/);
 assert.doesNotMatch(src,/tipShownThisMapVisit|tipHideTimer|showBriefTip/);
 assert.match(src,/\},10000\)/);
 assert.match(src,/label\.addEventListener\('click',openGuideFromTip\)/);
 assert.match(read('index.html'),/v841-route-and-tips\.js/);
 assert.match(read('src/v841-route-and-tips.js'),/onWaypointClick/);
});
test('map scale is suppressed for floating panels but not the persistent TIP',()=>{
 const win={innerWidth:390,innerHeight:844,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
 const app={dataset:{tab:'map',searchOpen:'false'},classList:{contains:()=>false}};
 const hidden={querySelectorAll:()=>[]};
 const shown={querySelectorAll:s=>s==='#dj840-map-tip'?[{hidden:false,closest:()=>null,getBoundingClientRect:()=>({top:600,bottom:640,left:20,right:240,width:220,height:40}),classList:{contains:()=>false}}]:[]};
 assert.equal(shouldHideMobileScale(app,hidden,win),false);
 assert.equal(shouldHideMobileScale(app,shown,win),false);
 assert.doesNotMatch(read('src/map-scale-docking.js'),/MOBILE_SCALE_BLOCKERS[\s\S]{0,160}#dj840-map-tip/);
});
