import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {searchLocalPlaces,searchPlaces,normalizePlaceSearchResults} from '../src/route-search.js';
import {nightActivationBlocked} from '../src/night-visibility-map.js';
import {nextBuildingPitchMode,buildingModeVisibility} from '../src/building-coverage.js';
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
test('building palette has no competing PC visibility writer; pitch hysteresis owns 3D mode',()=>{
  const source=read('src/map-appearance.js');
  assert.doesNotMatch(source,/installAdaptiveMapPerformance/);
  const main=read('src/main.js');
  assert.doesNotMatch(main,/movementIsSlow|interactiveMoving|slowSamples/);
  assert.match(main,/buildingPitchActive && loadedBuildingTiles\.size>0/);
  let active=false;
  for(const pitch of [10,42,38,10,9,8]){
    active=nextBuildingPitchMode(active,pitch);
    assert.deepEqual(buildingModeVisibility(active),{plan:'none',extrusion:'visible'});
  }
  active=nextBuildingPitchMode(active,7);
  assert.deepEqual(buildingModeVisibility(active),{plan:'visible',extrusion:'none'});
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
