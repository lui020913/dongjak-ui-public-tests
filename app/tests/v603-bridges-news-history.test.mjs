import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installHangangBridgeLabels} from '../src/hangang-bridge-labels.js';
import {renderDongjakNewsItems} from '../src/dongjak-news.js';
import {VERSION_HISTORY,DEVELOPMENT_PHASES} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';

test('v6.0.3 map labels remain present after real-line resolution and reorder over late overlays', async()=>{
  const sources=new Map();const layers=[{id:'background',type:'background'}];
  const callbacks=new Map();
  const map={
    addSource:(id,src)=>sources.set(id,{...src,setData(data){this.data=data}}),
    getSource:id=>sources.get(id),addLayer:(layer)=>layers.push(layer),
    getStyle:()=>({layers}),
    moveLayer:(id)=>{const i=layers.findIndex(x=>x.id===id);if(i>=0)layers.push(...layers.splice(i,1));},
    on:(type,cb)=>{if(!callbacks.has(type))callbacks.set(type,new Set());callbacks.get(type).add(cb)},
    off:(type,cb)=>callbacks.get(type)?.delete(cb),
    once:()=>{},
    queryRenderedFeatures:()=>[{type:'Feature',properties:{name:'동작대교'},geometry:{type:'LineString',coordinates:[[126.98320,37.5160],[126.98320,37.5200]]}}],
    querySourceFeatures:()=>[]
  };
  const cleanup=installHangangBridgeLabels(map,{fetchImpl:async()=>({ok:false,status:503})});
  assert.equal(sources.get('dj-hangang-bridges-osm').data.features.length,5);
  layers.push({id:'late-building-extrusion',type:'fill-extrusion'});
  for(const cb of callbacks.get('idle')||[])cb();
  assert.equal(layers.at(-1).id,'dj-hangang-bridge-osm-labels');
  for(const cb of callbacks.get('moveend')||[])cb();
  const labels=sources.get('dj-hangang-bridges-osm').data.features;
  assert.equal(labels.length,5,'named bridge geometry must not remove the reference fallback');
  const dongjak=labels.find(f=>f.properties.name==='동작대교');
  assert.ok(Math.abs(dongjak.geometry.coordinates[1]-37.51070)<0.00025);
  cleanup();
});

function fakeDom(){
  class El{
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.className='';this.classList={add:name=>{this.className+=` ${name}`;}};}
    append(...xs){for(const x of xs)this.children.push(x);}
    replaceChildren(...xs){this.children=xs;}
    addEventListener(type,handler){this.listeners[type]=handler;}
    remove(){for(const c of all) c.children=c.children.filter(x=>x!==this);}
  }
  const all=[];const document={createElement(tag){const e=new El(tag);all.push(e);return e;}};
  return {document,root:new El('div')};
}

test('v6.0.3 missing image and broken image both produce title-only news layout',()=>{
  const before=globalThis.document;
  const {document,root}=fakeDom();globalThis.document=document;
  try{
    renderDongjakNewsItems(root,[{title:'제목만 있는 기사',source:'언론사',imageUrl:''},
      {title:'사진이 열리지 않는 기사',source:'언론사',imageUrl:'https://example.org/article.jpg'}]);
    assert.equal(root.children.length,2);
    assert.match(root.children[0].className,/dongjak-news-no-image/);
    assert.ok(root.children[0].children.some(x=>x.tag==='strong'&&x.textContent==='제목만 있는 기사'));
    const second=root.children[1];
    const img=second.children.find(x=>x.tag==='img');assert.ok(img);
    img.listeners.error();
    assert.match(second.className,/dongjak-news-no-image/);
    assert.equal(second.children.some(x=>x.tag==='img'),false);
    assert.equal(second.children.some(x=>x.tag==='strong'),true);
  }finally{globalThis.document=before;}
});

test('v6.0.3 sequential history includes v1-v5 originals, followed by v6 fixes',()=>{
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.equal(LEGACY_VERSION_HISTORY.length,60);
  for(let i=1;i<=5;i++)assert.ok(LEGACY_VERSION_HISTORY.some(e=>e.version.startsWith(`v${i}.`)));
  const src=readFileSync(new URL('../src/version-history.js',import.meta.url),'utf8');
  assert.match(src,/initReleaseCatalog/);
  assert.ok(readFileSync(new URL('../src/version-history-v7.js',import.meta.url),'utf8').includes('makeHistoryCatalog'));
  assert.doesNotMatch(src,/makeRelease/);
  assert.equal(DEVELOPMENT_PHASES.length,7);
});

test('administrative label clipping hides external bridge and other non-administrative labels',async()=>{
  const {clipBasemapLabelsToDistrict}=await import('../src/ui-environment.js');
  const filtered=[];
  const map={getStyle:()=>({layers:[
    {id:'dj-hangang-bridge-osm-labels',type:'symbol'},
    {id:'dj-hangang-bridge-geometry-labels',type:'symbol'},
    {id:'base-city-label',type:'symbol'},
    {id:'dongjak-custom-label',type:'symbol'},
    {id:'neighbor-district-names',type:'symbol'},
    {id:'dj-transit-multi-stops-transfer-label',type:'symbol'}
  ]}),getFilter:()=>null,setFilter:(id,filter)=>filtered.push([id,filter])};
  clipBasemapLabelsToDistrict(map,{type:'Polygon',coordinates:[[[126.9,37.49],[127,37.49],[127,37.52],[126.9,37.49]]]});
  assert.deepEqual(filtered.map(([id])=>id),['dj-hangang-bridge-osm-labels','dj-hangang-bridge-geometry-labels','base-city-label','dongjak-custom-label']);
});
