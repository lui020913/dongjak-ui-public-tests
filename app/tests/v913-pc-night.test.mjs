import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNightPoiIsolation,conflictsWithNight,nightOwnsLayerOrder} from '../src/v913-night-poi-isolation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('night hides ordinary labels only and restores previous category visibility; repeat reconciliation does not write',()=>{
 const layers=[{id:'dj-civic-poi-hospital',type:'symbol'},{id:'dj-seoul-official-points',type:'symbol'},{id:'dj-night-occ-clear',type:'line'},{id:'dj-bus-stop-label',type:'symbol'},{id:'dj-safety-symbols',type:'symbol'}];
 const state=new Map([['dj-seoul-official-points','none']]),writes=[],handlers={};
 const map={getStyle:()=>({layers}),getLayer:id=>layers.find(l=>l.id===id),getLayoutProperty:id=>state.get(id)||'visible',setLayoutProperty:(id,key,v)=>{state.set(id,v);writes.push([id,v]);},on:(e,f)=>handlers[e]=f};
 assert.equal(conflictsWithNight(layers[2]),false);assert.equal(conflictsWithNight(layers[3]),false);assert.equal(conflictsWithNight(layers[4]),false);
 const isolate=createNightPoiIsolation(map);isolate.set(true);assert.equal(nightOwnsLayerOrder(map),true);assert.deepEqual(writes,[['dj-civic-poi-hospital','none']]);isolate.reconcile();assert.equal(writes.length,1);
 layers.push({id:'native-poi',type:'symbol','source-layer':'poi'});handlers.idle();assert.equal(state.get('native-poi'),'none');isolate.set(false);assert.equal(nightOwnsLayerOrder(map),false);
 assert.equal(state.get('dj-civic-poi-hospital'),'visible');assert.equal(state.get('dj-seoul-official-points'),'none');assert.equal(state.get('native-poi'),'visible');
});
test('night mode remains available without a PC-only design system',()=>{
 const main=read('src/main.js');
 const css=read('src/mobile-first-layout.css');
 assert.doesNotMatch(main,/v913-pc-design-system\\.css/);
 assert.match(main,/import '\\.\\/mobile-first-layout\\.css'/);
 assert.match(css,/#app#app#app#app#app\\[data-theme="dark"\\]/);
 assert.match(read('src/night-visibility-map.js'),/poiIsolation\\.set\\(false\\)/);
});
test('three competing layer promoters defer to night analysis ownership',()=>{for(const f of ['src/readable-3d-labels.js','src/hangang-bridge-labels.js','src/featured-place-labels.js'])assert.match(read(f),/nightOwnsLayerOrder\(map\)/);assert.equal(conflictsWithNight({id:'dongjak-featured-place-names',type:'symbol'}),true);});

test('night isolation continues when a late style layer disappears',()=>{
 const layers=[{id:'dj-civic-poi-hospital',type:'symbol'},{id:'dj-civic-poi-school',type:'symbol'}],state=new Map();let fail=true;
 const map={getStyle:()=>({layers}),getLayer:id=>layers.find(l=>l.id===id),getLayoutProperty:id=>state.get(id)||'visible',setLayoutProperty:(id,key,value)=>{if(id===layers[0].id&&fail)throw Error('layer replaced');state.set(id,value);},on:()=>{}};
 const isolate=createNightPoiIsolation(map);assert.doesNotThrow(()=>isolate.set(true));assert.equal(state.get(layers[1].id),'none');fail=false;isolate.reconcile();assert.equal(state.get(layers[0].id),'none');isolate.set(false);assert.equal(state.get(layers[0].id),'visible');
});
test('night enables controls only after map handlers are bound and onboarding settles after startup',()=>{
 const html=read('index.html'),night=read('src/night-visibility-map.js'),tour=read('src/v860-onboarding.js');assert.match(html,/id="night-visibility-quick-off"[^>]*disabled/);assert.match(night,/app\.dataset\.djNightReady='true'/);assert.match(night,/toggle\.disabled=false;quickOff\.disabled=false/);assert.match(tour,/app\.dataset\.dj860AutoResolved='true'/);
});
