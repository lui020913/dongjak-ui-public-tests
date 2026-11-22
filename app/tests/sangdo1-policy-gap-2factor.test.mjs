import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const name='sangdo1_policy_gap_2factor_300m_20261122';
const csv=(await readFile(path.join(root,name+'.csv'),'utf8')).trim().split(/\r?\n/);
const headers=csv.shift().split(',');
const rows=csv.map(line=>{
 const values=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"'));
 assert.equal(values.length,headers.length,'CSV row has the right number of values');
 return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
});
const n=v=>v===null||v===undefined||v===''?null:Number(v);
const score=(base,school,protectedFully)=>{
 if(base===null)return null;
 if(protectedFully)return 0;
 // Risk values use inverse of the former safety mean; tolerate 0.1 decimal rounding.
 return Math.max(0.1,+(school===null?base:(base+school)/2).toFixed(1));
};

test('two-factor study covers each 25m road exactly once, preserving null and 5-vs-6 rule',()=>{
 assert.equal(rows.length,1686);
 assert.equal(new Set(rows.map(x=>x.segment_id)).size,1686);
 const nullRows=rows.filter(x=>x.combined_new_score==='');
 assert.equal(nullRows.length,600);
 for(const r of rows){
  const isNull=r.combined_new_score==='';
  assert.equal(+r.team_average_divisor,isNull?5:6);
  assert.equal(r.combined_color,isNull?'#A3AAB4':r.combined_color);
  assert.equal(r.combined_grade,isNull?'미평가':r.combined_grade);
  assert.equal(r.coverage_status==='in_300m',!isNull);
  if(!isNull){const scoreValue=n(r.combined_new_score),grade=r.combined_grade;assert.equal(grade,scoreValue>=75?'매우 큰 공백':scoreValue>=50?'큰 공백':scoreValue>=25?'중간 공백':'작은 공백');}
  if(!isNull)assert.ok(n(r.combined_new_score)>=0&&n(r.combined_new_score)<=100);
  if(r.school_applied_child==='true')assert.ok(r.child_nearest_facility.includes('초등학교'));
  assert.equal(Object.hasOwn(r,'width_score'),false,'도로폭이 보호 공백 점수에 섞이면 안 됩니다.');
  const values=[n(r.child_new_score),n(r.elderly_new_score)].filter(v=>v!==null);
  assert.equal(n(r.combined_new_score),values.length?Math.max(...values):null);
 }
});
test('risk score high-is-bad: 50:50 only for matched elementary school, elderly distance-only',()=>{
 for(const r of rows){
  for(const type of ['child','elderly']){
   const base=n(r[type+'_distance_base_score']);
   // Road-width component deliberately excluded.
   const school=type==='child'&&r.school_applied_child==='true'?n(r.child_school_score):null;
   const expected=score(base,school,base===0);
   const actual=n(r[type+'_new_score']);
   assert.ok((expected===null&&actual===null)||(expected!==null&&actual!==null&&Math.abs(expected-actual)<=0.2),
    r.segment_id+' '+type+' score expected '+expected+' actual '+actual);
  }
 }
});
test('map geometries match CSV, including gray eligibility, independent grades and original 25m IDs',async()=>{
 const geo=JSON.parse(await readFile(path.join(root,name+'.geojson'),'utf8'));
 assert.equal(geo.type,'FeatureCollection');
 assert.equal(geo.metadata.radius_m,300);
 assert.equal(geo.metadata.schema,'sangdo1_policy_gap_2factor_risk_v2');
 assert.equal(geo.metadata.base_weight,50);
 assert.equal(geo.metadata.school_weight,50);
 assert.equal(geo.metadata.score_direction,'risk');
 assert.equal(geo.metadata.width_removed_from_scoring,true);
 assert.equal(geo.features.length,1676);
 const byId=new Map(rows.map(r=>[r.segment_id,r]));
 for(const feature of geo.features){
  const properties=feature.properties;
  const match=byId.get(properties.segment_id);
  assert.ok(match);
  assert.equal(feature.geometry.type,'LineString');
  assert.ok(feature.geometry.coordinates.length>=2);
  assert.equal(n(properties.combined_new_score),n(match.combined_new_score));
  assert.equal(properties.combined_color,match.combined_color);
  assert.equal(properties.child_color,match.child_color);
  assert.equal(properties.elderly_color,match.elderly_color);
 }
});
