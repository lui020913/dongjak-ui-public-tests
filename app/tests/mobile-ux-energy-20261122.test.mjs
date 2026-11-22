import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {phoneProfile,installPhoneRenderBudget} from '../src/adaptive-phone-map-budget.mjs';
import {TEAM_FACTORS,validateBundle,parseImport,displayFeatures,segmentScore,summarize} from '../src/pri-data.mjs';

test('installed iPhone manual theme changes refresh native status chrome without guest onboarding',()=>{
  const src=readFileSync(new URL('../src/ui-environment.js',import.meta.url),'utf8');
  assert.match(src,/requestIosThemeRefresh\(\{win:window,app,map,theme:themeState\.preference\}\)/);
  assert.match(src,/if\(!themeState\.temporary\)/);
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/data-dj-theme-refresh/);
  const tour=readFileSync(new URL('../src/v860-onboarding.js',import.meta.url),'utf8');
  assert.match(tour,/seenInMemory=isNativeThemeRefresh/);
  assert.match(src,/displayTheme\(\{notify:true\}\)/);
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/mobile-ux-energy\.css/);
  const css=readFileSync(new URL('../src/mobile-ux-energy.css',import.meta.url),'utf8');
  assert.match(css,/data-tab.*:not\(\[data-tab="map"\]\).*#map/);
});

test('PRI map safely hides legacy TIP even with inline important styles and softens congested strokes',()=>{
  const pri=readFileSync(new URL('../src/pri-map.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/pri-map.css',import.meta.url),'utf8');
  assert.match(pri,/const savedHudStyle=new Map\(\)/);
  assert.match(pri,/node\.style\.setProperty\('display','none','important'\)/);
  assert.match(pri,/syncPriHud\(Boolean\(id\)\)/);
  assert.match(pri,/savedHudStyle\.clear\(\)/);
  assert.match(pri,/11\.5,\.7,13,1\.1,15,1\.8,17,2\.8,19,4\.1/);
  for(const name of ['매우 취약','취약','보통','양호','안전'])assert.ok(pri.includes(name));
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/min-height:44px/);
});

test('the original 10-second map TIP owner never resurrects a TIP over active PRI',()=>{
 const shell=readFileSync(new URL('../src/v840-coordinated-ui.js',import.meta.url),'utf8');
 const scale=readFileSync(new URL('../src/map-scale-docking.js',import.meta.url),'utf8');
 assert.match(shell,/app\.dataset\.djPriVisible!=='true'/);
 assert.match(shell,/app\.dataset\.djPriVisible==='true'\|\|hasOpenMapWindow/);
 assert.match(shell,/data-dj-pri-visible/);
 assert.match(scale,/app\.dataset\.djPriVisible==='true'/);
});

test('opaque phone tab surfaces have a priority cascade owner over legacy production styles',()=>{
  const css=readFileSync(new URL('../src/mobile-ux-energy.css',import.meta.url),'utf8');
  assert.match(css,/@layer request-completion/);
  assert.match(css,/data-tab.*:not\(\[data-tab="map"\]\).*#map/);
  assert.match(css,/visibility:hidden!important/);
  assert.match(css,/background-color:var\(--dj-primary-page-bg/);
});

test('battery policy saves data, suspends hidden animations and restores map clarity',()=>{
  assert.equal(phoneProfile({phone:true,ua:'iPhone',saveData:true}),'economy');
  let ratio=1.25,stops=0;
  const mapHandlers=new Map(),docHandlers=new Map(),classes=new Set();
  const map={on:(id,cb)=>mapHandlers.set(id,cb),off:id=>mapHandlers.delete(id),getPixelRatio:()=>ratio,setPixelRatio:r=>{ratio=r;},stop:()=>{stops++;}};
  const doc={hidden:false,addEventListener:(id,cb)=>docHandlers.set(id,cb),removeEventListener:id=>docHandlers.delete(id)};
  const app={dataset:{tab:'map'},classList:{toggle:(k,on)=>{if(on)classes.add(k);else classes.delete(k);},remove:k=>classes.delete(k)}};
  const budget=installPhoneRenderBudget({map,app,doc,normalRatio:1.25});
  doc.hidden=true;docHandlers.get('visibilitychange')();
  assert.equal(ratio,1);assert.equal(stops,1);
  doc.hidden=false;docHandlers.get('visibilitychange')();
  assert.equal(ratio,1.25);
  budget.destroy();assert.equal(docHandlers.size,0);
});

const factorDefs=TEAM_FACTORS.map(f=>({...f,source:'test verified',method:'test calculation'}));
const makeBundle=(scores,weights,configStatus='approved')=>validateBundle({
  schemaVersion:1,networkVersion:'phone-pri-test',area:'상도1동',factors:factorDefs,
  segments:[{id:'way_0',name:'연습 도로',lengthM:30,
    geometry:{type:'LineString',coordinates:[[126.95,37.5],[126.9503,37.5]]},scores}],
  config:configStatus==='approved'?{status:'approved',version:'test-v1',weights}: {status:'draft'}
});
test('only a missing protection-gap factor uses the agreed five-score renormalization',()=>{
  const weights=Object.fromEntries(TEAM_FACTORS.map(f=>[f.id,1/6]));
  const scores=Object.fromEntries(TEAM_FACTORS.map(f=>[f.id,60]));
  scores.protectionGap=null;
  const bundle=makeBundle(scores,weights);
  assert.ok(Math.abs(segmentScore(bundle,bundle.segments[0],'pri')-60)<1e-9);
  const missingAnother={...scores,lighting:null};
  assert.equal(segmentScore(makeBundle(missingAnother,weights),makeBundle(missingAnother,weights).segments[0],'pri'),null);
  const allSix={...scores,protectionGap:30};
  assert.equal(Math.round(segmentScore(makeBundle(allSix,weights),makeBundle(allSix,weights).segments[0],'pri')),55);
});
test('nonselected accident areas render gray, not as measured safe 100',()=>{
  const base=makeBundle(Object.fromEntries(TEAM_FACTORS.map(f=>[f.id,null])),null,'draft');
  const patch={schemaVersion:1,type:'pri-factor-scores',networkVersion:base.networkVersion,
    factor:{id:'accidents',label:'사고',source:'verified',method:'overlay',scoreDirection:'risk'},
    unmatchedScore:100,unmatchedReason:'사고다발지 선정자료에 없는 구간',scores:[]};
  const merged=parseImport(patch,base);
  assert.equal(merged.segments[0].scores.accidents,100,'retains the stated provisional modeling baseline');
  assert.equal(merged.segments[0].evidence.accidents.modeled,true);
  const road=displayFeatures(merged,'accidents').features[0].properties;
  assert.equal(road.evaluated,false);
  assert.equal(road.modeled,true);
  assert.equal(summarize(merged,'accidents').observedM,0);
});

test('the coordinated mobile shell releases listeners, timers and stale confirmations on disposal',()=>{
 const src=readFileSync(new URL('../src/v840-coordinated-ui.js',import.meta.url),'utf8');
 for(const signature of [
  "mapNavButton?.removeEventListener('click',selectedMap)",
  "search?.removeEventListener('focusin',sync)",
  "search?.removeEventListener('focusout',onSearchFocusOut)",
  "label.removeEventListener('keydown',onTipKeydown)",
  "guideToggle.removeEventListener('click',onGuideToggle)",
  "win.clearTimeout(tipFadeTimer)",
  "win.clearTimeout(searchFocusTimer)",
  "disposed=true;tipTransitionToken++",
  "const finish=()=>{if(disposed)return;dialog.hidden=true"
 ])assert.ok(src.includes(signature),'missing teardown guard: '+signature);
});
