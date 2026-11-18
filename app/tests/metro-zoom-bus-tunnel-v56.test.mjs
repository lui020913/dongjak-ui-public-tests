import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSeoulBusStopsNearby} from '../src/transport-data.js';
import {installBasemapInfrastructureLabels} from '../src/map-infrastructure-labels.js';

test('도시 전체 축척에서는 환승역 아이콘을 작게 통합하고 기본 지도 축척부터 호선별로 분리한다',()=>{
  const geo=readFileSync(new URL('../src/metro-marker-geodata.js',import.meta.url),'utf8');
  const map=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(geo,/METRO_PLATFORM_SPLIT_ZOOM=15\.55/);
  assert.match(map,/dj-metro-summary-mobile-hubs-icon/);
  assert.match(map,/METRO_PLATFORM_SPLIT_ZOOM,0\.28,16\.3,0\.36,18,0\.44/);
});

test('서울시 정류소 좌표 API 응답에서 이름·ARS·좌표를 거리순으로 정규화한다',()=>{
  const rows={msgBody:{itemList:[
    {arsId:'20123',stNm:'노량진역',gpsX:'126.9411',gpsY:'37.5136'},
    {arsId:'20124',stNm:'노량진수산시장',gpsX:'126.9420',gpsY:'37.5137'},
    {arsId:'bad',stNm:'잘못된 번호',gpsX:'126.9411',gpsY:'37.5136'},
    {arsId:'20125',stNm:'범위 밖',gpsX:'127.1',gpsY:'37.7'}
  ]}};
  const result=parseSeoulBusStopsNearby(rows,37.5135,126.9410,130);
  assert.deepEqual(result.map(x=>x.arsId),['20123','20124']);
  assert.equal(result[0].name,'노량진역');
  assert.equal(result[0].kind,'bus');
  assert.ok(result[0].distanceMeters<30);
  assert.equal(result[0].source,'seoul-official-bus-stop');
});

test('배경지도에서 이름이 있는 버스정류장과 명칭이 있는 도로 터널을 표시할 레이어를 설치한다',()=>{
  const added=[];
  const layers=[
    {id:'poi_transit',type:'symbol',source:'openmaptiles','source-layer':'poi'},
    {id:'transportation-name',type:'symbol',source:'openmaptiles','source-layer':'transportation_name'}
  ];
  const map={
    getStyle:()=>({layers}),
    getSource:id=>id==='openmaptiles'?{}:null,
    getLayer:id=>added.find(layer=>layer.id===id),
    addLayer:layer=>added.push(layer)
  };
  const result=installBasemapInfrastructureLabels(map);
  assert.deepEqual(result,{busStops:true,tunnels:true});
  const bus=added.find(layer=>layer.id==='dj-basemap-bus-stop-names');
  assert.equal(bus['source-layer'],'poi');
  assert.equal(bus.minzoom,15);
  assert.match(JSON.stringify(bus.filter),/bus_stop/);
  const tunnel=added.find(layer=>layer.id==='dj-named-tunnel-underpass-labels');
  assert.equal(tunnel['source-layer'],'transportation_name');
  assert.match(JSON.stringify(tunnel.filter),/brunnel/);
  assert.match(JSON.stringify(tunnel.filter),/tunnel/);
  assert.match(JSON.stringify(tunnel.layout['text-field']),/name:nonlatin/);
});

test('교통 지도는 이름 없는 버스 POI를 공식 이름 조회 대상으로 보존한다',()=>{
  const transport=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  const pages=readFileSync(new URL('../functions/api/transport/[[path]].js',import.meta.url),'utf8');
  const proxy=readFileSync(new URL('../server/transport-proxy.mjs',import.meta.url),'utf8');
  assert.match(transport,/needsOfficialName=kind==='bus'&&!knownName/);
  assert.match(transport,/bus\/stops-nearby/);
  assert.match(transport,/enrichNearbyBusStops/);
  assert.match(pages,/route==='bus\/stops-nearby'/);
  assert.match(proxy,/\/api\/transport\/bus\/stops-nearby/);
});
