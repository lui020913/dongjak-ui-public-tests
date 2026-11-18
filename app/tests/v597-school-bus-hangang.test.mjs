import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HANGANG_BRIDGE_NAMES,parseBridgeWays,installHangangBridgeLabels} from '../src/hangang-bridge-labels.js';
import {busCoverageSamples} from '../src/bus-coverage-grid.js';
const read=(rel)=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');

test('school labels use a building SVG pictogram rather than a generic text badge',()=>{
  const js=read('src/education-layer.js');
  assert.match(js,/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
  assert.match(js,/dongjak-school-pictogram/);
  assert.match(js,/place\.kind!=='university'/);
  assert.match(js,/universityLogo/);
});

test('official bus coverage uses more than a 3x3 viewport sample grid',()=>{
  const map={getZoom:()=>16,getCenter:()=>({lat:37.50}),getCanvas:()=>({clientWidth:930,clientHeight:710}),
    unproject:([x,y])=>({lng:126.90+x*.00003,lat:37.48+y*.00003})};
  const samples=busCoverageSamples(map);
  assert.ok(samples.length>25,`got ${samples.length} cells`);
  assert.equal(new Set(samples.map(x=>x.key)).size,samples.length);
  assert.ok(samples[0].priority<=samples.at(-1).priority);
});

test('bridge label set covers Wonhyo to Banpo and never invents features',()=>{
  assert.deepEqual(HANGANG_BRIDGE_NAMES,['원효대교','한강철교','한강대교','동작대교','반포대교']);
  assert.deepEqual(parseBridgeWays([]),[]);
  const features=parseBridgeWays([
    {tags:{name:'한강대교'},center:{lon:126.96,lat:37.52}},
    {tags:{name:'한강대교'},center:{lon:126.961,lat:37.521}},
    {tags:{name:'기타대교'},center:{lon:126.95,lat:37.52}}
  ]);
  assert.equal(features.length,1);
  assert.equal(features[0].properties.name,'한강대교');
  assert.equal(features[0].geometry.type,'Point');
});

test('bridge labels have bundled verified coordinates when OSM fetch is blocked',async()=>{
  const added=[];let captured=null;
  const map={
    getStyle:()=>({layers:[{id:'roadnames',source:'vectortiles','source-layer':'transportation_name'}]}),
    getSource:id=>id==='vectortiles'?{}:id==='dj-hangang-bridges-osm' && added.some(x=>x.id===id)?{setData:x=>{captured=x;}}:null,
    addSource:(id,source)=>added.push({source,id}),
    getLayer:id=>added.find(x=>x.id===id&&x.type==='symbol'),
    addLayer:layer=>added.push(layer)
  };
  const cleanup=installHangangBridgeLabels(map,{fetchImpl:async()=>({ok:false,status:503})});
  assert.ok(added.some(x=>x.id==='dj-hangang-bridges-osm' && x.source.data.features.length===5));
  assert.ok(added.some(x=>x.id==='dj-hangang-bridge-osm-labels'));
  assert.equal(captured,null);
  cleanup();
});

test('Nodeulseom label survives detail zoom and bus uses a single pictogram sprite',()=>{
  assert.match(read('src/nearby-place-labels.js'),/dj-nodeulseom-detail-name/);
  assert.match(read('src/transport-map.js'),/dj-bus-blue-marker/);
  assert.match(read('src/transport-map.js'),/dj-transport-bus-pictogram/);
  assert.match(read('src/transport-map.js'),/drainOfficialBusQueue/);
});
