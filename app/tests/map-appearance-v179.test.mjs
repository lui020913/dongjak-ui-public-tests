import test from 'node:test';
import assert from 'node:assert/strict';
import {isVegetationLayer} from '../src/map-appearance.js';
import {roadColorRole} from '../src/ui-environment.js';
import {makeSchematicRailConnections} from '../src/transport-map.js';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
test('초록 녹지 폴리곤만 잔디 텍스처 대상으로 판단',()=>{
  assert.equal(isVegetationLayer({type:'fill',id:'landuse_park'}),true);
  assert.equal(isVegetationLayer({type:'fill',id:'wood'}),true);
  assert.equal(isVegetationLayer({type:'fill',id:'park-outline'}),false);
  assert.equal(isVegetationLayer({type:'line',id:'park'}),false);
  assert.equal(isVegetationLayer({type:'fill',id:'water'}),false);
});
test('도로 중심부 흰색으로 구분하며 철도와 산책로는 보호',()=>{
  assert.equal(roadColorRole({type:'line',id:'highway_primary'}),'surface');
  assert.equal(roadColorRole({type:'line',id:'highway_primary_casing'}),'edge');
  assert.equal(roadColorRole({type:'line',id:'transport-rail-base'}),null);
  assert.equal(roadColorRole({type:'line',id:'walking-route-line'}),null);
});
test('사용자 업데이트 창과 자동 업데이트 배너는 표시하지 않는다',async()=>{
  const [build,publicVersion,html,packageJson]=await Promise.all([
    readFile(new URL('../src/build-info.json',import.meta.url),'utf8'),
    readFile(new URL('../public/version.json',import.meta.url),'utf8'),
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8')]);
  assert.deepEqual(JSON.parse(build),JSON.parse(publicVersion));
  assert.doesNotMatch(html,/id="site-update-banner"/);
  assert.doesNotMatch(html,/id="version-history-trigger"/);
  assert.match(JSON.parse(packageJson).scripts.build,/stamp-version/);
});

test('실제 확인된 역 좌표를 사용해 개략 호선 연결선을 만들며 호선색을 유지',()=>{
  const result=makeSchematicRailConnections([
    {kind:'subway',name:'대방',lng:126.926,lat:37.513},
    {kind:'subway',name:'노량진',lng:126.941,lat:37.514},
    {kind:'subway',name:'흑석',lng:126.964,lat:37.509}
  ]);
  const line=result.features.find(feature=>feature.properties.line==='1호선');
  assert.ok(line);
  assert.equal(line.properties.schematic,true);
  assert.ok(line.geometry.coordinates.some(([lng,lat])=>lng===126.926&&lat===37.513));
});
