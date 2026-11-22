import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {scopedPolicyFeatures} from '../src/pri-scope-data.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const load=async name=>JSON.parse(await readFile(resolve(dir,'../public/data/protection-zone/'+name),'utf8'));
const official=await load('boundary_reference.geojson'),geo=await load('sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson'),registry=await load('sangdo1_admin_facility_registry_20261122.json');
const ring=official.features[0].geometry.coordinates[0];
const inside=p=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const onEdge=p=>{for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.min(1,Math.max(0,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));if(Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t)<2e-8)return true;}return false;};
test('all 1,606 policy-map fragments are really in Sangdo1 polygon (not Dongjak-wide)',()=>{
 assert.equal(geo.metadata.administrative_scope_code,'1159053000');
 assert.equal(geo.metadata.schema,'sangdo1_policy_gap_2factor_adminscope_risk_v3');
 assert.equal(geo.features.length,1606);
 const ids=new Set();
 for(const feature of geo.features){
  ids.add(feature.properties.segment_id);
  const cs=feature.geometry.coordinates;
  assert.ok(cs.length>=2);
  for(let i=0;i<cs.length;i++){
   assert.ok(inside(cs[i])||onEdge(cs[i]),feature.properties.segment_id+' outside boundary vertex '+i);
   if(i)assert.ok(inside([(cs[i][0]+cs[i-1][0])/2,(cs[i][1]+cs[i-1][1])/2])||onEdge([(cs[i][0]+cs[i-1][0])/2,(cs[i][1]+cs[i-1][1])/2]),feature.properties.segment_id+' outside segment');
  }
 }
 assert.equal(ids.size,1606);
 assert.deepEqual({inside:geo.metadata.counts.fully_inside,crossing:geo.metadata.counts.crossing,outside:geo.metadata.counts.outside,noGeom:geo.metadata.counts.missing_geometry},{inside:1584,crossing:22,outside:70,noGeom:10});
 const layer=scopedPolicyFeatures(geo);
 assert.equal(layer.features.length,1606);
 assert.equal(layer.features.filter(f=>f.properties.evaluated).length,1003);
 assert.equal(layer.features.filter(f=>!f.properties.evaluated).length,603);
});
test('9 original police-zone intersecting facilities, Sanghyeon middle inventory, Dongjak high excluded',()=>{
 assert.equal(registry.protected_facilities.length,9);
 assert.equal(registry.protected_facilities.filter(x=>x.type==='어린이').length,7);
 assert.equal(registry.protected_facilities.filter(x=>x.type==='노인').length,2);
 assert.equal(registry.outside_reference_facilities_excluded.length,10);
 assert.ok(registry.school_inventory.find(x=>x.name==='상현중학교').point_inside_reference);
 assert.ok(registry.school_inventory.find(x=>x.name==='동작고등학교').analysis_role.includes('제외'));
});
test('team factor preserves 1,686 shared IDs, null 683 and changed count score 1,003',async()=>{
 const factor=JSON.parse(await readFile(resolve(dir,'../public/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json'),'utf8'));
 const manifest=JSON.parse(await readFile(resolve(dir,'../public/data/pri/manifest.json'),'utf8'));
 assert.equal(factor.factor.scoreDirection,'risk');
 assert.equal(factor.scores.length,1686);
 assert.equal(new Set(factor.scores.map(x=>x.id)).size,1686);
 assert.equal(factor.scores.filter(x=>x.score===null).length,683);
 assert.equal(factor.scores.filter(x=>x.score!==null).length,1003);
 assert.equal(factor.scores.find(x=>x.id==='278148191_3').score,73.0);
 assert.equal(factor.scores.find(x=>x.id==='278024801_2').score,67.9);
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json'));
});

test('protected release validates exactly the Sangdo1 scoped GIS files used by the map',async()=>{
 const script=await readFile(resolve(dir,'../../scripts/build-mobile-first-overhaul.sh'),'utf8');
 const geoPath="protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson";
 const factorPath="pri/sangdo1_protection_gap_2factor_adminscope_factor.json";
 assert.ok(script.includes("readFileSync(root+'"+geoPath+"'"),'release must inspect active clipped GeoJSON');
 assert.ok(script.includes("readFileSync(root+'"+factorPath+"'"),'release must inspect active PRI factor');
 assert.ok(!script.includes("readFileSync(root+'protection-zone/sangdo1_policy_gap_2factor_300m_20261122.geojson'"),'archived scope cannot gate the current release');
 assert.ok(!script.includes("readFileSync(root+'pri/sangdo1_protection_gap_2factor_factor.json'"),'archived PRI factor cannot gate the current release');
 assert.ok(script.includes("geo.features?.length!==1606"),'administrative clipping must remain guarded');
 assert.ok(script.includes("factor.scores.filter(x=>x.score===null).length!==683"),'missing-factor count must remain guarded');
});
