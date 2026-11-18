import test from 'node:test';
import assert from 'node:assert/strict';
import {closeClassControlledSurface} from '../src/window-surface-cleanup.js';
import {installSafetyHomeGuard} from '../src/safety-home-guard.js';
import {installMapResumeRecovery} from '../src/v875-map-resume.js';

function element(){
  const classes=new Set(['dj875-map-safety-exiting','dj875-map-options-exiting']);
  return {hidden:false,attributes:{},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
    setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];}};
}

test('closing safety controls clears backdrop, animation and aria atomically',()=>{
  const items=Object.fromEntries(['map-safety-controls','map-safety-backdrop','map-safety-toggle'].map(x=>[x,element()]));
  const app=element();app.classList.add('map-safety-open');
  assert.equal(closeClassControlledSurface({id:'map-safety-controls',doc:{getElementById:id=>items[id]},app}),true);
  assert.equal(app.classList.contains('map-safety-open'),false);
  assert.equal(items['map-safety-backdrop'].hidden,true);
  assert.equal(items['map-safety-toggle'].getAttribute('aria-expanded'),'false');
  assert.equal(items['map-safety-controls'].getAttribute('aria-hidden'),'true');
  assert.equal(items['map-safety-controls'].classList.contains('dj875-map-safety-exiting'),false);
});
test('closing options clears transparent backdrop and hidden help',()=>{
  const items=Object.fromEntries(['map-advanced-controls','map-options-backdrop','map-tools-toggle','mobile-webapp-help'].map(x=>[x,element()]));
  const app=element();app.classList.add('map-controls-open');
  assert.equal(closeClassControlledSurface({id:'map-advanced-controls',doc:{getElementById:id=>items[id]},app}),true);
  assert.equal(app.classList.contains('map-controls-open'),false);
  assert.equal(items['map-options-backdrop'].hidden,true);
  assert.equal(items['mobile-webapp-help'].hidden,true);
  assert.equal(items['map-tools-toggle'].getAttribute('aria-expanded'),'false');
  assert.equal(closeClassControlledSurface({id:'transport-sheet',doc:{getElementById:id=>items[id]},app}),false);
});
test('modern home guard marks its ownership and clears it on disposal',()=>{
  const home={};const picker={hidden:true,style:{removeProperty(){}},classList:{remove(){}}};
  const app={dataset:{},classList:{remove(){}}};
  let handler;
  const doc={querySelector:s=>s.includes('nav-tab')?home:null,getElementById:id=>id==='admin-dong-picker'?picker:null};
  const win={matchMedia:()=>({matches:true}),addEventListener:(name,fn)=>{handler=fn;},removeEventListener(){},queueMicrotask:fn=>fn(),requestAnimationFrame:fn=>fn()};
  const dispose=installSafetyHomeGuard({doc,win,app,onHome:()=>{app.dataset.tab='map';}});
  assert.equal(app.dataset.djHomeGuardActive,'1');
  let stopped=0;
  handler({target:{closest:selector=>selector.includes('nav-tab')?home:null},preventDefault(){},stopImmediatePropagation(){stopped++;}});
  assert.equal(stopped,1);
  dispose();assert.equal(app.dataset.djHomeGuardActive,undefined);
});
test('foreground recovery coalesces rapid events, wakes after context restoration, cleans timers',()=>{
  const events=new Map(),canvasEvents=new Map(),queued=[];let clock=1000,resize=0,paint=0;
  const canvas={addEventListener:(type,fn)=>canvasEvents.set(type,fn),removeEventListener:(type)=>canvasEvents.delete(type)};
  const doc={hidden:false,addEventListener:(type,fn)=>events.set('doc:'+type,fn),removeEventListener:type=>events.delete('doc:'+type)};
  const app={dataset:{}};
  const win={addEventListener:(type,fn)=>events.set('win:'+type,fn),removeEventListener:type=>events.delete('win:'+type),
    requestAnimationFrame(fn){fn();return 1;},setTimeout(fn,ms){const t={fn,ms};queued.push(t);return t;},clearTimeout(timer){timer.cancelled=true;}};
  const map={getCanvas:()=>canvas,resize(){resize++;},triggerRepaint(){paint++;}};
  const dispose=installMapResumeRecovery({map,app,doc,win,now:()=>clock});
  events.get('win:pageshow')();events.get('win:focus')();
  assert.equal(resize,1);assert.equal(paint,1);
  canvasEvents.get('webglcontextlost')({preventDefault(){}});assert.equal(app.dataset.dj875GraphicsLost,'true');
  events.get('win:pageshow')();assert.equal(resize,1);
  canvasEvents.get('webglcontextrestored')();assert.equal(resize,2);
  assert.equal(app.dataset.dj875GraphicsLost,undefined);
  clock=1700;
  for(const timer of queued){if(!timer.cancelled)timer.fn();}
  assert.ok(resize>=3);
  dispose();assert.equal(events.size,0);assert.equal(canvasEvents.size,0);
});

test('legacy double-tap home handler ignores map tab when modern home owner is active',async()=>{
  const {installSafetyHomeTab}=await import('../src/v833-home-reset.js');
  const home={setAttribute(){}};let callback,clicks=0;
  const app={dataset:{tab:'map',djHomeGuardActive:'1'},classList:{contains:()=>false}};
  const doc={getElementById:id=>id==='app'?app:id==='center-dongjak'?{click(){clicks++;}}:null,
    querySelector:s=>s.includes('nav-tab[data-tab="map"]')?home:null,addEventListener(type,fn){callback=fn;},removeEventListener(){},querySelectorAll:()=>[],dispatchEvent(){}};
  const win={performance:{now:()=>1000},queueMicrotask:fn=>fn()};
  const dispose=installSafetyHomeTab(doc,win);
  let intercepted=false;
  callback({target:{closest:()=>home},preventDefault(){intercepted=true;},stopImmediatePropagation(){intercepted=true;}});
  assert.equal(intercepted,false);
  assert.equal(clicks,0);
  dispose();
});
