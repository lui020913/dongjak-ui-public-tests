import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMobileSheetCoordinator} from '../src/v880-sheet-state.js';
import {installBasemapBusStopFallback} from '../src/transport-map.js';
import {transportPinCoordinates,mobileTransportFocusOffset} from '../src/transport-selection-marker.js';
import {closeClassControlledSurface} from '../src/window-surface-cleanup.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function classes(initial=[]){const state=new Set(initial);return {
  state,add:k=>state.add(k),remove:k=>state.delete(k),contains:k=>state.has(k),
  toggle(k,force){const next=force===undefined?!state.has(k):force;if(next)state.add(k);else state.delete(k);return next;}
};}
function panel(name){const attrs={};const button={setAttribute:(k,v)=>{attrs[k]=v;}};return {
  name,hidden:false,classList:classes(),querySelector:k=>k==='.dj877-expand-button'?button:null,attrs,
};}
function fixture({mobile=true,frameFrozen=false}={}){
  const p1=panel('route'),p2=panel('transport'),classesApp=classes();
  const styleVars=new Map();const timers=[],frames=[];let navHeight=82;
  const app={classList:classesApp,style:{setProperty:(k,v)=>styleVars.set(k,v),removeProperty:k=>styleVars.delete(k)}};
  const nav={hidden:false,getBoundingClientRect:()=>({height:navHeight})};
  const win={matchMedia:()=>({matches:mobile}),requestAnimationFrame(fn){if(frameFrozen){frames.push(fn);return frames.length;}return 0;},
    cancelAnimationFrame(){},setTimeout(fn){const timer={fn,cancelled:false};timers.push(timer);return timer;},
    clearTimeout(timer){timer.cancelled=true;}};
  const controller=createMobileSheetCoordinator({app,doc:{},win,panels:[p1,p2],nav});
  return {p1,p2,app,nav,controller,timers,frames,styleVars,setNavHeight:n=>{navHeight=n;},setMobile:v=>{mobile=v;}};
}
test('v8.8.0: mobile expansion is exclusive and controls ARIA state',()=>{
  const f=fixture();assert.equal(f.controller.toggle(f.p1),true);
  assert.equal(f.p1.attrs['aria-expanded'],'true');assert.equal(f.p1.attrs['aria-label'],'창 작게 접기');
  assert.ok(f.app.classList.contains('dj877-any-expanded'));
  assert.equal(f.controller.toggle(f.p2),true);assert.equal(f.p1.classList.contains('dj871-sheet-expanded'),false);
  assert.equal(f.p1.attrs['aria-pressed'],'false');assert.equal(f.p2.attrs['aria-pressed'],'true');
  assert.equal(f.controller.toggle(f.p2),false);assert.equal(f.app.classList.contains('dj877-any-expanded'),false);
  f.controller.dispose();
});
test('v8.8.0: hidden sheet cannot keep fullscreen and false ARIA state',()=>{
  const f=fixture();f.controller.toggle(f.p1);f.p1.hidden=true;f.controller.sync();
  assert.equal(f.p1.classList.contains('dj871-sheet-expanded'),false);
  assert.equal(f.p1.attrs['aria-expanded'],'false');
  assert.equal(f.controller.toggle(f.p1),false);f.controller.dispose();
});
test('v8.8.0: switching desktop width closes stale expanded mobile overlay',()=>{
  const f=fixture();f.controller.toggle(f.p1);f.setMobile(false);f.controller.sync();
  assert.equal(f.p1.classList.contains('dj871-sheet-expanded'),false);
  assert.equal(f.app.classList.contains('dj877-any-expanded'),false);
  assert.equal(f.controller.toggle(f.p1),false);f.controller.dispose();
});
test('v8.8.0: navigation bar height remeasures when rotated or resized',()=>{
  const f=fixture();assert.equal(f.styleVars.get('--dj877-nav-height'),'82px');
  f.setNavHeight(104);f.controller.sync();assert.equal(f.styleVars.get('--dj877-nav-height'),'104px');
  f.nav.hidden=true;f.controller.sync();assert.equal(f.styleVars.get('--dj877-nav-height'),'0px');f.controller.dispose();
  assert.equal(f.styleVars.has('--dj877-nav-height'),false);
});
test('v8.8.0: suspended animation frame cannot block viewport restoration',()=>{
  const f=fixture({frameFrozen:true});f.p1.classList.add('dj871-sheet-expanded');f.controller.schedule();
  assert.equal(f.app.classList.contains('dj877-any-expanded'),false);
  for(const t of f.timers.filter(t=>!t.cancelled))t.fn();
  assert.equal(f.app.classList.contains('dj877-any-expanded'),true);
  for(const callback of f.frames)callback();assert.equal(f.p1.attrs['aria-pressed'],'true');
  f.controller.dispose();assert.ok(f.timers.every(t=>t.cancelled));
});
test('v8.8.0: a disposed sheet coordinator cannot reactivate old state',()=>{
  const f=fixture();f.controller.toggle(f.p1);f.controller.dispose();
  assert.equal(f.controller.toggle(f.p2),false);
  assert.equal(f.app.classList.contains('dj877-any-expanded'),false);
});
test('v8.8.0: mobile fullscreen CSS is scoped and keeps sticky header/inner scrolling',()=>{
  const css=source('src/v880-unified-sheet.css');
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/dj871-sheet-expanded:not\(\[hidden\]\)/);
  assert.match(css,/env\(safe-area-inset-top/);
  assert.match(css,/var\(--dj877-nav-height/);
  assert.match(css,/\.dj875-transit-scroll/);
  assert.match(css,/overscroll-behavior:contain/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  const implementation=source('src/v877-mobile-settings.js');
  assert.match(implementation,/createMobileSheetCoordinator/);
  assert.match(implementation,/panel\.querySelector\('\.dj877-expand-button'\)\?\.remove\(\)/);
  assert.doesNotMatch(implementation,/coordinator\.toggle\(panel\)/);
  const controller=source('src/dj-v8212-sheet-controller.js');
  assert.match(controller,/setMobileSheetExpanded\(panel,true,doc,win\)/);
  assert.match(controller,/setMobileSheetExpanded\(panel,false,doc,win\)/);
  assert.match(controller,/settleMobileSheetDrag\(panel,win\)/);
  const motion=source('src/v889-mobile-sheet-motion.js');
  assert.match(motion,/translate/);
  assert.match(motion,/clip-path/);
  assert.match(motion,/expandedRect.height-compactRect.height/);
  assert.match(motion,/interruptMobileSheetMotion/);
  assert.match(controller,/interruptMobileSheetMotion\(panel\)/);
  assert.match(motion,/prefers-reduced-motion/);
  assert.match(controller,/:scope > \.handle/);
  const stability=source('src/v875-mobile-stability.js');
  assert.doesNotMatch(stability,/panel\.classList\.add\('dj871-sheet-expanded'\)/);
  assert.doesNotMatch(stability,/closeTransportPanel/);
  assert.match(source('src/v877-mobile-settings.js'),/v889-mobile-visual-polish\.css/);
  const polish=source('src/v889-mobile-visual-polish.css');
  assert.match(polish,/align-items:center/);
  assert.match(polish,/:is\(#route-panel,#participation-panel,#news-panel,#mine-panel,#transport-sheet\)\.dj-sheet-dragging:not\(\[hidden\]\)/);
  assert.match(polish,/translate:0 var\(--dj-sheet-drag-y,0px\)/);
  assert.match(implementation,/orientationchange/);
  assert.match(implementation,/visualViewport/);
});
test('v8.8.0: transport background bus layer keeps the real vector source',()=>{
  let layer=null;
  const map={getLayer:()=>null,hasImage:k=>k==='dj-bus-blue-marker',
    getStyle:()=>({layers:[{id:'poi_transit',type:'symbol',source:'original-poi-tiles','source-layer':'poi'}]}),
    addLayer:value=>{layer=value;}};
  assert.equal(installBasemapBusStopFallback(map),true);
  assert.equal(layer.source,'original-poi-tiles');assert.equal(layer['source-layer'],'poi');
  assert.equal(layer.type,'symbol');assert.equal(layer.minzoom,16.4);
  assert.equal(layer.layout['icon-allow-overlap'],true);
});
test('v8.8.0: current selected transit pin rejects invalid geographic coordinates',()=>{
  assert.deepEqual(transportPinCoordinates({lng:126.9,lat:37.5}),[126.9,37.5]);
  assert.equal(transportPinCoordinates({lng:NaN,lat:37.5}),null);
  assert.equal(transportPinCoordinates({lng:126.9,lat:-92}),null);
});
test('v8.8.0: increased sheet occlusion moves map focus upward',()=>{
  const tall=mobileTransportFocusOffset({viewportHeight:844,panelTop:320,containerTop:0});
  const short=mobileTransportFocusOffset({viewportHeight:844,panelTop:550,containerTop:0});
  assert.ok(tall<short);
});
test('v8.8.0: closing map-options resets blocking, backdrop and keyboard accessibility',()=>{
  const active=classes(['map-controls-open']);const app={classList:active};
  const nodes={};for(const id of ['map-advanced-controls','map-options-backdrop','map-tools-toggle','mobile-webapp-help']){
    const cls=classes(['dj875-map-options-exiting']);nodes[id]={hidden:false,classList:cls,attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  }
  const doc={getElementById:id=>nodes[id]};
  assert.equal(closeClassControlledSurface({id:'map-advanced-controls',doc,app}),true);
  assert.equal(active.contains('map-controls-open'),false);
  assert.equal(nodes['map-options-backdrop'].hidden,true);
  assert.equal(nodes['map-tools-toggle'].attrs['aria-expanded'],'false');
});
test('v8.8.0: historical SHA assertions remain accessible as a separate intentional audit',()=>{
  const helper=source('tests/support/historical-snapshot-audit.mjs');
  const audit=source('scripts/audit-historical-baselines.mjs');
  assert.match(helper,/DJ_HISTORICAL_SNAPSHOT_AUDIT/);
  assert.match(audit,/DJ_HISTORICAL_SNAPSHOT_AUDIT:'1'/);
  assert.match(source('src/main.js'),/installMapResumeRecovery/);
});
