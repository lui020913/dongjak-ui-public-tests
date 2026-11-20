import test from 'node:test';
import assert from 'node:assert/strict';
import {bindReliablePopupClose} from '../src/popup-close-input.js';
import {readFileSync} from 'node:fs';

function fixture(){
  const handlers=new Map();
  const button={
    addEventListener(name,fn){handlers.set(name,fn);},
    removeEventListener(name,fn){if(handlers.get(name)===fn)handlers.delete(name);},
    fire(name,props={}){handlers.get(name)?.({button:0,isPrimary:true,stopPropagation(){},...props});}
  };
  const timers=new Map();
  let serial=0,calls=0;
  const win={
    setTimeout(fn){const id=++serial;timers.set(id,{fn,canceled:false});return id;},
    clearTimeout(id){const timer=timers.get(id);if(timer)timer.canceled=true;}
  };
  const dispose=bindReliablePopupClose(button,()=>calls++,win);
  const flush=()=>{for(const timer of timers.values())if(!timer.canceled){timer.canceled=true;timer.fn();}};
  return {button,dispose,flush,handlers,timers,count:()=>calls};
}

test('normal close click wins and cancels the pending pointer fallback',()=>{
  const x=fixture();
  x.button.fire('pointerup');
  x.button.fire('click');
  x.flush();
  assert.equal(x.count(),1,'one native popup.remove() despite pointer and click');
  x.button.fire('click');assert.equal(x.count(),1);
  x.dispose();assert.equal(x.handlers.size,0);
});

test('pointerup alone closes once when the browser loses the click',()=>{
  const x=fixture();
  x.button.fire('pointerup');
  assert.equal(x.count(),0,'do not dismiss until click had a chance to dispatch');
  x.flush();assert.equal(x.count(),1);
  x.button.fire('click');assert.equal(x.count(),1);
  x.dispose();
});

test('cancelled, secondary and unmounted gestures do not dismiss',()=>{
  const x=fixture();
  x.button.fire('pointerup',{isPrimary:false});
  x.button.fire('pointerup',{button:2});
  x.flush();assert.equal(x.count(),0);
  x.button.fire('pointerup');
  x.dispose();
  x.flush();assert.equal(x.count(),0);
});

test('facility component retains the native cleanup and watchdog',()=>{
  const source=readFileSync(new URL('../src/place-details.js',import.meta.url),'utf8');
  assert.match(source,/bindReliablePopupClose\(closeButton,/);
  assert.match(source,/popup\.on\('close',disposeCloseInput\)/);
  assert.match(source,/closeWatchdog=window\.setTimeout\(finish,1000\)/);
  assert.match(source,/window\.DongjakWindowMotion\.close\(motion,finish\)/);
});
