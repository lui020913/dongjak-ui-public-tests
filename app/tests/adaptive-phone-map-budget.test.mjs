
import test from 'node:test';import assert from 'node:assert/strict';
import {phoneProfile,normalMapPixelRatio,nextBudget,offscreenEvictionIds,coalesceViewportWork,installPhoneRenderBudget} from '../src/adaptive-phone-map-budget.mjs';
test('Note9 uses economy, recent iPhone unchanged',()=>{assert.equal(phoneProfile({phone:true,ua:'Android 10; SM-N960N'}),'economy');assert.equal(phoneProfile({phone:true,ua:'Android 15',memory:3}),'economy');assert.equal(phoneProfile({phone:true,ua:'iPhone OS 18',memory:4}),'normal');assert.equal(phoneProfile({phone:false,ua:'Android 10'}),'normal');});
test('slow frames lower budget and sustained fast frames recover',()=>{let s={level:'normal'};for(let i=0;i<7;i++)s=nextBudget(s,35);assert.equal(s.level,'normal');s=nextBudget(s,35);assert.equal(s.level,'economy');for(let i=0;i<119;i++)s=nextBudget(s,16);assert.equal(s.level,'economy');s=nextBudget(s,16);assert.equal(s.level,'normal');});
test('visible sheets protected',()=>{assert.deepEqual(offscreenEvictionIds(['a','b','c','d','e'],['b','e'],1),['a','c']);assert.deepEqual(offscreenEvictionIds(['a','b'],['a','b'],0),[]);});
test('viewport events coalesce',()=>{let cb,moving=true,calls=[];const w=coalesceViewportWork(f=>calls.push(f),{isMoving:()=>moving,setTimer:f=>(cb=f,1),clearTimer:()=>{cb=null;}});w.request();w.request(true);w.request();cb();assert.deepEqual(calls,[]);moving=false;cb();assert.deepEqual(calls,[true]);w.cancel();});
test('resolution changes only at gesture end',()=>{const handlers=new Map(),ratios=[];let t=0;const map={on:(k,v)=>handlers.set(k,v),off:k=>handlers.delete(k),setPixelRatio:r=>ratios.push(r),getPixelRatio:()=>1.5};const app={dataset:{},classList:{toggle(){},remove(){}}};const b=installPhoneRenderBudget({map,app,normalRatio:3,now:()=>t});handlers.get('movestart')();for(let i=0;i<12;i++){t+=40;handlers.get('render')();}assert.deepEqual(ratios,[]);handlers.get('moveend')();assert.deepEqual(ratios,[2]);assert.equal(b.stats().profile,'economy');b.destroy();assert.equal(handlers.size,0);});

test('primary style, elevation, night building occlusion and emergency status remain distinct',async()=>{
 const {readFileSync}=await import('node:fs');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/style: 'https:\/\/tiles\.openfreemap\.org\/styles\/bright'/);
 assert.match(main,/map\.setTerrain\(\{source:'dongjak-terrain-dem',exaggeration:1\.0\}\)/);
 assert.match(main,/djBasemapSource=mapStyleRecovered\?'emergency-osm':'openfreemap-bright'/);
 assert.match(main,/if\(mapStyleRecovered\)toast\(/);
 assert.doesNotMatch(main,/movementIsSlow|interactiveMoving|slowSamples/);
 assert.match(main,/nextBuildingPitchMode\(buildingPitchActive,pitch,PITCH_BUILDING_START,PITCH_BUILDING_EXIT\)/);
 assert.match(main,/nightOcclusionBuildingPaint\(/);
 assert.match(main,/attributeFilter:\['data-sangdo-night'\]/);
});

test('HUD scale docking never fights the active phone renderer for MapLibre DPR',async()=>{
 const {installScaleDocking}=await import('../src/map-scale-docking.js');
 const originalWindow=globalThis.window;
 const originalRaf=globalThis.requestAnimationFrame;
 const listeners=new Map(),handlers=new Map(),applied=[];let repeatedMoveClasses=0;
 const mockWindow={
  innerWidth:390,innerHeight:844,devicePixelRatio:3,navigator:{deviceMemory:8},
  matchMedia:()=>({matches:true}),
  addEventListener:(type,cb)=>listeners.set(type,cb),
  removeEventListener:type=>listeners.delete(type)
 };
 const doc={querySelectorAll:()=>[]};
 const cssStyle={removeProperty(){}};
 const app={ownerDocument:doc,dataset:{tab:'map',djPhoneBudget:'normal'},
  querySelector:()=>null,addEventListener(){},removeEventListener(){},
  classList:{add(){repeatedMoveClasses++},remove(){}},style:cssStyle};
 const container={querySelector:()=>null};
 const map={on:(type,cb)=>handlers.set(type,cb),off:type=>handlers.delete(type),
  getContainer:()=>container,getPixelRatio:()=>1.25,setPixelRatio:value=>applied.push(value),
  isMoving:()=>false};
 const overview={style:cssStyle};
 try{
  globalThis.window=mockWindow;globalThis.requestAnimationFrame=()=>1;
  const dispose=installScaleDocking({map,app,overview});
  handlers.get('movestart')();handlers.get('moveend')();listeners.get('resize')();
  assert.deepEqual(applied,[],'phone DPR belongs to adaptive phone render policy, not HUD');
  assert.equal(repeatedMoveClasses,0,'HUD must not set a competing phone motion class');
  dispose();
  delete app.dataset.djPhoneBudget;
  const fallback=installScaleDocking({map,app,overview});
  assert.ok(applied.length>0,'other device profiles still use existing HUD quality policy');
  fallback();
 }finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalRaf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=originalRaf;
 }
});

test('high-density phone rendering is capped at 2.5x without upscaling lower DPR devices',()=>{
 assert.equal(normalMapPixelRatio({phone:true,ua:'iPhone OS 18_2',deviceRatio:3}),2.5);
 assert.equal(normalMapPixelRatio({phone:true,memory:8,deviceRatio:4}),2.5);
 assert.equal(normalMapPixelRatio({phone:true,memory:8,deviceRatio:2}),2);
 assert.equal(normalMapPixelRatio({phone:true,deviceRatio:3}),2);
 assert.equal(normalMapPixelRatio({phone:false,deviceRatio:3}),1.5);
});
test('normal mobile cache retains visible tiles plus at most six offscreen tiles',()=>{
 const entries=Array.from({length:15},(_,i)=>String(i));
 const visible=['0','5','8'];
 const removed=offscreenEvictionIds(entries,visible,6);
 assert.equal(removed.length,6);
 assert.ok(removed.every(id=>!visible.includes(id)));
});
test('transit teardown removes owned map layers before sources and defers tile work',async()=>{
 const {readFileSync}=await import('node:fs');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const clear=main.split('function clearTransitPreview(){')[1].split('function syncPriRouteLine(){')[0];
 assert.match(clear,/syncTransitExterior\(\)/);
 assert.ok(clear.indexOf('map.removeLayer')<clear.indexOf('map.removeSource'));
 assert.match(clear,/-focus-casing/);
 assert.match(main,/offscreenEvictionIds\(\[\.\.\.loadedBuildingTiles.keys\(\)\],visible,djRenderBudget.isEconomy\(\)\?2:6\)/);
});

test('transit mode changes only district display and camera extent, not shared basemap filters or buildings',async()=>{
 const {readFileSync}=await import('node:fs');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const scope=main.split('function syncTransitExterior(force=false){')[1].split('function clearTransitPreview(){')[0];
 assert.match(scope,/syncTransitContextBounds\(active\)/);
 assert.match(main,/active\?transitContextBounds\(bufferedDistrictBounds\(boundaryGeometry,0\)/);
 assert.doesNotMatch(scope,/setPaintProperty|setLayoutProperty|setTerrain/);
 assert.match(scope,/transitHomeCamera/);
 assert.doesNotMatch(scope,/setFilter|setStyle|restoreBasemapLabelsOutsideDistrict|clipBasemapLabelsToDistrict|syncTiltWithBuildings|line-dasharray/);
 const building=main.split('function visibleBuilding3D(){')[1].split('function syncTiltWithBuildings')[0];
 assert.doesNotMatch(building,/djTransitExterior/);
 const focus=main.split('function focusTransitRoute(coords){')[1].split('function setTransitPreviewStops')[0];
 assert.doesNotMatch(focus,/transport-schematic-subway|transport-real-rail-overview|setLayoutProperty/);
});
