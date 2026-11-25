import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptLighting,parseImport,observedFactorScore,segmentScore,
 CURRENT_SIX_FACTORS,currentSixFactorCoverage,currentSixFactorScore} from '../src/pri-data.mjs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));

test('six factor mean has equal weights, incomplete coverage is explicit, modeled is excluded',()=>{
 assert.deepEqual(CURRENT_SIX_FACTORS,['lighting','accidents','protectionGap','speed','crossing','sharedRoad']);
 const s={scores:{lighting:100,accidents:80,protectionGap:60,speed:40,crossing:20,sharedRoad:0},evidence:{}};
 assert.equal(currentSixFactorCoverage(s),6);
 assert.equal(currentSixFactorScore(s),50);
 assert.equal(segmentScore({},s,'current6'),50);
 const partial={...s,scores:{...s.scores,crossing:null,sharedRoad:null}};
 assert.equal(currentSixFactorCoverage(partial),4);
 assert.equal(currentSixFactorScore(partial),70);
 assert.equal(currentSixFactorCoverage({...partial,evidence:{accidents:{modeled:true}}}),3);
 assert.equal(currentSixFactorScore({...partial,evidence:{accidents:{modeled:true}}}),(100+60+40)/3);
 assert.equal(currentSixFactorScore({scores:{lighting:100,accidents:null},evidence:{}}),null);
});

test('10-point bocha raw risk imports ×10 without changing risk polarity or zeros',()=>{
 const base=adaptLighting({meta:{factor:'가로등·보안등 암부 거리',segment_m:25,full_score_dark_m:50,기준일:'2026-11-20',자료:'test',가정:'test'},segments:[
  {id:'1_0',name:'road',len:20,dark:10,score:20,grade:2,pts:[[37.5,126.95],[37.5,126.9502]]},
  {id:'1_1',name:'road',len:20,dark:20,score:40,grade:3,pts:[[37.5002,126.95],[37.5002,126.9502]]}]});
 const source={schemaVersion:1,type:'pri-factor-scores',networkVersion:base.networkVersion,scoreMax:10,
  factor:{id:'sharedRoad',label:'보차혼용',source:'submitted PDF',method:'4+3+2+1 ×10',scoreDirection:'risk'},
  scores:[{id:'1_0',score:7,evidence:{note:'field'}},{id:'1_1',score:0}]};
 const merged=parseImport(source,base);
 assert.equal(observedFactorScore(merged.segments[0],'sharedRoad'),30,'risk 70 is stored as safety 30');
 assert.equal(observedFactorScore(merged.segments[1],'sharedRoad'),100,'risk 0 is safety 100, not missing');
 assert.equal(100-observedFactorScore(merged.segments[0],'sharedRoad'),70);
 assert.equal(currentSixFactorCoverage(merged.segments[0]),2);
 assert.equal(currentSixFactorScore(merged.segments[0]),55);
 assert.equal(source.scores[0].score,7,'raw remains ten-point');
 assert.match(merged.segments[0].evidence.sharedRoad.note,/7\/10점 × 10 = 70\/100점/);
 assert.throws(()=>parseImport({...source,scores:[{id:'1_0',score:11}]},base),/0~10/);
 assert.throws(()=>parseImport({...source,scoreMax:5},base),/지원되지 않는/);
});

test('per-road rubric parts are converted to risk 0-100 only when all four parts are known',()=>{
 const base=adaptLighting({meta:{factor:'가로등·보안등 암부 거리',segment_m:25,full_score_dark_m:50,기준일:'2026-11-20',자료:'test',가정:'test'},segments:[
  {id:'1_0',name:'road',len:20,dark:10,score:20,grade:2,pts:[[37.5,126.95],[37.5,126.9502]]},
  {id:'1_1',name:'road',len:20,dark:10,score:20,grade:2,pts:[[37.5002,126.95],[37.5002,126.9502]]}]});
 const metadata={source:'team PDF',method:'PDF four parts',scoreDirection:'risk'};
 const crossing=parseImport({type:'pri-factor-rubric',schemaVersion:1,networkVersion:base.networkVersion,factor:{...metadata,id:'crossing',label:'횡단보도'},rows:[
  {id:'1_0',components:{discontinuity:'고위험',terrain:'주의',vulnerable:'안전',nightAccident:'고위험'}},
  {id:'1_1',components:{discontinuity:'고위험',terrain:'주의',vulnerable:null,nightAccident:'고위험'}}
 ]},base);
 assert.equal(observedFactorScore(crossing.segments[0],'crossing'),30,'risk 70 -> safety 30');
 assert.equal(observedFactorScore(crossing.segments[1],'crossing'),null);
 const bocha=parseImport({type:'pri-factor-rubric',schemaVersion:1,networkVersion:base.networkVersion,factor:{...metadata,id:'sharedRoad',label:'보차혼용'},rows:[
  {id:'1_0',components:{separation:4,refuge:3,sight:0,speedCalming:0}},
  {id:'1_1',components:{separation:4,refuge:3,sight:2}}
 ]},crossing);
 assert.equal(observedFactorScore(bocha.segments[0],'sharedRoad'),30,'risk 70 -> safety 30');
 assert.equal(observedFactorScore(bocha.segments[1],'sharedRoad'),null);
 assert.equal(currentSixFactorCoverage(bocha.segments[0]),3);
 assert.equal(currentSixFactorCoverage(bocha.segments[1]),1);
 assert.equal(currentSixFactorScore(bocha.segments[0]),(80+30+30)/3);
});

test('spatial estimates use the exact network and unverified bocha candidates never enter PRI',()=>{
 const base=adaptLighting(json('../public/data/pri/lighting_segments.json'));
 const a=json('../public/data/pri/sangdo1_crosswalk_rubric_factor.json');
 const b=json('../public/data/pri/sangdo1_shared_road_rubric_factor.json');
 assert.equal(base.networkVersion,a.networkVersion);
 assert.equal(base.networkVersion,b.networkVersion);
 assert.equal(a.factor.scoreDirection,'risk');
 assert.equal(b.factor.scoreDirection,'risk');
 assert.equal(b.scoreMax,100);
 assert.ok(a.scores.length>0);
 assert.ok(a.scores.every(s=>s.score>=0&&s.score<=100));
 assert.equal(b.scores.length,0);
 const candidates=json('../public/data/pri/sangdo1_shared_road_candidates_20261125.json');
 assert.equal(candidates.networkVersion,base.networkVersion);
 assert.ok(candidates.scores.length>0);
 const merged=parseImport(b,parseImport(a,base));
 assert.equal(merged.segments.length,1686);
 assert.equal(merged.segments.filter(s=>observedFactorScore(s,'crossing')!==null).length,a.scores.length);
 assert.ok(merged.segments.every(s=>s.scores.sharedRoad===null));
 const manifest=json('../public/data/pri/manifest.json');
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_crosswalk_rubric_factor.json'));
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_shared_road_rubric_factor.json'));
 assert.ok(!manifest.patches.includes('/data/pri/sangdo1_shared_road_candidates_20261125.json'));
});

test('primary PRI view is six-factor with a red high-risk ramp and grey for unknown',()=>{
 const ui=readFileSync(new URL('../src/pri-map.js',import.meta.url),'utf8');
 assert.match(ui,/\['current6','종합 보행 취약도 · 6개 지표'\]/);
 assert.match(ui,/id==='current6'\?\(policyScope\?scopedCompositeFeatures/);
 assert.match(ui,/currentSixFactorCoverage\(s\)\+'\/6/);
 assert.match(ui,/#CF4248/);
 assert.match(ui,/\['step',\['get','displayScore'\]/);
 assert.match(ui,/미평가/);
});
