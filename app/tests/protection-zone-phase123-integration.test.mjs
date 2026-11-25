import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getRoadGuidance,renderRoadGuidance,renderEvidenceStatus} from '../src/protection-zone-guidance.js';
import {DATA_SOURCE_GROUPS} from '../src/version-history-v7.js';
import {installProtectionZoneMap} from '../src/protection-zone-map.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(n)=>fs.readFileSync(path.join(root,n),'utf8');
const roads=JSON.parse(read('public/data/protection-zone/candidates.geojson')).features;
const byId=id=>roads.find(f=>f.properties.road_id===id).properties;

test('reviewed roads retain their GIS geometry and distinguish missing values',()=>{
 assert.equal(roads.length,125);
 assert.equal(roads.filter(f=>f.properties.road_id==='R0299').length,2, 'preexisting duplicate ID preserved for separate source segments');
 assert.equal(new Set(roads.map(f=>f.properties.road_id)).size,124);
 assert.equal(new Set(roads.map(f=>f.properties.review_fieldwork_id||f.properties.road_id)).size,125);
 assert.deepEqual(roads.filter(f=>f.properties.evidence_tier==='A').map(f=>f.properties.road_id).sort(),['R0248','R0288']);
 for(const f of roads){
  assert.equal(f.geometry.type,'LineString');
  assert.equal(f.properties.review_danger_confirmed,false);
  assert.equal(f.properties.review_route_penalty_allowed,false);
  assert.equal(f.properties.review_pedestrian_volume,null);
  assert.equal(f.properties.review_speed_limit_kmh,null);
  assert.equal(f.properties.review_grade_pct,null);
 }
 assert.equal(byId('R0248').review_osm_road_class,'service');
 assert.equal(byId('R0288').review_osm_road_class,'residential');
 assert.equal(byId('R0248').review_osm_footway_distance_m,48.61);
 assert.equal(byId('R0288').review_osm_footway_distance_m,24.26);
});

test('road messages are pedestrian-facing, evidence bounded, and hostile markup escaped',()=>{
 const g54=getRoadGuidance(byId('R0248'));
 const g62=getRoadGuidance(byId('R0288'));
 assert.match(g54.intro,/서울상현초등학교/);
 assert.match(g62.intro,/샛별유치원/);
 assert.equal(g54.routePenaltyAllowed,false);
 assert.equal(g54.data.length,8);
 assert.ok(g54.data.every(([,value])=>value==='미확인'));
 assert.match(renderRoadGuidance(byId('R0248')),/실제 사고 발생이나 건수를 뜻하지 않습니다/);
 const malicious=renderRoadGuidance({...byId('R0248'),width_est_m:'<script>alert(1)</script>'});
 assert.doesNotMatch(malicious,/<script>/);
 assert.match(malicious,/미확인/);
 const html=renderEvidenceStatus(byId('R0288'));
 assert.match(html,/법정 제한속도/);
 assert.match(html,/생활인구/);
 assert.doesNotMatch(html,/pza-source-links|TAAS/);
 assert.ok(DATA_SOURCE_GROUPS.some(group=>group.items.some(source=>source.name==='TAAS 교통사고 분석시스템')));
});

test('public road sheet exists with accessible text and collapsed research form',()=>{
 const html=read('index.html');
 for(const id of ['pza-road-sheet','pza-road-title','pza-road-guidance','pza-road-verification',
   'pza-road-details','pza-road-verification-details','pza-fieldwork-details',
   'pza-fieldwork-form','pza-road-close','pza-road-evidence','pza-road-width','pza-road-distance']){
   assert.match(html,new RegExp(`id="${id}"`));
 }
 assert.match(html,/<aside id="pza-road-sheet"[^>]*role="dialog"/);
 assert.match(html,/<details id="pza-fieldwork-details">/);
 assert.doesNotMatch(html,/id="protection-zone-toggle"/);
 assert.doesNotMatch(html,/id="pza-road-sheet"[^>]*hidden="false"/);
});

test('road focus button opens the real public guidance sheet',async()=>{
 const elements={};
 function el(id){return elements[id]={id,hidden:false,checked:false,disabled:false,attributes:{},events:{},style:{},
   textContent:'',innerHTML:'',value:'',elements:{namedItem:()=>null},classList:{add(){},remove(){}},
   setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,fn){this.events[name]=fn;},querySelector:()=>null};}
 for(const id of ['protection-zone-controls','protection-zone-toggle','protection-zone-status',
   'protection-zone-zoom','protection-zone-focus54','protection-zone-focus62',
   'protection-zone-mode-simple','protection-zone-mode-detail','pza-advanced-tools','pza-mode-guide',
   'pza-road-sheet','pza-fieldwork-form','pza-road-guidance','pza-road-verification',
   'pza-road-width','pza-road-distance','pza-road-summary','pza-road-title','pza-road-label',
   'pza-road-details','pza-road-verification-details','pza-fieldwork-details','pza-road-evidence',
   'pza-fieldwork-status','pza-fieldwork-count'])el(id);
 for(const kind of ['child','senior','candidates','accidents','radii'])el('protection-zone-'+kind);
 const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
 globalThis.document={getElementById:id=>elements[id]||null,querySelector:()=>null};
 globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(read('public/data/protection-zone/'+String(url).split('/').pop()))});
 const layers=new Map(),sources=new Map();let flownTo=null;
 const map={isStyleLoaded:()=>true,getStyle:()=>({layers:[{id:'label',type:'symbol'}]}),getSource:id=>sources.get(id),getLayer:id=>layers.get(id),
   addSource:(id,v)=>sources.set(id,v),addLayer:l=>layers.set(l.id,{...l,layout:{visibility:'visible'}}),setLayoutProperty:(id,k,v)=>{layers.get(id).layout[k]=v;},
   on:()=>{},flyTo:v=>{flownTo=v;},fitBounds:()=>{},getCanvas:()=>({style:{}})};
 const app={dataset:{tab:'map'},classList:{add(){},remove(){},contains:()=>false}};
 try{
   const api=installProtectionZoneMap({map,maplibregl:{Popup:class {}},app});
   await api.enable();
   elements['protection-zone-focus54'].events.click();
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(elements['pza-road-sheet'].hidden,false);
   assert.equal(elements['pza-road-title'].textContent,'상도로54길');
   assert.match(elements['pza-road-guidance'].innerHTML,/보행환경 확인 권장 구간/);
   assert.match(elements['pza-road-verification'].innerHTML,/보도·보차분리/);
   assert.equal(flownTo.zoom,16.8);
   api.disable();
   assert.equal(elements['pza-road-sheet'].hidden,true);
 }finally{globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
});
