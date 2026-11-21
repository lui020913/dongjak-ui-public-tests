import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const name='sangdo1_policy_gap_3source_300m_20261122';
const csv=(await readFile(path.join(root,name+'.csv'),'utf8')).trim().split(/\r?\n/);
const headers=csv.shift().split(',');
const rows=csv.map(line=>{
 const values=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"'));
 assert.equal(values.length,headers.length,'CSV row has the right number of values');
 return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
});
const n=v=>v===''?null:Number(v);
const score=(base,width,school,protectedFully)=>{
 if(base===null)return null;
 if(protectedFully)return 100;
 const inputs=[{v:base,w:60}];
 if(width!==null)inputs.push({v:width,w:25});
 if(school!==null)inputs.push({v:school,w:15});
 return Math.min(99.9,+(inputs.reduce((a,x)=>a+x.v*x.w,0)/inputs.reduce((a,x)=>a+x.w,0)).toFixed(1));
};

test('three-source study covers each 25m road exactly once, preserving null and 5-vs-6 rule',()=>{
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
  if(!isNull)assert.ok(n(r.combined_new_score)>=0&&n(r.combined_new_score)<=100);
  if(r.school_applied_child==='true')assert.ok(r.child_nearest_facility.includes('초등학교'));
  if(r.width_applied_child==='true'||r.width_applied_elderly==='true')assert.ok(n(r.width_coverage_pct)>=50);
  const values=[n(r.child_new_score),n(r.elderly_new_score)].filter(v=>v!==null);
  assert.equal(n(r.combined_new_score),values.length?Math.min(...values):null);
 }
});
test('type-specific corrections use only available same-type sources',()=>{
 for(const r of rows){
  for(const type of ['child','elderly']){
   const base=n(r[type+'_distance_base_score']);
   const width=r['width_applied_'+type]==='true'?n(r.width_score):null;
   const school=type==='child'&&r.school_applied_child==='true'?n(r.child_school_score):null;
   const expected=score(base,width,school,base===100);
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
