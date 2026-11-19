import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {searchLocalPlaces,searchPlaces,normalizePlaceSearchResults} from '../src/route-search.js';
import {nightActivationBlocked} from '../src/night-visibility-map.js';
import {installAdaptiveMapPerformance} from '../src/v7122-map-performance.js';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
test('v7.13 search preserves venue & general places, not stations only',async()=>{
  assert.ok(searchLocalPlaces('중앙대').some(x=>x.name==='중앙대학교'));
  assert.ok(searchLocalPlaces('구청').some(x=>x.name==='동작구청'));
  assert.equal(searchLocalPlaces('').length,0);
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>{throw new Error('network unreachable')};
  try{assert.ok((await searchPlaces('숭실대')).some(x=>x.category));}
  finally{globalThis.fetch=oldFetch;}
  assert.deepEqual(normalizePlaceSearchResults({features:[]}),[]);
});
test('location pick, route preview and guidance block night activation',()=>{
  const active=new Set();const app={classList:{contains:k=>active.has(k)}};
  const doc={getElementById:()=>null};
  assert.equal(nightActivationBlocked(app,doc),false);
  for(const mode of ['route-picking','route-preview','route-guiding']){
    active.add(mode);assert.equal(nightActivationBlocked(app,doc),true);active.delete(mode);
  }
  assert.equal(nightActivationBlocked(app,{getElementById:id=>id==='route-transit-confirm'?{hidden:false,getClientRects:()=>[{}]}:null}),true);
});
test('adaptive PC 3D budget is attached to live building palette and restores previous visibility',()=>{
  const source=read('src/map-appearance.js');
  assert.match(source,/installAdaptiveMapPerformance\(\{map,app\}\)/);
  const events=new Map(),visibility=new Map([['dongjak-buildings-3d-main','visible'],['road-label','visible']]);
  const map={on:(name,fn)=>events.set(name,fn),off:()=>{},getPitch:()=>42,getStyle:()=>({layers:[{id:'dongjak-buildings-3d-main'},{id:'road-label'}]}),getLayer:id=>visibility.has(id),getLayoutProperty:id=>visibility.get(id),setLayoutProperty:(id,key,value)=>visibility.set(id,value)};
  let now=0;const app={dataset:{}};
  const stop=installAdaptiveMapPerformance({map,app,matchMedia:()=>({matches:true}),now:()=>now});
  events.get('dragstart')();
  for(const t of [20,60,100,140]){now=t;events.get('render')();}
  assert.equal(visibility.get('dongjak-buildings-3d-main'),'none');
  assert.equal(visibility.get('road-label'),'visible');
  events.get('moveend')();
  assert.equal(visibility.get('dongjak-buildings-3d-main'),'visible');
  stop();
});
test('search logo hidden only inside search; desktop/mobile standalone icon preserved',()=>{
  const html=read('index.html'),css=read('src/v7131-motion-search-hotfix.css');
  assert.match(html,/class="brand"/);
  assert.match(css,/\.map-quick-search-form > \.brand\{display:none!important/);
  assert.match(html,/href="\/src\/v7130-ux\.css"/);
  assert.match(html,/href="\/src\/v7131-motion-search-hotfix\.css"/);
  assert.match(read('src/v7120-settings.js'),/id='dj-settings-mobile'/);
});
test('window animations bind visible panels and preserve reduce-motion accessibility',()=>{
  const css=read('src/v7131-motion-search-hotfix.css');
  assert.match(css,/#route-panel/);
  assert.match(css,/#transport-sheet/);
  assert.match(css,/#map-advanced-controls/);
  assert.match(css,/#dj-map-settings/);
  assert.match(css,/#version-history-modal/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/dj-reduced-animation/);
  assert.match(css,/animation:dj-7131-panel-enter/);
});
