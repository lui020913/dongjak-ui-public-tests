import test from 'node:test';import assert from 'node:assert/strict';import {installExclusiveAnalysisLayers} from '../src/exclusive-analysis-layers.mjs';
test('last selected analysis wins, PRI and ordinary layers turn each other off, late async layer is dismissed',()=>{
 let listener,callback,pri=false;const nodes=[];
 const doc={body:{},querySelectorAll:()=>nodes,addEventListener:(type,fn)=>{listener=fn;},removeEventListener(){}};
 class Observer{constructor(fn){callback=fn;}observe(){}disconnect(){}}
 const make=()=>{const n={on:false,disabled:false,matches:()=>true,closest:()=>n,getAttribute:()=>String(n.on),click(){listener({target:n});n.on=!n.on;}};nodes.push(n);return n;};
 const a=make(),b=make(),late=make();const c=installExclusiveAnalysisLayers(doc,{MutationObserver:Observer},()=>{pri=false;c.releasePri();});
 a.click();callback([{target:a}]);assert.equal(a.on,true);
 b.click();callback([{target:a},{target:b}]);assert.equal(a.on,false);assert.equal(b.on,true);
 c.claimPri();pri=true;assert.equal(b.on,false);
 late.on=true;callback([{target:late}]);assert.equal(late.on,false);assert.equal(pri,true);
 a.click();callback([{target:a}]);assert.equal(a.on,true);assert.equal(pri,false);c.dispose();
});
