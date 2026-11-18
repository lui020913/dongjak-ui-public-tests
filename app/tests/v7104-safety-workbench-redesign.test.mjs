import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  BUS_STOP_REFERENCE_SIZES,SAFETY_MARKER_LAYOUT_SIZE,SAFETY_MARKER_RATIO,
  SAFETY_GLYPH_PATHS,SAFETY_ICON_COLORS
} from '../src/dongjak-safety-symbols.js';
import {installDongjakOfficialDataLayers,EXTRA_LAYER_DEFS} from '../src/dongjak-verified-data-layers.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('safety drawer uses five accessible groups and function titles rather than team labels',()=>{
  const html=source('index.html');
  for(const group of ['data','facilities','traffic','night','actions']){
    assert.match(html,new RegExp(`id="dj-safety-${group}"`));
    assert.match(html,new RegExp(`data-dj-safety-target="dj-safety-${group}"`));
  }
  for(const name of Object.keys(EXTRA_LAYER_DEFS)){
    assert.equal(html.match(new RegExp(`data-dj-import="${name}"`,'g'))?.length,1);
    assert.match(html,new RegExp(`data-dj-entry="${name}"`));
  }
  assert.ok(html.includes('상도1동 횡단 지점'));
  assert.ok(!html.includes('팀원 횡단지점 조사'));
  assert.ok(html.includes('dj-slope-legend'));
  assert.ok(html.includes('dj-standard-legend'));
  assert.ok(html.includes('night-coverage-legend'));
  assert.ok(html.includes('pza-legend'));
});

test('each point layer has its own map pictogram with 1.5x the bus icon size',()=>{
  assert.equal(SAFETY_MARKER_RATIO,1.5);
  for(const [zoom,busSize] of BUS_STOP_REFERENCE_SIZES){
    const i=SAFETY_MARKER_LAYOUT_SIZE.indexOf(zoom);
    assert.ok(i>0,`Zoom ${zoom} scale missing`);
    assert.ok(Math.abs(SAFETY_MARKER_LAYOUT_SIZE[i+1]-busSize*1.5)<1e-10);
  }
  for(const name of Object.keys(EXTRA_LAYER_DEFS)){
    assert.ok(Array.isArray(SAFETY_GLYPH_PATHS[name]));
    assert.match(SAFETY_ICON_COLORS[name],/^#[0-9a-f]{6}$/);
  }
});

test('optional point markers use icons and low-zoom clusters without changing slope line',async()=>{
  const originalDoc=globalThis.document,originalPath=globalThis.Path2D,originalFetch=globalThis.fetch;
  const glyphs=new Map(),layers=new Map(),sources=new Map(),listeners=new Map();
  const fakeContext={
    clearRect(){},beginPath(){},roundRect(){},fill(){},save(){},translate(){},scale(){},stroke(){},restore(){},
    getImageData(){return {data:new Uint8ClampedArray(64*64*4)};}
  };
  globalThis.document={createElement(type){assert.equal(type,'canvas');return {getContext:()=>fakeContext};},
    querySelectorAll:()=>[],getElementById:()=>null};
  globalThis.Path2D=class {constructor(d){this.d=d;}};
  globalThis.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[126.95,37.5]},properties:{id:'1'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[126.951,37.501]},properties:{id:'2'}}
  ]})});
  const map={
    getStyle:()=>({layers:[]}),getSource:id=>sources.get(id),addSource:(id,s)=>sources.set(id,s),
    getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),
    setLayoutProperty:(id,k,v)=>{layers.get(id).layout[k]=v;},
    hasImage:id=>glyphs.has(id),addImage:(id,data)=>glyphs.set(id,data),
    on:(n,f)=>listeners.set(n,f),off:n=>listeners.delete(n)
  };
  const boundary={type:'Polygon',coordinates:[[[126.9,37.45],[127,37.45],[127,37.55],[126.9,37.55],[126.9,37.45]]]};
  try{
    const ctl=installDongjakOfficialDataLayers({map,getBoundary:()=>boundary});
    await ctl.setVisible('accidents',true);
    const key='dj-external-accidents';
    assert.equal(layers.get(key).type,'symbol');
    assert.deepEqual(layers.get(key).layout['icon-size'],SAFETY_MARKER_LAYOUT_SIZE);
    assert.equal(sources.get(key).cluster,true);
    assert.ok(layers.has(key+'-cluster'));
    assert.ok(layers.has(key+'-cluster-label'));
    assert.ok(glyphs.has('dj-safety-symbol-accidents'));
    await ctl.setVisible('accidents',false);
    for(const id of [key,key+'-cluster',key+'-cluster-label'])assert.equal(layers.get(id).layout.visibility,'none');
    ctl.dispose();
  }finally{
    if(originalDoc===undefined)delete globalThis.document;else globalThis.document=originalDoc;
    if(originalPath===undefined)delete globalThis.Path2D;else globalThis.Path2D=originalPath;
    globalThis.fetch=originalFetch;
  }
});

test('new workbench stylesheet remains scoped to safety drawer and mobile widths',()=>{
  const css=source('src/safety-workbench-v7103.css');
  assert.match(css,/#app \.dj-safety-group/);
  assert.match(css,/#app \.dj-import-grid button:is\(\[data-dj-import\],\[data-bocha-import\]\)/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/#app\[data-theme="dark"\] \.dj-import-entry/);
  const entry=source('src/safety-workbench-entry-v7104.js');
  const html=source('index.html');
  assert.ok(entry.includes('installSafetyWorkbenchUI(document)'));
  assert.ok(html.includes('src="/src/safety-workbench-entry-v7104.js"'));
});
