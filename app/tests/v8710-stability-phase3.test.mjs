import test from 'node:test';
import assert from 'node:assert/strict';
import {installMapResumeRecovery} from '../src/v875-map-resume.js';
import {transportPinCoordinates,mobileTransportFocusOffset} from '../src/transport-selection-marker.js';
import {closeClassControlledSurface} from '../src/window-surface-cleanup.js';

function fixture({framesFrozen=false}={}) {
  const windowHandlers=new Map(),documentHandlers=new Map(),canvasHandlers=new Map(),tasks=[];
  const frames=[];let clock=1000,resizes=0,repaints=0;
  const doc={hidden:false,addEventListener:(n,fn)=>documentHandlers.set(n,fn),removeEventListener:n=>documentHandlers.delete(n)};
  const win={
    addEventListener:(n,fn)=>windowHandlers.set(n,fn),removeEventListener:n=>windowHandlers.delete(n),
    requestAnimationFrame(fn){if(framesFrozen)frames.push(fn);else fn();return frames.length;},
    setTimeout(fn,ms){const task={fn,ms,cancelled:false};tasks.push(task);return task;},
    clearTimeout(task){task.cancelled=true;}
  };
  const canvas={addEventListener:(n,fn)=>canvasHandlers.set(n,fn),removeEventListener:n=>canvasHandlers.delete(n)};
  const map={getCanvas:()=>canvas,resize(){resizes++;},triggerRepaint(){repaints++;}};
  const app={dataset:{}};
  const dispose=installMapResumeRecovery({map,app,doc,win,now:()=>clock});
  const runTimers=(ms)=>{
    const matching=tasks.filter(t=>t.ms===ms&&!t.cancelled);
    for(const t of matching){t.cancelled=true;t.fn();}
  };
  return {doc,win,app,frames,tasks,canvasHandlers,windowHandlers,documentHandlers,
    dispose,runTimers,setClock:x=>{clock=x;},get counts(){return [resizes,repaints];}};
}

test('v8.7.10: stalled iOS animation frames recover through a bounded watchdog',()=>{
  const f=fixture({framesFrozen:true});
  f.windowHandlers.get('pageshow')();
  assert.deepEqual(f.counts,[0,0]);
  f.runTimers(1100);
  assert.deepEqual(f.counts,[1,1]);
  // An old rAF arriving after fallback must not paint again.
  for(const frame of f.frames.splice(0))frame();
  assert.deepEqual(f.counts,[1,1]);
  f.setClock(1900);f.windowHandlers.get('focus')();
  f.runTimers(1100);
  assert.deepEqual(f.counts,[2,2]);
  f.dispose();
});

test('v8.7.10: background and WebGL loss invalidate suspended frame callbacks',()=>{
  const f=fixture({framesFrozen:true});
  f.windowHandlers.get('pageshow')();
  f.doc.hidden=true;f.documentHandlers.get('visibilitychange')();
  f.runTimers(1100);
  assert.deepEqual(f.counts,[0,0]);
  f.doc.hidden=false;
  f.windowHandlers.get('pageshow')();
  f.canvasHandlers.get('webglcontextlost')({preventDefault(){}});
  assert.equal(f.app.dataset.dj875GraphicsLost,'true');
  f.runTimers(1100);
  assert.deepEqual(f.counts,[0,0]);
  f.canvasHandlers.get('webglcontextrestored')();
  f.runTimers(1100);
  assert.deepEqual(f.counts,[1,1]);
  assert.equal(f.app.dataset.dj875GraphicsLost,undefined);
  f.dispose();
  assert.equal(f.windowHandlers.size,0);
  assert.equal(f.documentHandlers.size,0);
  assert.equal(f.canvasHandlers.size,0);
  assert.ok(f.tasks.every(task=>task.cancelled));
});

test('v8.7.10: foreground follow-ups coalesce and do not survive dispose',()=>{
  const f=fixture();
  f.windowHandlers.get('pageshow')();
  f.windowHandlers.get('pageshow')();
  f.windowHandlers.get('pageshow')();
  assert.equal(f.tasks.filter(t=>t.ms===700&&!t.cancelled).length,1);
  f.dispose();
  f.runTimers(700);
  assert.deepEqual(f.counts,[1,1]);
});

test('v8.7.10: current transport pin and focus contracts are behavior-checked, not historical SHA',()=>{
  assert.deepEqual(transportPinCoordinates({lng:126.927,lat:37.507}),[126.927,37.507]);
  assert.equal(transportPinCoordinates({lng:1,lat:2}),null);
  assert.equal(transportPinCoordinates({lng:'invalid',lat:37.507}),null);
  const high=mobileTransportFocusOffset({viewportHeight:844,panelTop:520,containerTop:0});
  const low=mobileTransportFocusOffset({viewportHeight:844,panelTop:360,containerTop:0});
  assert.ok(Number.isFinite(high)&&Number.isFinite(low));
  assert.ok(low<high,'taller bottom sheet must move selection focus upward');
});

test('v8.7.10: current panel-close contract clears blocking layer, ARIA, and stale exit class',()=>{
  const classes=new Set(['map-controls-open']);
  const app={classList:{remove:v=>classes.delete(v)}};
  const panelClasses=new Set(['dj875-map-options-exiting']);
  const el=()=>({hidden:false,attrs:{},setAttribute(n,v){this.attrs[n]=v;},classList:{remove:v=>panelClasses.delete(v)}});
  const nodes=Object.fromEntries(['map-advanced-controls','map-options-backdrop','map-tools-toggle','mobile-webapp-help'].map(k=>[k,el()]));
  const doc={getElementById:k=>nodes[k]};
  assert.equal(closeClassControlledSurface({id:'map-advanced-controls',doc,app}),true);
  assert.equal(classes.has('map-controls-open'),false);
  assert.equal(panelClasses.has('dj875-map-options-exiting'),false);
  assert.equal(nodes['map-options-backdrop'].hidden,true);
  assert.equal(nodes['map-tools-toggle'].attrs['aria-expanded'],'false');
  assert.equal(nodes['map-advanced-controls'].attrs['aria-hidden'],'true');
});
