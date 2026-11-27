import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHONE_CHOICES,PHONE_UNAVAILABLE_LAYERS,normalizePhoneShortcuts,layerDragFrame} from '../src/mobile-next.js';
import {DongjakWalkSlopeRouter} from '../src/lib/dongjakWalkSlopeRouter.mjs';
import {computeMultiStopRoutes,railTransferOptions} from '../src/v815-route-planner.js';
const load=p=>JSON.parse(readFileSync(new URL('../public/'+p,import.meta.url),'utf8'));
test('phone shortcuts reject unknown entries and duplicates and persist at most three',()=>{
 assert.deepEqual(normalizePhoneShortcuts(null),[]);
 assert.deepEqual(normalizePhoneShortcuts(['pri','pri','invalid','slope','width','aed']),['pri','slope','width']);
 assert.equal(new Set(PHONE_CHOICES.map(x=>x[0])).size,PHONE_CHOICES.length);
 assert.ok(PHONE_CHOICES.every(x=>x[3].startsWith('#')||x[3].startsWith('[')));
});
test('balanced mode computes an actual path from supplied pedestrian link and slope data',()=>{
 const router=new DongjakWalkSlopeRouter(load('data/safety/walk/dongjak_walk_graph.json'),load('data/safety/slope/dongjak_walk_slope_by_link.json'));
 const a=[126.960,37.510],b=[126.962,37.512];
 const paths=['shortest','gentle','balanced'].map(mode=>router.route(a,b,{mode,maxSnapMeters:85}));
 for(const r of paths){
  assert.ok(r.geojson.geometry.coordinates.length>2);
  assert.ok(r.distanceMeters>0&&r.estimatedMinutes>0);
  assert.ok(Number.isFinite(r.estimatedTerrainAscentM));
  assert.ok(r.startSnapMeters<=85&&r.endSnapMeters<=85);
 }
 const balanced=paths[2];assert.equal(balanced.mode,'balanced');
 assert.ok(balanced.cost>=balanced.distanceMeters-.2);
 assert.ok(balanced.warnings.some(w=>w.includes('not a verified PRI')));
 assert.throws(()=>router.route([128,38],b,{mode:'balanced',maxSnapMeters:85}),/NETWORK_TOO_FAR/);
});
test('multi-stop balanced variants are not invented when a segment is missing',async()=>{
 const a={lng:126.94,lat:37.5},b={lng:126.95,lat:37.5},c={lng:126.96,lat:37.5};
 const leg=(s,e)=>({coords:[[s.lng,s.lat],[e.lng,e.lat]],source:'seoul-pedestrian-graph',seconds:60,kilometers:.1,vehiclePermittedM:30});
 const incomplete=await computeMultiStopRoutes([a,b,c],async(s,e)=>({standard:leg(s,e),balanced:s===a?leg(s,e):null}));
 assert.equal(incomplete.balanced,null);
 const complete=await computeMultiStopRoutes([a,b,c],async(s,e)=>({standard:leg(s,e),balanced:leg(s,e)}));
 assert.equal(complete.balanced.coords.length,3);
 assert.equal(complete.balanced.vehiclePermittedM,60);
 assert.equal(complete.balanced.routeMode,'balanced');
});
test('rail connection remains a clearly indicative plan and requires real nearby stations',()=>{
 const options=railTransferOptions({lng:126.94791,lat:37.502834},{lng:126.941005,lat:37.513534});
 assert.ok(options.length>0);assert.ok(Number.isFinite(options[0].indicativeMinutes));
 assert.ok(options[0].railHeuristicMinutes>0);
 assert.deepEqual(railTransferOptions({lng:125,lat:35},{lng:128,lat:39}),[]);
});

test('visible custom phone buttons explicitly own pointer hit-testing; hidden tabs do not',()=>{
 const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 assert.match(css,/\[data-tab="map"\]:not\(\[data-search-open="true"\]\)[^{]+#djNext-rail button\.djNext-tool\{pointer-events:auto!important;touch-action:manipulation!important\}/);
 assert.match(css,/:is\(:not\(\[data-tab="map"\]\),\[data-search-open="true"\],\[data-dj-search-entry="1"\]\)[^{]+#djNext-rail button\.djNext-tool\{pointer-events:none!important;visibility:hidden!important\}/);
});

test('new rail is independent and road width is selectable in the layer window',()=>{
 const src=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');
 assert.match(src,/host\.id='djNext-toolbar'/);
 assert.match(src,/app\.append\(host\)/);
 assert.doesNotMatch(src,/host=next;rail=/);
 assert.ok(PHONE_CHOICES.some(c=>c[0]==='width'));
 assert.match(readFileSync(new URL('../src/v831-swipe-feature-toolbar.js',import.meta.url),'utf8'),/map-road-width.*toggle-road-width/);
 assert.match(src,/invoke\('#weather-label'\)/);
 assert.doesNotMatch(src,/invoke\('#dj-v794-weather'\)/);
});
test('photo-reference layout has four columns and separately clipped scroll content',()=>{
 const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 assert.match(css,/\.djNext-layer-grid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);assert.ok(!css.includes('.djNext-layer-tile{'));
 assert.match(css,/\.djNext-layer-scroll\{overflow:auto/);
 assert.match(css,/djNextSheetIn 350ms cubic-bezier\(\.25,\.20,\.40,1\)/);
 assert.match(css,/djNextSheetOut 300ms cubic-bezier\(\.25,\.20,\.40,1\)/);
 assert.doesNotMatch(css,/djNextBackdrop(?:In|Out)/);
 assert.match(css,/opacity:1!important;transition:none!important;animation:djNextSheetIn/);
 assert.match(css,/@keyframes djNextSheetIn\{from\{transform:translateY\(100%\)\}to\{transform:translateY\(0\)\}\}/);
 assert.match(css,/\.djNext-form-scroll\{min-height:0;overflow:auto/);
 assert.match(css,/\.djNext-safety-scroll\{flex:1 1 auto;min-height:0;overflow:auto/);
 const pilot=readFileSync(new URL('../src/mobile-17-followup.js',import.meta.url),'utf8');
 assert.match(pilot,/map\.getLayer\(fill\)&&map\.getLayer\(line\)&&map\.getLayer\(lockLayer\)\)\{toggleLayers\(true\);return\}/);
});

test('phone rail owns its interaction before legacy document delegates',()=>{
 const src=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');
 assert.match(src,/const railActions=new WeakMap\(\)/);
 assert.match(src,/e\.target\.closest\?\.\('#djNext-rail button\.djNext-tool'\)/);
 assert.match(src,/const run=railActions\.get\(b\);if\(!run\)return;[\s\S]*?e\.stopImmediatePropagation\(\);[\s\S]*?run\(e\);return;/);
});

test('explicit layer, permission and weather opens are authorized before hidden state changes',async()=>{
 const {createWindowLifecycle}=await import('../src/window-lifecycle-state.js');
 let now=1000;
 const lifecycle=createWindowLifecycle({now:()=>now});
 lifecycle.requestOpen('mine-panel',{explicit:true});
 lifecycle.dismiss('mine-panel');
 now+=40;
 assert.equal(lifecycle.requestOpen('djNext-layer-panel',{origin:'automatic'}),false);
 assert.equal(lifecycle.requestOpen('djNext-layer-panel',{explicit:true}),true);
 const src=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');
 assert.match(src,/scroll\.scrollTop=0;win\.DongjakWindowLifecycle\?\.requestOpen\(panel\.id\);panel\.hidden=false/);
 assert.match(src,/after=e\.detail\?\.continue\|\|null;win\.DongjakWindowLifecycle\?\.requestOpen\(panel\.id\);panel\.hidden=false/);
 const weather=readFileSync(new URL('../src/v854-weather-desktop.js',import.meta.url),'utf8');
 assert.match(weather,/sync\(\);win\.DongjakWindowLifecycle\?\.requestOpen\(sheet\.id\);sheet\.hidden=false/);
 assert.equal(lifecycle.requestOpen('unrequested-dialog',{origin:'automatic'}),false);
});

test('shared bottom sheet motion has exact endpoints, gradual initial acceleration and no fade',async()=>{
 const {WINDOW_MOTION,windowMotionProgress,windowMotionFrame}=await import('../src/mobile-window-motion.js');
 assert.deepEqual(WINDOW_MOTION,{open:350,close:300,easing:'cubic-bezier(.25,.20,.40,1)'});
 assert.equal(windowMotionProgress(0),0);assert.equal(windowMotionProgress(1),1);
 assert.ok(windowMotionProgress(.1)>.08&&windowMotionProgress(.1)<.18);assert.ok(windowMotionProgress(.5)>.65&&windowMotionProgress(.5)<.85);assert.ok(1-windowMotionProgress(.9)<.03);
 for(let i=0;i<=100;i++){const p=i/100,a=windowMotionFrame(p,true,200,200,true),b=windowMotionFrame(p,false,200,200,true);assert.equal(a.opacity,1);assert.equal(b.opacity,1);assert.ok(Math.abs(a.offset+b.offset-200)<.0001);assert.equal(a.clip,a.offset);}
 const js=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8'),coordinator=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
 assert.match(js,/DongjakWindowMotion\?\.open\(body\)/);assert.match(js,/DongjakWindowMotion\.close\(body,finishClose\)/);
 assert.match(coordinator,/const slideDuration=opening\?WINDOW_MOTION\.open:WINDOW_MOTION\.close/);
 assert.doesNotMatch(coordinator,/fadeOnlyMobileIds/);
});


test('layer header height follows the finger, then translates below compact',()=>{
 assert.deepEqual(layerDragFrame(600,-80,600,780),{height:680,offset:0});
 assert.deepEqual(layerDragFrame(780,100,600,780),{height:680,offset:0});
 assert.deepEqual(layerDragFrame(600,120,600,780),{height:600,offset:120});
 assert.deepEqual(layerDragFrame(600,-500,600,780),{height:780,offset:0});
});

test('V11 dark sheets and centered guide inherit the established charcoal surface token',()=>{
 const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 assert.match(css, /#app\[data-theme="dark"\]\{--djNext-surface:#2c343d;/);
 assert.match(css, /--dj-v4-surface:var\(--djNext-surface,#2c343d\);/);
 assert.match(css, /#map-gesture-guide\{background:var\(--dj-v4-surface\)!important/);
 assert.doesNotMatch(css, /#191b1e\b/i);
});

test('phone repair keeps the optional permission controls and their status in one button',()=>{
 const js=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 assert.match(js,/<button type="button" data-permission="location" aria-label="위치 권한 허용"><span>위치 권한 허용<\/span><small role="status"/);
 assert.match(js,/djNext-permission-skip'\)\.addEventListener\('click',continueIntro\)/);
 assert.match(css,/#map-quick-search-dropdown\[hidden\]\{display:none!important\}/);
 assert.match(css,/#news-panel \[data-news-source\]\[aria-pressed="true"\]\{background:var\(--djNext-active\)/);
});
test('pilot visuals follow drawer rather than selected overlays',()=>{
 const js=readFileSync(new URL('../src/mobile-17-followup.js',import.meta.url),'utf8');
 assert.match(js,/const wanted=app\.dataset\.tab==='map'&&app\.classList\.contains\('map-safety-open'\)/);
 assert.match(js,/attributeFilter:\['class','aria-pressed','data-tab','hidden'\]/);
});


test('six-slot phone toolbar retains the fixed layer button and a separate scrollable five-slot rail',()=>{const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');const src=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');assert.ok(css.includes('grid-template-columns:minmax(0,1fr) var(--djNext-tool-size)'));assert.ok(css.includes('height:54px!important;max-height:54px!important'));assert.ok(css.includes('touch-action:pan-x'));assert.ok(css.includes('mask-image:none'));assert.equal(css.includes('mask-image:linear-gradient'),false);assert.ok(src.includes('selected.length<2?selected.length+1:selected.length'));assert.ok(src.includes('toolScroll.append(b)'));assert.ok(src.includes('rail.append(layers)'));});


test('actual action buttons share tactile material while selection and accessibility are retained',()=>{const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');const material=readFileSync(new URL('../src/button-material.css',import.meta.url),'utf8');assert.ok(material.includes('--djNext-tool-pressed:'));assert.ok(material.includes('--djNext-tool-shadow:0 1px 3px'));assert.ok(!css.includes('--djNext-tool-shadow:'));assert.ok(css.includes('box-shadow:var(--djNext-tool-pressed)!important'));assert.ok(css.includes('.map-actions>button,.map-chrome-restore'));assert.ok(css.includes(':not([role="switch"]):not([role="tab"]):not(:focus-visible)'));assert.match(css,/\.djNext-layer-action\[aria-pressed="true"\]\{background:var\(--djNext-tool-primary\)!important;border-color:var\(--djNext-tool-primary-edge\)!important;color:#fff!important\}/);assert.match(css,/\.djNext-layer-action:active:not\(:disabled\)\{box-shadow:var\(--djNext-tool-pressed\)!important\}/);assert.match(css,/\.djNext-layer-action:focus-visible\{outline:2px solid var\(--djNext-active\)!important/);assert.ok(css.includes('#bottom-nav[data-dj-motion-indicator="ready"]>.nav-tab{background:transparent!important;box-shadow:none!important'));});

test('voice search has an inline status, native permission request and no duplicate capture',()=>{
 const js=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 const voice=js.slice(js.indexOf("const voicePanel=doc.createElement('div');voicePanel.id='djNext-voice-panel'"),js.indexOf('export function installPhoneRouteComparison'));
 assert.ok(voice.includes('voicePanel.append(wave,feedback);form.append(voicePanel)'));assert.ok(voice.includes('djNext-voice-wave'));assert.ok(voice.includes('r.start()'));assert.ok(voice.includes("app.dataset.djVoiceListening='true'"));assert.ok(voice.includes('r.interimResults=true'));assert.ok(!voice.includes('await win.navigator.mediaDevices.getUserMedia'));
 assert.ok(css.includes('.topbar>.header-tools:has(#dj890-ai-orb){'));
  assert.ok(!css.includes(':is([data-search-open="true"],[data-dj-voice-feedback="true"]) .topbar>.header-tools:has(#dj890-ai-orb)'));
  assert.ok(css.includes('flex-basis 250ms'));assert.ok(css.includes('position:static!important;display:block!important;background:none!important'));assert.ok(css.includes('--dj-voice-extra:82px'));assert.ok(css.includes('--dj-map-search-control-size:54px'));assert.ok(css.includes('height:calc(var(--dj-map-search-control-size,54px) + var(--dj-voice-extra))'));assert.ok(css.includes('height:var(--dj-map-search-control-size,54px)!important;min-height:var(--dj-map-search-control-size,54px)!important;max-height:var(--dj-map-search-control-size,54px)!important'));
});
test('AI dialogue preserves evidence per turn and occupies the viewport',()=>{
 const js=readFileSync(new URL('../src/v880-supabase-safety-ai.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/v880-supabase-safety-ai.css',import.meta.url),'utf8');
 assert.ok(js.includes('transcript.append(user,turn)'));assert.ok(js.includes("client.functions.invoke('dongjak-safety-ai',{body:{query,explanation:profile}})"));assert.ok(js.includes('composer.append(form,foot)'));assert.ok(css.includes('height:var(--dj891-ai-visible-height,100dvh)!important'));assert.ok(css.includes('.dj-ai-transcript{flex:1 1 0'));
});

test('compact metro has one layout owner and a single content scroll',()=>{const js=readFileSync(new URL('../src/v875-mobile-stability.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');assert.ok(js.includes("panel.dataset.djTransportLayout='compact-v2'"));assert.ok(css.includes('[data-dj-transport-layout="compact-v2"][data-kind="subway"]'));assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));const metro=css.split('\n').filter(line=>line.includes('[data-dj-transport-layout="compact-v2"][data-kind="subway"]'));const row=metro.find(line=>line.includes('.metro-arrival-direction-group .transport-arrival-row{'));const eta=metro.find(line=>line.includes('.metro-arrival-time-block{'));const countdown=metro.find(line=>line.includes('.metro-arrival-countdown{'));assert.match(row,/flex-direction:row!important/);assert.match(row,/min-height:42px!important/);assert.match(eta,/text-align:right!important/);assert.match(countdown,/font-size:13px!important;line-height:1\.35!important/);});

test('button material is shared across app, AI and entry gate',()=>{const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');const tokens=read('button-material.css');assert.ok(tokens.includes(':root:is([data-theme="dark"],:has(#app[data-theme="dark"]))'));assert.ok(read('main.js').includes("import './button-material.css';"));for(const file of ['mobile-next.css','v880-supabase-safety-ai.css','browser-install-menu.css']){const css=read(file);assert.ok(css.includes('var(--djNext-tool-shadow)'));assert.ok(css.includes('var(--djNext-tool-pressed)'));assert.ok(!css.includes('--dj-entry-raised:'));} });

test('layer rows retain one pill control and independent shortcut switch',()=>{const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8'),js=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');assert.ok(css.includes('grid-template-columns:minmax(0,1fr) 58px!important'));assert.ok(css.includes('border-radius:var(--djNext-tool-pill)!important'));assert.ok(js.includes("glyph.classList.add('djNext-layer-glyph')"));assert.ok(js.includes("pinHeading.textContent='상단 고정'"));assert.ok(js.includes("add.setAttribute('aria-label',label+' 상단 바로가기 고정')"));assert.ok(!js.includes('djNext-shortcut-caption'));assert.ok(js.includes("line.append(action,add)"));});

test('unavailable incident and enforcement camera layers are visible but cannot be pinned',()=>{
 assert.deepEqual([...PHONE_UNAVAILABLE_LAYERS],['incidents','camera']);
 assert.deepEqual(normalizePhoneShortcuts(['incidents','camera','zone','sdot','pri']),['pri']);
 assert.ok(PHONE_CHOICES.some(c=>c[0]==='incidents'));
 assert.ok(PHONE_CHOICES.some(c=>c[0]==='camera'));
 assert.ok(PHONE_CHOICES.every(c=>!['zone','sdot'].includes(c[0])));
 const js=readFileSync(new URL('../src/mobile-next.js',import.meta.url),'utf8');
 assert.match(js,/add\.disabled=unavailable\|\|/);
 assert.match(js,/if\(unavailable\)return/);
});

// This file runs inside the isolated release app after mobile-next.css is
// materialized by apply-mobile-next.mjs, not in the repository's source tree.
test('production walking footer remains compact and full width',()=>{
 const css=readFileSync(new URL('../src/mobile-next.css',import.meta.url),'utf8');
 const block=css.slice(css.lastIndexOf('/* Compact walking recommendation footer;'));
 assert.match(block,/:not\(\[data-dj-transit-preview\]\)/);
 assert.match(block,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(block,/#route-guide-start\{grid-column:1\/-1!important;width:100%!important/);
});
