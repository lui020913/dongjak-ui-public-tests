import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {installReadableTypeOptions} from '../src/safety-workbench-v7103.js';
import {installDongjakOfficialDataLayers} from '../src/dongjak-verified-data-layers.js';

const dataRoot=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,dataRoot),'utf8');

test('seven source controls remain and typography settings are available in the safety drawer',()=>{
  const html=read('index.html');
  assert.match(html,/id="dj-type-settings"/);
  assert.match(html,/id="dj-type-scale"/);
  assert.match(html,/id="dj-type-weight"/);
  for(const name of ['accidents','survey-crosswalk','cctv-security','cctv-parking','cctv-other','slope','metro-elevator'])
    assert.ok(html.includes(`data-dj-import="${name}"`));
  assert.match(read('src/safety-workbench-entry-v7104.js'),/safety-polish-v7104\.css/);
  assert.match(read('src/safety-polish-v7104.css'),/dj-feature-state::before/);
  assert.match(read('src/safety-polish-v7104.css'),/width:51px!important/);
  assert.match(read('src/safety-polish-v7104.css'),/width:57px!important/);
});

test('text size and weight are applied to the existing root and persist locally',()=>{
  const original=globalThis.localStorage;
  const data=new Map();
  globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  const create=()=>({dataset:{},value:'normal',handlers:{},addEventListener(t,cb){this.handlers[t]=cb;}});
  const app={dataset:{}},scale=create(),weight=create();
  const root={getElementById: id=>({'app':app,'dj-type-scale':scale,'dj-type-weight':weight}[id]||null)};
  try{
    installReadableTypeOptions(root);
    assert.equal(app.dataset.djTypeScale,'normal');
    assert.equal(app.dataset.djTypeWeight,'normal');
    scale.value='xlarge';scale.handlers.change();
    weight.value='bold';weight.handlers.change();
    assert.equal(app.dataset.djTypeScale,'xlarge');
    assert.equal(app.dataset.djTypeWeight,'bold');
    assert.match(data.values().next().value,/"bold"/);
  }finally{
    if(original===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=original;
  }
});

test('lightweight slope render dataset keeps all original links and gradient attributes',()=>{
  const original=JSON.parse(read('public/data/safety/slope/dongjak_walk_links_with_slope.geojson'));
  const compact=JSON.parse(read('public/data/safety/slope/dongjak_walk_links_slope_visual.geojson'));
  assert.equal(compact.features.length,10232);
  assert.equal(original.features.length,compact.features.length);
  for(let i=0;i<original.features.length;i++){
    const a=original.features[i],b=compact.features[i];
    assert.deepEqual(b.geometry,a.geometry);
    for(const name of ['link_id','slope_mean_abs_pct','slope_quality'])
      assert.deepEqual(b.properties[name],a.properties[name]);
  }
  const a=statSync(new URL('public/data/safety/slope/dongjak_walk_links_with_slope.geojson',dataRoot)).size;
  const b=statSync(new URL('public/data/safety/slope/dongjak_walk_links_slope_visual.geojson',dataRoot)).size;
  assert.ok(b<a*.6);
});

test('point clusters render with the same pictogram as single points plus high-contrast count badge',async()=>{
  const previous={document:globalThis.document,Path2D:globalThis.Path2D,fetch:globalThis.fetch};
  let fetched=0;
  const elements=new Map(),sources=new Map(),layers=new Map(),images=new Map();
  const mockCtx={clearRect(){},beginPath(){},roundRect(){},fill(){},save(){},translate(){},scale(){},stroke(){},restore(){},getImageData(){return {data:new Uint8ClampedArray(64*64*4)}}};
  globalThis.document={
    createElement(){return {width:0,height:0,getContext(){return mockCtx}};},
    getElementById(){return null;},querySelectorAll(){return []}
  };
  globalThis.Path2D=class {constructor(path){this.path=path;}};
  globalThis.fetch=async()=>{fetched++;return {ok:true,async json(){return {type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[126.94,37.50]},properties:{}}]}}};};
  const map={getStyle(){return {};},getSource:id=>sources.get(id),addSource(id,s){sources.set(id,s)},
    getLayer:id=>layers.get(id),addLayer(layer){layers.set(layer.id,layer)},setLayoutProperty(){},
    hasImage:id=>images.has(id),addImage(id,img){images.set(id,img)},on(){},off(){}};
  const boundary={type:'Polygon',coordinates:[[[126.9,37.4],[127,37.4],[127,37.6],[126.9,37.6],[126.9,37.4]]]};
  try{
    const api=installDongjakOfficialDataLayers({map,getBoundary:()=>boundary});
    await api.setVisible('cctv-security',true);
    const name='dj-external-cctv-security';
    const single=layers.get(name),cluster=layers.get(name+'-cluster');
    assert.equal(single.type,'symbol');
    assert.equal(cluster.type,'symbol');
    assert.equal(cluster.layout['icon-image'],single.layout['icon-image']);
    assert.ok(layers.has(name+'-cluster-badge'));
    assert.ok(layers.has(name+'-cluster-label'));
    assert.equal(sources.get(name).clusterMaxZoom,17);
    assert.equal(fetched,1);
    await api.setVisible('cctv-security',false);
    await api.setVisible('cctv-security',true);
    assert.equal(fetched,1,'cached data should not refetch on subsequent toggles');
    api.dispose();
  }finally{
    for(const [key,v] of Object.entries(previous)){
      if(v===undefined)delete globalThis[key]; else globalThis[key]=v;
    }
  }
});
