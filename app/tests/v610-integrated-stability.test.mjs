import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchDongjakNews} from '../server/dongjak-news.mjs';
import {installRoadWidthLayer} from '../src/road-width-layer.js';
import {mobileChromeMetrics} from '../src/mobile-ui-coordinator.js';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

test('v6.1: news handles blocked first official provider and uses healthy second without fabricated headlines',async()=>{
  const html='<table><tr><td><a href="/portal/bbs/B0000171/view.do?nttId=271828&menuNo=200647">동작구 도보 안전 정비</a></td></tr></table>';
  const requests=[];
  const fetchImpl=async url=>{
    requests.push(String(url));
    if(String(url).includes('B0000022'))return {ok:false,status:502};
    if(String(url).includes('B0000171'))return {ok:true,text:async()=>html};
    throw new Error('unrecognized');
  };
  const news=await fetchDongjakNews({type:'official',fetchImpl,force:true,now:1794038401000});
  assert.equal(news.items[0]?.title,'동작구 도보 안전 정비');
  assert.match(news.source,/동작구청 보도자료/);
  assert.equal(requests.length,2);
});

test('v6.1: empty news upstream fails explicitly, never invents articles',async()=>{
  const fetchImpl=async()=>({ok:true,text:async()=>'<html>no articles here</html>'});
  const {fetchDongjakNews:uncached}=await import('../server/dongjak-news.mjs?v610-uncached');
  await assert.rejects(()=>uncached({type:'official',fetchImpl,force:true,now:1794038409000}),{status:502});
});

test('road width remains on after a background click and closes with its explicit X',()=>{
  const originalDoc=globalThis.document, originalWindow=globalThis.window;
  const btn={disabled:false,attributes:{},style:{},listeners:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},getBoundingClientRect(){return {top:50,left:30};}};
  const legend={hidden:true,offsetHeight:80,style:{setProperty(){}}};
  const close={listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}};
  const handlers=new Map(),layers=new Map();
  const map={
    addSource(){},getStyle(){return {layers:[{id:'label',type:'symbol'}]};},
    addLayer(x){layers.set(x.id,x);},getLayer(x){return layers.get(x);},
    setLayoutProperty(id,k,value){layers.get(id).layout[k]=value;},
    getContainer(){return {getBoundingClientRect(){return {top:0,right:300};}}},
    queryRenderedFeatures(){return [];},
    on(type,layer,fn){const name=typeof layer==='function'?'map':layer;handlers.set(`${type}:${name}`,fn??layer);},
    getCanvas(){return {style:{}}}
  };
  const popup=class {constructor(){throw new Error('Should not make popup on map dismissal');}};
  globalThis.document={getElementById:id=>id==='toggle-road-width'?btn:id==='road-width-legend'?legend:id==='road-width-legend-close'?close:null};
  globalThis.window={innerWidth:375,innerHeight:780};
  try{
    installRoadWidthLayer({map,maplibregl:{Popup:popup}});
    btn.listeners.click();
    assert.equal(btn.attributes['aria-pressed'],'true');
    assert.equal(legend.hidden,false);
    handlers.get('click:map')?.({point:{x:20,y:20},lngLat:{lng:126.94,lat:37.49}});
    assert.equal(btn.attributes['aria-pressed'],'true');
    assert.equal(legend.hidden,false);
    close.listeners.click();
    assert.equal(btn.attributes['aria-pressed'],'false');
    assert.equal(legend.hidden,true);
  }finally{globalThis.document=originalDoc;globalThis.window=originalWindow;}
});

test('v6.1: mobile viewport geometry and exclusive modal CSS present',()=>{
  assert.deepEqual(mobileChromeMetrics({headerBottom:66,navHeight:70,viewportHeight:750}),{header:66,nav:70,viewport:750});
  const css=read('src/mobile-ui-v610.css');
  assert.match(css,/#app\[data-tab="map"\]/);
  assert.match(css,/\.map-controls-open.*:is\(/);
  assert.match(css,/\.map-safety-open.*:is\(/);
  assert.match(css,/dj-far-haze-active::before\{display:none/);
  const code=read('src/mobile-ui-coordinator.js');
  assert.match(code,/ResizeObserver/);assert.match(code,/MutationObserver/);
});

test('v6.1: facility click focuses selected facility coordinates',()=>{
  const src=read('src/place-details.js');
  assert.match(src,/map\.easeTo\?\.\(\{center:\[p\.lng,p\.lat\]/);
  assert.match(read('src/civic-facility-layer.js'),/feat\.geometry\?\.type==='Point'/);
});

test('v6.1: 3D night removes duplicate WebGL sawtooth roads but retains accessible analysis layers',()=>{
  const js=read('src/night-visibility-map.js');
  assert.match(js,/USE_CUSTOM_NIGHT_ROADS=false/);
  assert.match(js,/dj-night-dark-alley/);assert.match(js,/dj-night-lit-line/);
  assert.match(js,/casing:'#304955'/);
});

test('v6.1.2: continuous terrain prevents pitch or viewport-boundary suppression and preserves history',()=>{
  const js=read('src/main.js');
  assert.match(js,/map\.setTerrain\(\{source:'dongjak-terrain-dem',exaggeration:1\.0\}\)/);
  const sync=js.split('function syncAutomaticTerrain(_pitch) {')[1].split('function visibleBuilding2D')[0];
  assert.doesNotMatch(sync,/map\.setTerrain\(null\)/);
  assert.match(sync,/djTransitExterior==='true'/);
  const scope=js.split('function syncTransitExterior(force=false){')[1].split('function clearTransitPreview(){')[0];
  assert.match(scope,/if\(active\)\{[\s\S]*?map\.setTerrain\(null\)/);
  assert.match(scope,/transitContextLayers\.restore\(\);[\s\S]*?syncTiltWithBuildings\(\)/);
  assert.doesNotMatch(js,/TERRAIN_DISABLE_PITCH|TERRAIN_ENABLE_PITCH/);
  assert.match(read('src/version-history.js'),/v6\.0\.21/);
  assert.doesNotMatch(read('src/version-history-v7.js'),/버전별 업데이트 내역/);
});

test('v6.1: diagnostics include official news, local media and transit with no service key logging',()=>{
  const js=read('scripts/check-transport-live.mjs');
  assert.match(js,/\['official','media'\]/);
  assert.match(js,/bus\/stops-nearby/);
  assert.doesNotMatch(js,/console\.log\([^\n]*serviceKey/i);
});
