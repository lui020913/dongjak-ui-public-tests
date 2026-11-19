import test from 'node:test';
import assert from 'node:assert/strict';
import {installMobileMapControls} from '../src/mobile-map-controls.js';

function el(name){
 const listeners=new Map();
 return {
  id:name,hidden:true,dataset:{},style:{removeProperty(){},setProperty(){}},
  classList:{add(){}},checked:false,
  addEventListener(type,fn){listeners.set(type,fn);},
  removeEventListener(type){listeners.delete(type);},
  dispatch(type){listeners.get(type)?.({preventDefault(){},stopPropagation(){}});},
  focus(){},querySelector(){return null;},
  getBoundingClientRect(){return {left:320,right:368,top:100,width:48,height:48};}
 };
}
test('help click opens and closes even when the optional fullscreen button is not present',()=>{
 const originals=Object.fromEntries(['document','window','navigator','localStorage','innerWidth','matchMedia','MutationObserver'].map(k=>[k,globalThis[k]]));
 const elements=Object.fromEntries(['map-gesture-guide','map-gesture-guide-open','map-gesture-guide-close','map-gesture-guide-hide-next'].map(n=>[n,el(n)]));
 const app=el('app');app.dataset.tab='map';
 let disconnectCount=0;
 try{
  globalThis.innerWidth=390;
  globalThis.matchMedia=()=>({matches:true});
  Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{standalone:false,userAgent:'iPhone',maxTouchPoints:5}});
  globalThis.localStorage={getItem:()=> '1',setItem(){}};
  globalThis.document={hidden:false,getElementById:(k)=>elements[k]||null,addEventListener(){},removeEventListener(){},documentElement:{requestFullscreen:undefined},fullscreenEnabled:false};
  globalThis.window={innerWidth:390,innerHeight:800,matchMedia:globalThis.matchMedia,addEventListener(){},removeEventListener(){}};
  globalThis.MutationObserver=class {observe(){} disconnect(){disconnectCount++;}};
  const canvas=el('canvas');const map={getCanvas:()=>canvas,resize(){}};
  const release=installMobileMapControls({app,map});
  elements['map-gesture-guide-open'].dispatch('click');
  assert.equal(elements['map-gesture-guide'].hidden,false);
  elements['map-gesture-guide-close'].dispatch('click');
  assert.equal(elements['map-gesture-guide'].hidden,true);
  release();assert.equal(disconnectCount,1);
 }finally{
  for(const [key,value] of Object.entries(originals)){
   if(value===undefined)delete globalThis[key];else Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  }
 }
});
