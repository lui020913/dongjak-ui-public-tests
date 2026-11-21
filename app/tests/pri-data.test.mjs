import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptLighting,validateBundle,parseImport,segmentScore,displayFeatures,summarize,routeExposure,TEAM_FACTORS,PALETTE,riskToSafety} from '../src/pri-data.mjs';
const sample={meta:{factor:'가로등·보안등 암부 거리',segment_m:25,full_score_dark_m:50,기준일:'2026-11-20',자료:'시험 출처',가정:'시험 가정'},segments:[
{id:'1_0',name:'시험로',len:25,dark:0,score:0,grade:2,pts:[[37.5,126.95],[37.5002,126.95]]},
{id:'1_1',name:'시험로',len:25,dark:50,score:100,grade:5,pts:[[37.50022,126.95],[37.50042,126.95]]},
{id:'1_2',name:'시험로',len:25,dark:20,score:40,grade:3,pts:[[37.51,126.95],[37.5102,126.95]]},
{id:'2_0',name:'점',len:2,dark:4,score:8,grade:2,pts:[[37.52,126.95]]}]};
test('lighting preserves raw observation even when rounded grade differs; point remains point',()=>{const b=adaptLighting(sample);assert.equal(b.segments[0].scores.lighting,100);assert.equal(b.segments[1].scores.lighting,0);assert.equal(b.segments[2].scores.lighting,60);assert.match(b.segments[0].evidence.lighting.note,/원본 조명 위험점수 0점/);assert.equal(b.segments[0].evidence.lighting.sourceGrade,2);assert.deepEqual(b.segments[0].geometry.coordinates[0],[126.95,37.5]);assert.equal(b.segments[3].geometry.type,'Point');assert.equal(summarize(b,'lighting').pointCount,1);assert.equal(segmentScore(b,b.segments[0],'pri'),null);});
test('adjacent color smoothing modifies display only and never joins a large gap',()=>{const b=adaptLighting(sample),f=displayFeatures(b,'lighting').features;assert.ok(f.some(x=>x.properties.segmentId==='1_0'&&x.properties.score===100&&x.properties.displayScore<100));assert.equal(f.filter(x=>x.properties.segmentId==='1_2').length,1);assert.ok(f.filter(x=>x.properties.segmentId==='1_0').every(x=>x.geometry.coordinates.every(p=>p[1]<=37.5002)));});
test('factor import requires exact version, preserves zero, does not invent missing observations',()=>{const b=adaptLighting(sample),p={schemaVersion:1,type:'pri-factor-scores',networkVersion:b.networkVersion,factor:{id:'width',label:'도로폭',source:'시험 출처',method:'시험 방법'},scores:[{id:'1_0',score:80}]};assert.throws(()=>parseImport({...p,networkVersion:'wrong'},b));assert.throws(()=>parseImport({...p,scores:[{id:'bad',score:0}]},b));const c=parseImport(p,b);assert.equal(c.segments[0].scores.lighting,100);assert.equal(c.segments[1].scores.width,null);assert.equal(segmentScore(c,c.segments[0],'pri'),null);assert.throws(()=>validateBundle({...c,config:{status:'approved',version:'v1',weights:{lighting:1}}}));const d=validateBundle({...c,config:{status:'approved',version:'v1',weights:{lighting:.5,width:.5}}});assert.equal(segmentScore(d,d.segments[0],'pri'),90);assert.equal(segmentScore(d,d.segments[1],'pri'),null);assert.equal(routeExposure(d,[{id:'1_0',lengthM:25}]).score,90);assert.equal(routeExposure(d,[{id:'1_1',lengthM:25}]),null);assert.equal(summarize(d,'pri').observedM,25);});

test('official team categories remain blank until their real files arrive',()=>{const b=adaptLighting(sample);assert.equal(b.factors.length,6);assert.deepEqual(b.factors.map(f=>f.id),TEAM_FACTORS.map(f=>f.id));for(const s of b.segments)for(const f of TEAM_FACTORS)if(f.id!=='lighting')assert.equal(s.scores[f.id],null);});
test('zero-length original point is preserved without fabricating a road',()=>{const b=adaptLighting({...sample,segments:[{...sample.segments[3],len:0}]});assert.equal(b.segments[0].lengthM,0);assert.equal(b.segments[0].geometry.type,'Point');assert.equal(displayFeatures(b,'lighting').features[0].geometry.type,'Point');});

test('bundled real lighting survey preserves every original score, grade and coordinate shortage',async()=>{const {readFileSync}=await import('node:fs');const raw=JSON.parse(readFileSync(new URL('../public/data/pri/lighting_segments.json',import.meta.url),'utf8'));const b=adaptLighting(raw);assert.equal(b.segments.length,1686);assert.equal(raw.lamps.length,419);assert.equal(b.segments.filter(s=>s.geometry.type==='Point').length,10);assert.equal(b.segments.filter(s=>s.lengthM===0).length,4);const stats=summarize(b,'lighting');assert.ok(Math.abs(stats.totalM-40131.5)<.01);assert.ok(Math.abs(stats.geometryM-36355.18)<1);assert.ok(b.segments.every((s,i)=>s.scores.lighting===100-raw.segments[i].score&&s.evidence.lighting.sourceGrade===raw.segments[i].grade&&segmentScore(b,s,'pri')===null));});

test('risk-to-safety scoring reverses the palette without altering original source or unsubmitted factors',()=>{
 assert.equal(riskToSafety(0),100);
 assert.equal(riskToSafety(40),60);
 assert.equal(riskToSafety(50),50);
 assert.equal(riskToSafety(100),0);
 assert.equal(riskToSafety(null),null);
 assert.equal(PALETTE[0][0],0);
 assert.equal(PALETTE[0][1],'#d74648');
 assert.equal(PALETTE.at(-1)[0],100);
 assert.equal(PALETTE.at(-1)[1],'#279b80');
 const base=adaptLighting(sample);
 const source={schemaVersion:1,type:'pri-factor-scores',networkVersion:base.networkVersion,
  factor:{id:'accidents',label:'사고다발지 안전점수',source:'시험 자료',method:'사고다발지 원본 위험점수 반전',scoreDirection:'risk'},
  unmatchedScore:100,unmatchedReason:'사고다발지 미선정: 실제 무사고를 뜻하지 않음',scores:[{id:'1_1',score:40,evidence:{note:'사고 이력 있음'}}]};
 const integrated=parseImport(source,base);
 assert.equal(source.scores[0].score,40,'source risk score must remain untouched');
 assert.equal(integrated.segments[1].scores.accidents,60,'risk 40 becomes safety 60');
 assert.equal(integrated.segments[0].scores.accidents,100,'nonselected segment gets a modeled baseline');
 assert.match(integrated.segments[0].evidence.accidents.note,/무사고를 뜻하지 않음/);
 assert.equal(segmentScore(integrated,integrated.segments[0],'pri12'),100);
 assert.equal(segmentScore(integrated,integrated.segments[1],'pri12'),30);
 assert.equal(segmentScore(integrated,integrated.segments[2],'pri12'),80);
 assert.equal(segmentScore(integrated,integrated.segments[0],'pri'),null,'full six-factor PRI still requires approval');
 assert.throws(()=>parseImport({...source,unmatchedReason:''},base),/미선정 기본점수/);
 assert.throws(()=>parseImport({...source,factor:{...source.factor,scoreDirection:'wrong'}},base),/지표 점수 방향/);
});
