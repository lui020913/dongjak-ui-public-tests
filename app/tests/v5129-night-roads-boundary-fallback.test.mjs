import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installNightVisibility} from '../src/night-visibility-map.js';

class Element {
  constructor(id=''){this.id=id;this.hidden=false;this.checked=true;this.value='20';this.textContent='';this.dataset={};this.attributes={};this.listeners={};this.children=[];this.parentElement=null;this.classList={remove(){}};}
  setAttribute(k,v){this.attributes[k]=String(v);}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  dispatch(k){for(const fn of this.listeners[k]||[])fn({target:this});}
  append(...els){for(const el of els){if(el.parentElement)el.parentElement.children=el.parentElement.children.filter(x=>x!==el);this.children.push(el);el.parentElement=this;}}
  replaceChildren(...els){this.children=els;}
  querySelector(){return null;}
}
class MapMock {
  constructor(){this.sources={};this.layers={};this.handlers={};this.style={layers:[]};this.canvas={style:{}};this.zoom=16;this.center={lng:126.9513,lat:37.5015};}
  getStyle(){return this.style;}
  getSource(id){return this.sources[id]??null;}
  addSource(id,x){this.sources[id]={data:x.data,setData(data){this.data=data;}};}
  addLayer(layer){this.layers[layer.id]={...layer,layout:{...layer.layout}};this.style.layers.push({id:layer.id});}
  getLayer(id){return this.layers[id]??null;}
  setFilter(id,v){this.layers[id].filter=v;}
  setLayoutProperty(id,k,v){this.layers[id].layout[k]=v;}
  moveLayer(id){this.style.layers=this.style.layers.filter(x=>x.id!==id);this.style.layers.push({id});}
  on(k,cbOrLayer,cb){(this.handlers[k]??=[]).push(cb??cbOrLayer);}
  getZoom(){return this.zoom;}
  getCenter(){return this.center;}
  flyTo({center,zoom}){this.center={lng:center[0],lat:center[1]};this.zoom=zoom;}
  getCanvas(){return this.canvas;}
}
const dataDir=new URL('../public/data/sangdo1-night/',import.meta.url);
const load=name=>JSON.parse(readFileSync(new URL(name,dataDir)));
const wait=async predicate=>{
  for(let i=0;i<200;i++){
    if(predicate())return;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.fail('야간 도로 샘플을 기한 내 지도에 표시하지 못했습니다');
};

test('외부 행정경계가 대기해도 저장된 도로의 3가지 선을 먼저 표시하고, 경계가 오면 잘라냄',async()=>{
  const old={document:globalThis.document,fetch:globalThis.fetch,MutationObserver:globalThis.MutationObserver};
  const names=['night-visibility-toggle','night-visibility-controls','night-visibility-quick-off','night-visibility-radius','night-visibility-radius-value','night-visibility-exclude-major','night-visibility-show-alley','night-visibility-show-path','night-visibility-status','night-visibility-stats','night-visibility-top','night-visibility-float','night-visibility-float-slot','night-visibility-float-content','night-visibility-float-collapse','night-visibility-float-stop','night-occlusion-details'];
  const els=Object.fromEntries(names.map(x=>[x,new Element(x)]));
  const origin=new Element('origin');origin.append(els['night-visibility-controls']);
  const mode=new Element('mode');mode.checked=true;mode.value='occlusion';
  const street=load('lights.json'),security=load('security.json');
  const roads=load('occlusion-road-samples.json'),reach=load('occlusion-light-reach.geojson');
  let finishBoundary;
  const pending=new Promise(resolve=>{finishBoundary=resolve;});
  const map=new MapMock();
  map.sources['dongjak-admin-dongs']={getData:()=>pending};
  try{
    globalThis.document={getElementById:id=>els[id]??null,createElement:tag=>new Element(tag),querySelectorAll:query=>query.includes('night-analysis-mode')?[mode]:[]};
    globalThis.MutationObserver=class{observe(){}};
    globalThis.fetch=async url=>{
      const s=String(url);
      const json=s.endsWith('/lights.json')?street:s.endsWith('/security.json')?security:s.endsWith('/occlusion-light-reach.geojson')?reach:s.endsWith('/occlusion-road-samples.json')?roads:null;
      if(!json)throw new Error('테스트 중 외부 네트워크 접근 시도: '+s);
      return {ok:true,json:async()=>json};
    };
    const app=new Element('app');app.dataset.tab='map';
    const theme={currentTheme:()=> 'light',setTemporaryTheme(){}};
    const view=installNightVisibility({map,maplibregl:{Popup:class{}},app,theme});
    els['night-visibility-toggle'].dispatch('click');
    await wait(()=>map.sources['dj-night-occ']?.data?.features?.length>100);
    assert.equal(view.isEnabled(),true);
    assert.match(els['night-visibility-status'].textContent,/행정경계 미확인/);
    assert.equal(map.sources['dj-night-area'].data.features.length,0,'임의 경계선을 그리지 않음');
    assert.equal(map.sources['dj-night-lights'].data.features.length,0,'경계가 확인되기 전에는 경계 밖 조명 오표시 방지');
    assert.equal(map.sources['dj-night-reach'].data.features.length,0,'경계 미확인 상태에서 조명 영향권 숨김');
    const types=map.sources['dj-night-occ'].data.features;
    assert.ok(types.some(f=>f.properties.category==='clear'));
    assert.ok(types.some(f=>f.properties.kind==='alley'&&['outside','blocked'].includes(f.properties.category)));
    assert.ok(types.some(f=>f.properties.kind==='path'&&['outside','blocked'].includes(f.properties.category)));
    assert.equal(map.layers['dj-night-occ-clear'].layout.visibility,'visible');
    const before=types.length;
    const geom={type:'Polygon',coordinates:[[[126.952,37.502],[126.956,37.502],[126.956,37.505],[126.952,37.505],[126.952,37.502]]]};
    finishBoundary({features:[{properties:{dong_name:'상도1동'},geometry:geom}]});
    await wait(()=>map.sources['dj-night-area']?.data?.features?.length===1);
    assert.equal(map.sources['dj-night-area'].data.features[0].geometry,geom);
    const lightPoints=map.sources['dj-night-lights'].data.features;
    assert.ok(lightPoints.length>0&&lightPoints.length<419,'상도 경계 내부의 조명만 표시');
    assert.ok(lightPoints.every(f=>f.geometry.coordinates[0]>=126.952&&f.geometry.coordinates[0]<=126.956&&
      f.geometry.coordinates[1]>=37.502&&f.geometry.coordinates[1]<=37.505),'경계 밖 조명 제거');
    const included=new Set(lightPoints.map(f=>f.properties.idx));
    assert.ok(map.sources['dj-night-reach'].data.features.every(f=>included.has(f.properties.idx)),
      '경계 밖 조명의 광도달 폴리곤 제거');
    assert.ok(map.sources['dj-night-occ'].data.features.length<before,'공식 경계 밖의 도로 제거');
    assert.match(els['night-visibility-status'].textContent,/2026-10 행정경계/);
  }finally{
    globalThis.document=old.document;globalThis.fetch=old.fetch;globalThis.MutationObserver=old.MutationObserver;
  }
});

test('행정동 MapLibre 소스가 늦게 준비되어도 화면 밖 조명은 표시하지 않고 완료 후 복구',async()=>{
  const old={document:globalThis.document,fetch:globalThis.fetch,
    MutationObserver:globalThis.MutationObserver,localStorage:globalThis.localStorage};
  const names=['night-visibility-toggle','night-visibility-controls','night-visibility-quick-off','night-visibility-radius',
    'night-visibility-radius-value','night-visibility-exclude-major','night-visibility-show-alley',
    'night-visibility-show-path','night-visibility-status','night-visibility-stats','night-visibility-top',
    'night-visibility-float','night-visibility-float-slot','night-visibility-float-content',
    'night-visibility-float-collapse','night-visibility-float-stop','night-occlusion-details'];
  const els=Object.fromEntries(names.map(x=>[x,new Element(x)]));
  new Element('origin').append(els['night-visibility-controls']);
  const mode=new Element('mode');mode.checked=true;mode.value='occlusion';
  const street=load('lights.json'),security=load('security.json');
  const roads=load('occlusion-road-samples.json'),reach=load('occlusion-light-reach.geojson');
  const map=new MapMock();
  const pending=new Promise(()=>{});
  map.sources['dongjak-admin-dongs']={getData:()=>pending};
  const stored={};
  try{
    globalThis.localStorage={getItem:k=>stored[k]??null,setItem:(k,v)=>{stored[k]=v;}};
    globalThis.document={getElementById:id=>els[id]??null,createElement:tag=>new Element(tag),
      querySelectorAll:query=>query.includes('night-analysis-mode')?[mode]:[]};
    globalThis.MutationObserver=class{observe(){}};
    globalThis.fetch=async url=>{
      const s=String(url);
      const json=s.endsWith('/lights.json')?street:s.endsWith('/security.json')?security:
        s.endsWith('/occlusion-light-reach.geojson')?reach:s.endsWith('/occlusion-road-samples.json')?roads:null;
      if(!json)throw new Error('unexpected fetch '+s);
      return {ok:true,json:async()=>json};
    };
    const app=new Element('app');app.dataset.tab='map';
    const view=installNightVisibility({map,maplibregl:{Popup:class{}},app,
      theme:{currentTheme:()=> 'light',setTemporaryTheme(){}}});
    els['night-visibility-toggle'].dispatch('click');
    await wait(()=>map.sources['dj-night-occ']?.data?.features?.length>100);
    assert.equal(map.sources['dj-night-lights'].data.features.length,0);
    const official={type:'Polygon',coordinates:[[[126.950,37.498],[126.956,37.498],[126.956,37.505],
      [126.950,37.505],[126.950,37.498]]]};
    map.sources['dongjak-admin-dongs']={getData:async()=>({features:[
      {properties:{dong_name:'상도1동'},geometry:official}]})};
    for(const fn of map.handlers.sourcedata||[])fn({sourceId:'dongjak-admin-dongs'});
    await wait(()=>map.sources['dj-night-lights']?.data?.features?.length>0);
    const lights=map.sources['dj-night-lights'].data.features;
    assert.ok(lights.length<419,'조명 수가 상도1동 내 위치로 제한됨');
    assert.ok(lights.every(f=>f.geometry.coordinates[0]>=126.950&&f.geometry.coordinates[0]<=126.956&&
      f.geometry.coordinates[1]>=37.498&&f.geometry.coordinates[1]<=37.505));
    assert.ok(map.sources['dj-night-occ']?.data?.features.length>0,'도로 분석은 계속 유지');
    assert.ok(Object.values(stored).some(v=>v.includes('2026-10-01')),'확인된 경계만 캐시');
    assert.equal(view.isEnabled(),true);
  }finally{
    globalThis.document=old.document;globalThis.fetch=old.fetch;
    globalThis.MutationObserver=old.MutationObserver;globalThis.localStorage=old.localStorage;
  }
});

test('광도달 폴리곤 응답이 영원히 대기하더라도 오프라인 도로 샘플의 3종 선을 생성',async()=>{
  const old={document:globalThis.document,fetch:globalThis.fetch,
    MutationObserver:globalThis.MutationObserver,localStorage:globalThis.localStorage};
  const names=['night-visibility-toggle','night-visibility-controls','night-visibility-quick-off','night-visibility-radius',
    'night-visibility-radius-value','night-visibility-exclude-major','night-visibility-show-alley','night-visibility-show-path',
    'night-visibility-status','night-visibility-stats','night-visibility-top','night-visibility-float',
    'night-visibility-float-slot','night-visibility-float-content','night-visibility-float-collapse',
    'night-visibility-float-stop','night-occlusion-details'];
  const els=Object.fromEntries(names.map(id=>[id,new Element(id)]));
  new Element('origin').append(els['night-visibility-controls']);
  const mode=new Element('mode');mode.checked=true;mode.value='occlusion';
  const map=new MapMock();
  map.sources['dongjak-admin-dongs']={getData:()=>new Promise(()=>{})};
  try{
    globalThis.localStorage={getItem:()=>null,setItem(){}};
    globalThis.document={getElementById:id=>els[id]??null,createElement:tag=>new Element(tag),
      querySelectorAll:query=>query.includes('night-analysis-mode')?[mode]:[]};
    globalThis.MutationObserver=class{observe(){}};
    globalThis.fetch=async url=>{
      const s=String(url);
      if(s.endsWith('/occlusion-light-reach.geojson'))return new Promise(()=>{});
      const filename=s.split('/').at(-1);
      if(!['lights.json','security.json','occlusion-road-samples.json'].includes(filename))
        throw new Error('unexpected fetch '+s);
      return {ok:true,json:async()=>load(filename)};
    };
    const app=new Element('app');app.dataset.tab='map';
    installNightVisibility({map,app,maplibregl:{Popup:class{}},
      theme:{currentTheme:()=> 'light',setTemporaryTheme(){}}});
    els['night-visibility-toggle'].dispatch('click');
    await wait(()=>map.sources['dj-night-occ']?.data?.features?.length>100);
    const segments=map.sources['dj-night-occ'].data.features;
    assert.ok(segments.some(f=>f.properties.category==='clear'),'민트색 조명 도달 구간');
    assert.ok(segments.some(f=>f.properties.kind==='alley'&&['blocked','outside'].includes(f.properties.category)),
      '코랄색 골목 미도달 구간');
    assert.ok(segments.some(f=>f.properties.kind==='path'&&['blocked','outside'].includes(f.properties.category)),
      '라벤더색 보행로 미도달 구간');
    assert.equal(map.sources['dj-night-lights'].data.features.length,0,
      '행정경계가 아직 없으면 외부 조명 점은 표시하지 않음');
  }finally{
    globalThis.document=old.document;globalThis.fetch=old.fetch;
    globalThis.MutationObserver=old.MutationObserver;globalThis.localStorage=old.localStorage;
  }
});
