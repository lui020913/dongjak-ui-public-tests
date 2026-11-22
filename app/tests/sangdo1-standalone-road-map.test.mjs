import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const html=await readFile(resolve(root,'research/sangdo1-policy-gap-road-map.html'),'utf8');
const csv=await readFile(resolve(root,'data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.csv'),'utf8');
const boundary=JSON.parse(await readFile(resolve(root,'data/protection-zone/boundary_reference.geojson'),'utf8')).features[0].geometry.coordinates[0];
const readScriptData=id=>{const re=new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>');const m=html.match(re);assert.ok(m,id+' is embedded');return JSON.parse(m[1])};
const roads=readScriptData('roads-data'),ring=readScriptData('boundary-data');
const lines=csv.trim().split(/\r?\n/),headers=lines.shift().split(',');
const byId=new Map(lines.map(l=>{const values=[...l.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(x=>x[1].replace(/""/g,'"'));return Object.fromEntries(headers.map((h,i)=>[h,values[i]]))}).map(x=>[x.segment_id,x]));
const nearBoundary=p=>{const eps=0.0000003;for(let i=1;i<boundary.length;i++){const a=boundary[i-1],b=boundary[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.min(1,Math.max(0,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));if(Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t)<eps)return true;}return false};
const inside=p=>{let hit=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit||nearBoundary(p)};
test('standalone full roadline map embeds offline 1,606 exact-scope polylines',()=>{
 assert.equal(roads.length,1606);
 assert.equal(new Set(roads.map(r=>r[0])).size,1606);
 assert.equal(roads.filter(r=>r[2]!==null).length,1003);
 assert.equal(roads.filter(r=>r[2]===null).length,603);
 assert.equal(roads.filter(r=>r[2]>=75).length,167);
 assert.equal(roads.filter(r=>byId.get(r[0])?.boundary_scope==='crossing').length,22);
 for(const row of roads){
   const [id,name,score,type,parts]=row;
   const ref=byId.get(id);
   assert.ok(ref,id);
   assert.notEqual(ref.boundary_scope,'outside');
   assert.notEqual(ref.boundary_scope,'missing_geometry');
   assert.equal(name,ref.road_name);
   assert.equal(score,ref.combined_new_score===''?null:Number(ref.combined_new_score));
   assert.ok(parts.length>=1);
   for(const path of parts){assert.ok(path.length>=2);for(const point of path){assert.equal(point.length,2);assert.ok(point.every(Number.isFinite));assert.ok(inside(point),'point outside Sangdo1 polygon '+id+' '+point);}}
 }
 assert.equal(ring.length,boundary.length);
});
test('viewer has an actual OSM basemap with independent GIS vector fallback; not a coordinate grid',()=>{
 assert.ok(html.includes('https://tile.openstreetmap.org/'));
 assert.ok(html.includes('OpenStreetMap'));
 assert.ok(html.includes('roads.forEach'));
 assert.ok(html.includes("ctx.strokeStyle=pal(r.score)"));
 assert.ok(html.includes("boundary"));
 assert.ok(html.includes("상도1동 전체"));
 assert.ok(html.includes("강남초 주변"));
 assert.ok(html.includes("상현초·샛별 주변"));
 assert.ok(html.includes("75점 이상만"));
 assert.ok(!html.includes("GIS 원본 연결 시 전체 표시"));
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1]),'standalone browser javascript parses');
});
