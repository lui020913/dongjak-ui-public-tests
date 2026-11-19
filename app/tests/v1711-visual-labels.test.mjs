import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {koreanNameOnly,koreanOSMName,preferKoreanBaseMapLabels} from '../src/korean-labels.js';
import {lightMapLandRole} from '../src/ui-environment.js';
import {safetyFeatures} from '../src/safety-layers.js';
import {normalizeOSMTransport,makeSchematicRailConnections} from '../src/transport-map.js';

test('영문+한글 이중 시설명은 한국어 부분만 남기고 영문 전용은 기본 이름으로 대체',()=>{
  assert.equal(koreanNameOnly('Sangdo Middle School 사당중학교'),'사당중학교');
  assert.equal(koreanNameOnly('Sangdo Middle School'), '');
  assert.equal(koreanOSMName({name:'Seoul hospital', 'name:ko':'서울병원'}),'서울병원');
  assert.equal(koreanOSMName({name:'Redwood Pharmacy'},'약국'),'약국');
});

test('영문-only 버스정류장은 로마자 이름을 표시하지 않음',()=>{
  const rows=normalizeOSMTransport([
    {type:'node',id:3,lon:126.951,lat:37.499,tags:{highway:'bus_stop',name:'Sangdo Market'}},
    {type:'node',id:4,lon:126.951,lat:37.499,tags:{highway:'bus_stop',name:'Sangdo Market', 'name:ko':'상도시장'}}
  ]);
  assert.equal(rows[0].name,'이름 미등록');
  assert.equal(rows[1].name,'상도시장');
});

test('병원 등 시설명은 공개 지도 속성에 한글이 있을 때만 표시',()=>{
  const result=safetyFeatures([
    {type:'node',id:1,lon:126.95,lat:37.5,tags:{amenity:'hospital',name:'Chung-Ang University Hospital', 'name:ko':'중앙대학교병원'}},
    {type:'node',id:2,lon:126.96,lat:37.5,tags:{amenity:'hospital',name:'English Medical Center'}}
  ],()=>true,'safety');
  assert.deepEqual(result.features.map(f=>f.properties.name),['중앙대학교병원','병원']);
});

test('배경지도 시설 텍스트는 한국어 이름 필드만 사용하고 지하철 지도 형식은 유지',()=>{
  const changed=[];
  const map={getStyle:()=>({layers:[
    {type:'symbol',id:'poi_label', 'source-layer':'poi'},
    {type:'symbol',id:'poi_transit', 'source-layer':'poi'},
    {type:'symbol',id:'water_label', 'source-layer':'water_name'}
  ]}), setLayoutProperty:(id,key,v)=>changed.push([id,key,v])};
  assert.equal(preferKoreanBaseMapLabels(map),3);
  assert.equal(changed.length,3);
  assert.ok(changed.every(([id,key,val])=> key==='text-field' && val[0]==='case' && ['poi_label','poi_transit','water_label'].includes(id)));
});

test('흰 도로와 지면/녹지 배경 분류는 별도 유지',()=>{
  assert.equal(lightMapLandRole({type:'background',id:'background'}),'ground');
  assert.equal(lightMapLandRole({type:'fill',id:'landuse_residential'}),'ground');
  assert.equal(lightMapLandRole({type:'fill',id:'park'}),'vegetation');
  assert.equal(lightMapLandRole({type:'fill',id:'woodland'}),'vegetation');
  assert.equal(lightMapLandRole({type:'fill',id:'water'}),null);
  assert.equal(lightMapLandRole({type:'fill',id:'road_primary'}),null);
});

test('지하철 노선도는 호선별 실선으로 표시하고 경계 내 연결을 유지',async()=>{
  const source=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(source,/id:'transport-schematic-subway'/);
  const layer=source.match(/id:'transport-schematic-subway'[\s\S]*?\},firstLabel\);/);
  assert.ok(layer);
  assert.doesNotMatch(layer[0],/line-dasharray/);
  const items=[
    {kind:'subway',name:'장승배기',lng:126.939,lat:37.504},
    {kind:'subway',name:'상도',lng:126.947,lat:37.502},
    {kind:'subway',name:'숭실대입구',lng:126.953,lat:37.497}
  ];
  const line=makeSchematicRailConnections(items).features.find(x=>x.properties.line==='7호선');
  assert.ok(line);
  assert.ok(line.geometry.coordinates.length>=3);
  for (const point of items.map(x=>[x.lng,x.lat])) assert.ok(line.geometry.coordinates.some(c=>c[0]===point[0]&&c[1]===point[1]));
});

test('병원은 전체 지도에서도 보이고 축척바는 하단 패널과 다른 위치에 배치',async()=>{
  const [facilities,css]=await Promise.all([
    readFile(new URL('../src/safety-layers.js',import.meta.url),'utf8'),
    readFile(new URL('../src/style.css',import.meta.url),'utf8')
  ]);
  assert.match(facilities,/id:'safety-hospital-overview'/);
  assert.match(facilities,/source:'dongjak-safety-places',minzoom:10\.5,maxzoom:12\.4/);
  assert.match(facilities,/queueMicrotask\(\(\)=>safetyButton\.click\(\)\)/);
  assert.match(css,/top:clamp\(255px,46dvh,490px\)!important/);
  assert.match(css,/bottom:auto!important/);
});
