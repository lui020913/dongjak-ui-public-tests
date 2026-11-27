import test from 'node:test';import assert from 'node:assert/strict';
import {createMobileEditingLayout} from '../src/mobile-editing-layout.mjs';
function node(rect={bottom:844}){
 const styles=new Map();return {style:{setProperty(k,v,p){styles.set(k,[v,p]);},getPropertyValue:k=>styles.get(k)?.[0]||'',getPropertyPriority:k=>styles.get(k)?.[1]||'',removeProperty:k=>styles.delete(k)},getBoundingClientRect:()=>rect,scrollTop:0,hidden:false};
}
test('comment input hides dock immediately, removes opaque strip and keeps complete form above iOS keyboard',()=>{
 const nav=node(),panel=node(),sc=node({bottom:500}),form=node({bottom:700}),focus={matches:()=>true,closest:()=>form};
 nav.style.setProperty('display','grid','important');panel.style.setProperty('padding-bottom','92px','important');panel.querySelector=()=>sc;panel.contains=n=>n===focus;
 const doc={activeElement:null,documentElement:{clientHeight:844},body:{dataset:{}},getElementById:()=>panel};
 const win={innerHeight:844,visualViewport:{height:844,offsetTop:0},matchMedia:()=>({matches:true})};
 const app={dataset:{tab:'participate'},contains:n=>n===focus};
 const owner=createMobileEditingLayout({app,doc,win,nav});
 owner.sync();assert.equal(panel.style.getPropertyValue('padding-bottom'),'0px');assert.match(sc.style.getPropertyValue('padding-bottom'),/100px/);
 doc.activeElement=focus;owner.sync();assert.equal(nav.style.getPropertyValue('display'),'none');
 win.visualViewport.height=500;owner.sync();assert.equal(panel.style.getPropertyValue('height'),'500px');assert.equal(sc.style.getPropertyValue('padding-bottom'),'20px');assert.ok(sc.scrollTop>0);
 doc.activeElement=null;owner.sync();assert.equal(nav.style.getPropertyValue('display'),'none');
 win.visualViewport.height=844;owner.sync();assert.equal(nav.style.getPropertyValue('display'),'grid');assert.equal(panel.style.getPropertyValue('height'),'');assert.equal(panel.style.getPropertyValue('padding-bottom'),'0px');
 owner.dispose();assert.equal(panel.style.getPropertyValue('padding-bottom'),'92px');assert.equal(nav.style.getPropertyPriority('display'),'important');
});
test('keyboard closes with focus retained and reopens on same iOS field without moving dock',()=>{
 const nav=node(),focus={matches:()=>true},doc={activeElement:null,documentElement:{clientHeight:844},body:{dataset:{}},getElementById:()=>null},win={innerHeight:844,visualViewport:{height:844,offsetTop:0},matchMedia:()=>({matches:true})},app={dataset:{tab:'map'},contains:n=>n===focus};
 const owner=createMobileEditingLayout({app,doc,win,nav});owner.sync();doc.activeElement=focus;owner.sync();
 win.visualViewport.height=500;owner.sync();assert.equal(nav.style.getPropertyValue('display'),'none');
 win.visualViewport.height=844;owner.sync();assert.equal(nav.style.getPropertyValue('display'),'');
 win.visualViewport.height=500;owner.sync();assert.equal(nav.style.getPropertyValue('display'),'none');owner.dispose();
});
