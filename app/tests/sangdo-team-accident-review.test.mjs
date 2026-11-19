import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyTeamReview, installSangdoAccidentTeamReview, TEAM_LAYER_IDS} from '../src/sangdo-accident-team-review.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=part=>JSON.parse(fs.readFileSync(path.join(base,part),'utf8'));
const focus=read('public/data/safety/accidents/sangdo1_team_review.geojson');
const boundary=read('public/data/safety/accidents/sangdo1_team_osm_reference_boundary.geojson');

test('팀원 38행은 기존 38개 보행자 사고다발점에 포함되어 중복 마커를 만들지 않는다',()=>{
  const points=read('public/data/safety/accidents/dongjak_accident_points_all.geojson').features;
  const ids=new Set(points.filter(f=>f.properties.category==='pedestrian').map(f=>String(f.properties.source_fid)));
  assert.equal(ids.size,38);
  const rows=verifyTeamReview(focus,boundary);
  assert.equal(rows.length,3);
  for(const row of rows)assert.ok(ids.has(row.source_fid));
  assert.equal(focus.features[0].geometry.type,'Polygon');
  assert.equal(boundary.features[0].geometry.type,'Polygon');
});
test('상도1동 검토 기록은 세 연도별로 분리하고 합산 통계를 생성하지 않는다',()=>{
  const rows=verifyTeamReview(focus,boundary);
  assert.deepEqual(rows.map(x=>x.selection_year),[2022,2023,2024]);
  assert.deepEqual(rows.map(x=>x.accident_count),[8,7,8]);
  assert.deepEqual(rows.map(x=>x.death_count),[1,1,1]);
  assert.equal(focus.metadata.area_count,1);
  assert.match(focus.metadata.summation_warning,/합산하지 않음/);
  assert.equal(focus.metadata.district_taas_2023_rows,13);
  assert.equal(focus.metadata.taas_geocodable,false);
});
test('팀 검토용 지도 자료에는 추가 사고 점마커가 없다',()=>{
  assert.equal(focus.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)),true);
  assert.equal(boundary.features.every(f=>f.geometry.type==='Polygon'),true);
  const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
  assert.match(html,/id="dj-sangdo-team-toggle"/);
  assert.match(html,/src\/v802-sangdo-accident-review.css/);
  const installer=fs.readFileSync(path.join(base,'src/dongjak-verified-data-layers.js'),'utf8');
  assert.match(installer,/installSangdoAccidentTeamReview/);
});
test('지도 토글은 기존 사고 레이어를 재사용하고 스타일 전환 후 복원·정리한다',async()=>{
  const originalDocument=global.document,originalObserver=global.MutationObserver,originalFetch=global.fetch;
  function element(tag='div'){
    return {tag,children:[],attrs:{},hidden:false,disabled:false,textContent:'',listeners:new Map(),
      append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];},
      setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},
      addEventListener(k,fn){this.listeners.set(k,fn);},removeEventListener(k){this.listeners.delete(k);}};
  }
  const toggle=element('button'),panel=element(),accident=element('button');accident.setAttribute('aria-pressed','false');
  global.document={getElementById:id=>id==='dj-sangdo-team-toggle'?toggle:id==='dj-sangdo-team-panel'?panel:null,
    querySelector:sel=>sel.includes('data-dj-import')?accident:null,createElement:element};
  global.MutationObserver=class{observe(){} disconnect(){}};
  global.fetch=async p=>({ok:true,json:async()=>p.endsWith('sangdo1_team_review.geojson')?focus:boundary});
  const layers=new Map(),sources=new Map(),handlers=new Map();let boundsCalls=0, accidentEnables=0;
  const map={getStyle:()=>({}),getLayer:id=>layers.get(id),getSource:id=>sources.get(id),
    addSource(id,def){sources.set(id,{data:def.data,setData(d){this.data=d;}});},removeSource(id){sources.delete(id);},
    addLayer(layer){layers.set(layer.id,layer);},removeLayer(id){layers.delete(id);},
    on(k,fn){handlers.set(k,fn);},off(k,fn){if(handlers.get(k)===fn)handlers.delete(k);},
    fitBounds(){boundsCalls++;}};
  try{
    const dispose=installSangdoAccidentTeamReview({map,ensureAccidentsVisible:async()=>{accidentEnables++;accident.setAttribute('aria-pressed','true');}});
    await toggle.listeners.get('click')();
    assert.equal(accidentEnables,1);
    assert.equal(toggle.getAttribute('aria-pressed'),'true');
    assert.equal(panel.hidden,false);
    assert.ok(layers.has(TEAM_LAYER_IDS.areaFill));
    assert.ok(layers.has(TEAM_LAYER_IDS.areaOutline));
    assert.ok(layers.has(TEAM_LAYER_IDS.boundaryLine));
    assert.equal(sources.get(TEAM_LAYER_IDS.areaSource).data.features[0].geometry.type,'Polygon');
    assert.equal(boundsCalls,1);
    layers.clear();sources.clear();handlers.get('style.load')();
    assert.ok(layers.has(TEAM_LAYER_IDS.areaFill));
    await toggle.listeners.get('click')();
    assert.equal(toggle.getAttribute('aria-pressed'),'false');
    assert.equal(panel.hidden,true);
    assert.equal(layers.size,0);
    assert.equal(sources.size,0);
    dispose();
    assert.equal(handlers.size,0);
  }finally{global.document=originalDocument;global.MutationObserver=originalObserver;global.fetch=originalFetch;}
});
