import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptLighting,parseImport,segmentScore,currentVulnerabilityScore,
  currentFourFactorCoverage,currentFourFactorScore,CURRENT_FOUR_FACTORS} from '../src/pri-data.mjs';
import {spatialMatchSpeedFactor,SPEED_JOIN_CRITERIA} from '../src/pri-speed-spatial-match.mjs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));

test('four distinct factors use equal weights only on observed values (NULL is not zero)',()=>{
 assert.deepEqual(CURRENT_FOUR_FACTORS,['lighting','accidents','protectionGap','speed']);
 const base={scores:{lighting:80,accidents:60,protectionGap:40,speed:20},evidence:{}};
 assert.equal(currentFourFactorCoverage(base),4);
 assert.equal(currentFourFactorScore(base),50);
 assert.equal(currentFourFactorScore({...base,scores:{...base.scores,speed:null}}),60);
 assert.equal(currentFourFactorCoverage({...base,scores:{...base.scores,speed:null}}),3);
 assert.equal(currentFourFactorScore({...base,scores:{lighting:0,accidents:null,protectionGap:null,speed:100}}),50);
 assert.equal(currentFourFactorScore({...base,scores:{lighting:80,accidents:null,protectionGap:null,speed:null}}),null);
 assert.equal(currentFourFactorCoverage({...base,evidence:{accidents:{modeled:true}}}),3);
 assert.equal(currentFourFactorScore({...base,evidence:{accidents:{modeled:true}}}),(80+40+20)/3);
 assert.equal(currentVulnerabilityScore(base),60,'legacy 3-factor result remains untouched');
});

test('strict 5m/three-position GIS criterion links only supported observed speed roads',()=>{
 const raw=load('../public/data/pri/lighting_segments.json'),speed=load('../public/data/road-speed/sangdo1_speed_links.geojson');
 const dataset=adaptLighting(raw),before=dataset.segments.map(s=>s.scores.lighting);
 const {patch,stats,criteria}=spatialMatchSpeedFactor(dataset,speed);
 assert.deepEqual(criteria,SPEED_JOIN_CRITERIA);
 assert.equal(criteria.distanceMeters,5);
 assert.equal(criteria.ambiguityMeters,8);
 assert.equal(criteria.samples,3);
 assert.equal(stats.total,1686);
 assert.equal(stats.sourceLinks,206);
 assert.equal(stats.observed+stats.unmatched+stats.ambiguous+stats.unknownSpeed,1686);
 // These are geometry-only candidate matches, not 1686 reviewed speed signs.
 assert.ok(stats.observed>=100 && stats.observed<=500,'suspicious spatial join coverage: '+stats.observed);
 assert.ok(stats.unmatched>=1000,'unmatched 25m network must remain ungraded');
 assert.equal(patch.factor.id,'speed');
 assert.equal(patch.factor.scoreDirection,'risk');
 assert.equal(patch.unmatchedScore,undefined,'never award unmatched road a fake score');
 assert.equal(patch.scores.length,stats.observed);
 assert.equal(new Set(patch.scores.map(s=>s.id)).size,stats.observed);
 assert.ok(patch.scores.every(s=>[0,40,80,100].includes(s.score)));
 assert.ok(patch.scores.every(s=>/기하 정합/.test(s.evidence.note)));
 const next=parseImport(patch,dataset),covered=new Set(patch.scores.map(s=>s.id));
 assert.ok(next.segments.every(s=>covered.has(s.id)?s.scores.speed!==null:s.scores.speed===null));
 assert.ok(next.segments.every(s=>s.scores.lighting===before[dataset.segments.findIndex(x=>x.id===s.id)]));
 assert.ok(next.segments.every(s=>segmentScore(next,s,'current4')===currentFourFactorScore(s)));
 assert.ok(dataset.segments.every(s=>s.scores.speed===null),'original lighting bundle must not be edited in place');
});

test('parallel links with different speed grades are not misattributed to a survey line',()=>{
 const lon=126.95,lat=37.50;
 const base=adaptLighting({meta:{factor:'가로등·보안등 암부 거리',segment_m:25,full_score_dark_m:50,기준일:'2026-11-20',자료:'synthetic test',가정:'test'},
 segments:[{id:'9001_0',name:'test',len:20,dark:15,score:30,grade:3,
  pts:[[lat,lon],[lat,lon+.0002]]}]});
 const one=(id,speed,dlat)=>({type:'Feature',properties:{link_id:id,speed,updated:'20250512',length_m:25},
  geometry:{type:'LineString',coordinates:[[lon,lat+dlat],[lon+.0002,lat+dlat]]}});
 const joined=spatialMatchSpeedFactor(base,{type:'FeatureCollection',features:[one('101',30,0),one('202',50,0.000045)]});
 assert.equal(joined.stats.observed,0,'nearby different-speed lanes are ambiguous');
 assert.equal(joined.stats.ambiguous,1);
 const exact=spatialMatchSpeedFactor(base,{type:'FeatureCollection',features:[one('101',30,0)]});
 assert.equal(exact.stats.observed,1);
 assert.equal(exact.patch.scores[0].score,40);
});

test('walking vulnerability UI exposes one policy row with two nested buttons, four-factor map, and dock geometry',()=>{
 const ui=readFileSync(new URL('../src/pri-map.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/pri-map.css',import.meta.url),'utf8');
 assert.match(ui,/\['current6','종합 보행 취약도 · 6개 지표'\]/);
 assert.match(ui,/const entry=button\('제도적 사각지대',showProtectionDetail\)/);
 assert.match(ui,/protectionDetail\.append\(back,/);
 assert.match(ui,/choice\('protectionGap','상도1동 전체 보호 공백 점수 · 그라데이션'\)/);
 assert.match(ui,/choice\(\.\.\.middleSchoolOption\)/);
 assert.match(ui,/spatialMatchSpeedFactor\(next,speedSource\)/);
 assert.match(ui,/id==='current4'\?\(policyScope\?scopedCompositeFeatures\(policyScope/);
 assert.match(ui,/유효 지표 '\+currentFourFactorCoverage\(s\)\+'\/4/);
 assert.match(css,/html body #dj-pri-dialog\.dj-pri-dialog\{/);
 assert.match(css,/#app #dj-pri-legend\{/);
 assert.match(css,/--dj-pri-dock-clearance/);
 assert.doesNotMatch(css,/\.dj-pri-actions \.dj-pri-protection-group\{/);
});
