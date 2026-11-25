import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('v8.5.6 narrow PC header has an inset, bounded search and separate utility column',()=>{
  const css=read('src/v856-completion.css');
  assert.match(css,/@media\s*\(min-width:700px\)\s*and\s*\(max-width:1079px\)\s*/);
  assert.match(css,/\.topbar\{[\s\S]*?top:8px!important;left:10px!important;right:10px!important/);
  assert.match(css,/#dj-settings-mobile\{display:none!important/);
  assert.match(css,/width:min\(560px,100%\)!important;max-width:560px!important/);
  assert.match(css,/grid-template-columns:48px minmax\(150px,1fr\) max-content!important/);
});

test('desktop Safety Map tab is physically first and safety launchers share icon/type geometry',()=>{
  const js=read('src/v856-ui-completion.js');
  const css=read('src/v856-completion.css');
  assert.match(js,/nav\.insertBefore\(mapTab/);
  assert.match(js,/for\(const tab of originalOrder\)/);
  assert.match(css,/#bottom-nav>\.nav-tab\[data-tab="map"\]\{order:-1!important/);
  assert.match(css,/height:46px!important;min-height:46px!important;max-height:46px!important/);
  assert.match(css,/font-size:13px!important;font-weight:750!important/);
  assert.match(css,/flex:0 0 18px!important;width:18px!important;height:18px!important/);
});

test('iPhone guide has three clear installation steps and removes the latest-update action',()=>{
  const html=read('index.html');
  const old=read('src/v809-precision-polish.js');
  const mobile=read('src/mobile-map-controls.js');
  assert.match(html,/class="dj856-ios-install-steps"/);
  assert.equal((html.match(/<div><b>[123]<\/b>/g)||[]).length,3);
  assert.doesNotMatch(html,/id="dj-guide-release-details"/);
  assert.match(html,/<summary aria-expanded="false"><span>iPhone에서 앱처럼 사용하기<\/span><span class="dj852-tip-chevron"/);
  assert.match(old,/releaseButton\.remove\(\)/);
  assert.match(mobile,/version-history-trigger'\)\?\.click\(\)/);
  assert.doesNotMatch(read('src/v856-ui-completion.js'),/releaseSection\.append\(releaseButton\)/);
  assert.doesNotMatch(read('src/v856-ui-completion.js'),/dongjak:open-release-history/);
});

test('release-history shortcut opens and highlights the exact version instead of only the first entry',()=>{
  const history=read('src/version-history-v7.js');
  const completion=read('src/v856-ui-completion.js');
  assert.match(history,/article\.dataset\.version=/);
  assert.match(history,/dongjak:open-release-history/);
  assert.match(history,/item\.dataset\.version===normalized/);
  assert.match(history,/dj856-release-focus/);
  assert.doesNotMatch(completion,/detail:\{version\}/);
});

test('Nodeul Island marker is a MapLibre geographic symbol, not a lagging DOM Marker',()=>{
  const source=read('src/nearby-place-labels.js');
  assert.doesNotMatch(source,/installPriorityMarkers|new maplibregl\.Marker/);
  assert.match(source,/map\.addImage\(id/);
  assert.match(source,/pinId='dj-nodeulseom-detail-pin'/);
  assert.match(source,/map\.addLayer\(\{id:pinId,type:'symbol'/);
  assert.match(source,/id:nameId,type:'symbol'/);
  assert.match(source,/nameId='dj-nodeulseom-detail-name'/);
});

test('subway line switching reuses the open sheet and preserves scroll/tab state',()=>{
  const source=read('src/transport-map.js');
  const completion=read('src/v856-ui-completion.js');
  const css=read('src/v856-completion.css');
  assert.match(source,/open\(\{\.\.\.current,selectedLine:line\},true\)/);
  assert.match(completion,/#transport-title \.dj-metro-line-selector/);
  assert.match(completion,/transportPanel\.scrollTo=\(\)=>\{\}/);
  assert.match(completion,/transportPanel\.scrollTop=scrollTop/);
  assert.match(css,/dj856-line-switching/);
});

test('mobile shows one weather pill and the TIP has a narrower right-hand lane',()=>{
  const css=read('src/v856-completion.css');
  assert.match(css,/\.topbar \.header-tools #weather-widget\{[\s\S]*?display:none!important/);
  assert.match(css,/#dj840-map-tip:not\(\[hidden\]\)\{[\s\S]*?width:min\(248px,calc\(100vw - 128px\)\)/);
  assert.match(css,/dj856-ios-install-steps/);
});

test('Nodeul map icon and visible name use independent geographic symbol layers',async()=>{
  const {installNearbyPlaceLabels}=await import('../src/nearby-place-labels.js');
  const originalDocument=globalThis.document;
  const images=new Map(),sources=new Map(),layers=[];
  const ctx={beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},closePath(){},stroke(){},quadraticCurveTo(){},
    getImageData(){return {data:new Uint8ClampedArray(64*64*4)}}};
  globalThis.document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return ctx;}};}};
  const map={
    getSource(id){return sources.get(id);},getLayer(id){return layers.find(layer=>layer.id===id);},
    hasImage(id){return images.has(id);},addImage(id,image,options){images.set(id,{image,options});},
    addSource(id,source){sources.set(id,source);},addLayer(layer){layers.push(layer);},
    setLayoutProperty(id,key,value){const layer=layers.find(item=>item.id===id);if(layer)layer.layout[key]=value;}
  };
  try{
    installNearbyPlaceLabels(map);
    const pin=layers.find(layer=>layer.id==='dj-nodeulseom-detail-pin');
    const name=layers.find(layer=>layer.id==='dj-nodeulseom-detail-name');
    assert.ok(images.has('dj-nodeulseom-pin'));
    assert.equal(pin.layout['icon-image'],'dj-nodeulseom-pin');
    assert.equal(pin.layout['icon-anchor'],'bottom');
    assert.deepEqual(name.layout['text-field'],['get','name']);
    assert.equal(name.layout['text-allow-overlap'],true);
    assert.equal(name.layout['text-ignore-placement'],true);
  }finally{globalThis.document=originalDocument;}
});
