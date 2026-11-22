import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {phoneProfile,installPhoneRenderBudget} from '../src/adaptive-phone-map-budget.mjs';
import {TEAM_FACTORS,validateBundle,parseImport,displayFeatures,segmentScore,summarize} from '../src/pri-data.mjs';

test('iOS theme switch no longer requests a reload or PWA relaunch',()=>{
  const src=readFileSync(new URL('../src/ui-environment.js',import.meta.url),'utf8');
  assert.doesNotMatch(src,/requestIosThemeRefresh/);
  assert.match(src,/displayTheme\(\{notify:true\}\)/);
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/mobile-ux-energy\.css/);
  const css=readFileSync(new URL('../src/mobile-ux-energy.css',import.meta.url),'utf8');
  assert.match(css,/data-tab.*:not\(\[data-tab="map"\]\).*#map/);
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
  assert.equal(segmentScore(bundle,bundle.segments[0],'pri'),60);
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
