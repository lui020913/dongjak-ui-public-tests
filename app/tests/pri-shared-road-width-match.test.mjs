import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchSharedRoadWidths} from '../src/pri-shared-road-width-match.mjs';
import {sectionWidths} from '../src/pri-shared-road-cross-section.mjs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
test('width spatial join reproduces the exact candidate coverage and preserves all unverified scores as null',()=>{
 const base=json('../public/data/pri/lighting_segments.json');const geo=json('../public/data/sangdo1-analysis-view/roadwidth.geojson');
 const candidates=json('../public/data/pri/sangdo1_shared_road_candidates_20261125.json');const {rows,stats}=matchSharedRoadWidths(base,geo);const byId=new Map(rows.map(r=>[r.id,r]));
 assert.equal(stats.eligible,1276);assert.equal(stats.matched,774);assert.equal(stats.stable,238);assert.equal(stats.conditionalCount,774);
 assert.equal(candidates.scores.length,224);assert.equal(candidates.scores.filter(c=>c.width).length,160);
 assert.equal(candidates.scores.filter(c=>c.width?.conditionalMixedRisk!=null).length,160);
 assert.equal(candidates.scores.filter(c=>c.width?.stableWidthBand).length,12);
 for(const [risk,n] of [[100,4],[70,94],[30,62]])assert.equal(candidates.scores.filter(c=>c.width?.conditionalMixedRisk===risk).length,n);
 const fallback=sectionWidths(base,geo,new Set(candidates.scores.filter(c=>!byId.has(c.id)).map(c=>c.id)));
 assert.deepEqual(fallback.diagnostics,{target:68,accepted:4,noCoverage:61,unstable:3,bands:{100:0,70:1,30:3}});
 for(const r of fallback.rows)byId.set(r.id,r);
 for(const row of candidates.scores){assert.equal(row.score,null);assert.deepEqual(row.width,byId.get(row.id)??null);}
});

test('overlap threshold excludes weak and ambiguous matches; representative width can span other bands',()=>{
 const poly=(id,a,b,width)=>({type:'Feature',properties:{RW_SN:id,width_est_m:width,width_p10_m:3,width_p90_m:7,reliability:'검토 필요(폭 변화/기준 경계)'},geometry:{type:'Polygon',coordinates:[[[a,37.4999],[b,37.4999],[b,37.5001],[a,37.5001],[a,37.4999]]]}});
 const base={segments:[{id:'test',hw:'residential',pts:[[37.5,126.95],[37.5,126.9502]]}]};
 const match=features=>matchSharedRoadWidths(base,{features}).rows;
 assert.equal(match([poly(1,126.94999,126.95018,5)])[0].conditionalMixedRisk,70);
 assert.equal(match([poly(1,126.94999,126.95018,5)])[0].stableWidthBand,false);
 assert.equal(match([poly(1,126.94999,126.9501,5)]).length,0);
 assert.equal(match([poly(1,126.94999,126.95021,5),poly(2,126.94999,126.95021,3)]).length,0);
});

test('perpendicular sections recover true polygon width, reject overlapping polygons and roads outside polygons',()=>{
 const sx=111195*Math.cos(37.5*Math.PI/180),sy=111195;
 const xy=(x,y)=>[126.95+x/sx,37.5+y/sy];
 const poly={type:'Feature',properties:{RW_SN:1},geometry:{type:'Polygon',coordinates:[[xy(-2,-2.5),xy(22,-2.5),xy(22,2.5),xy(-2,2.5),xy(-2,-2.5)]]}};
 const s={id:'test',hw:'residential',pts:[xy(0,0).reverse(),xy(20,0).reverse()]};
 const base={segments:[s]},ids=new Set(['test']);
 const row=sectionWidths(base,{features:[poly]},ids).rows[0];assert.equal(row.widthM,5);assert.equal(row.conditionalMixedRisk,70);assert.equal(row.coveragePct,100);
 assert.equal(sectionWidths(base,{features:[poly,{...poly,properties:{RW_SN:2}}]},ids).rows.length,0);
 assert.equal(sectionWidths({segments:[{...s,pts:[xy(0,8).reverse(),xy(20,8).reverse()]}]},{features:[poly]},ids).rows.length,0);
});
