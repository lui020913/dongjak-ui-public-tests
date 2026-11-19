import test from 'node:test';
import assert from 'node:assert/strict';
import {bufferedDistrictBounds,MAP_OUTER_BUFFER_METERS} from '../src/map-scope.js';
import {GREEN_PALETTE} from '../src/map-appearance.js';
import {railGeojson,VERIFIED_STATIONS,FIXED_RAIL_STATION_ORDER,stationsGeojson} from '../src/fixed-rail-data.js';
import {fixedRailCollection} from '../src/fixed-rail-lines.js';
import {isMedianBusStopName,medianStopBaseName,normalizeMedianBusStops,busStopDisplayName} from '../src/median-bus-stops.js';

const polygon={type:'Polygon',coordinates:[[
  [126.92,37.49],[126.98,37.49],[126.98,37.515],[126.92,37.515],[126.92,37.49]
]]};

test('동작구 경계 기준 각 방향 7km 외곽의 카메라 제한 사각 범위를 산출한다',()=>{
  const b=bufferedDistrictBounds(polygon);
  assert.equal(MAP_OUTER_BUFFER_METERS,7000);
  const metersAtLat=111320;
  assert.ok(Math.abs((37.49-b[0][1])*metersAtLat-7000)<0.01);
  assert.ok(Math.abs((b[1][1]-37.515)*metersAtLat-7000)<0.01);
  assert.ok(b[0][0]>126.83 && b[0][0]<126.85);
  assert.ok(b[1][0]>127.05 && b[1][0]<127.07);
  assert.throws(()=>bufferedDistrictBounds(null));
});

test('산림색을 공원색보다 조금만 짙게 조정한다',()=>{
  assert.equal(GREEN_PALETTE.light.park,'#a5ca92');
  assert.equal(GREEN_PALETTE.light.forest,'#92bd86');
});

test('전체 고정 노선은 각 외곽 마지막 실제 역을 통과하며 이후 구간에서만 페이드한다',()=>{
  const geo=fixedRailCollection(polygon);
  for(const [code,stationNames] of Object.entries(FIXED_RAIL_STATION_ORDER)){
    const src=railGeojson.features.find(f=>f.properties.line===code);
    const coords=src.geometry.coordinates;
    const anchor=name=>stationsGeojson.features.find(x=>x.properties.line===code && x.properties.name===`${name}역`)?.geometry.coordinates || VERIFIED_STATIONS[name];
    const first=anchor(stationNames[0]),last=anchor(stationNames.at(-1));
    for(const point of [first,last]) assert.ok(coords.some(p=>p[0]===point[0]&&p[1]===point[1]),`${code} last station missing`);
    const segs=geo.features.filter(f=>f.properties.line===(code==='신림'?'신림선':`${code}호선`));
    assert.ok(segs.length>15,`${code} line missing`);
    const near=point=>segs.filter(f=>f.geometry.coordinates.some(p=>Math.hypot(p[0]-point[0],p[1]-point[1])<0.00015));
    assert.ok(near(first).some(f=>f.properties.opacity>.90),`${code} start station should be solid`);
    assert.ok(near(last).some(f=>f.properties.opacity>.90),`${code} final outside station should be solid`);
    if(code!=='신림' && code!=='7')assert.ok(segs.some(f=>f.properties.opacity<.30),`${code} should fade only after the edge stations`);
    if(code==='7')assert.ok(segs.every(f=>f.properties.opacity>=.96),'7호선은 동작구 구간에서 페이드되지 않고 선명하게 유지');
  }
});

test('서울시 ARS 실측 좌표에 따라 같은 (중) 정류소 양방향을 두 점으로 분리한다',()=>{
  assert.equal(isMedianBusStopName('노량진역(중)'),true);
  assert.equal(isMedianBusStopName('노량진역'),false);
  assert.equal(medianStopBaseName('노량진역(중)'),medianStopBaseName('노량진역'));
  const sample={msgBody:{itemList:[
    {arsId:'10101',stNm:'노량진역(중)',gpsX:'126.941000',gpsY:'37.513000',adirection:'영등포'},
    {arsId:'10102',stNm:'노량진역(중)',gpsX:'126.941180',gpsY:'37.513040',adirection:'노들'},
    {arsId:'10103',stNm:'노량진역',gpsX:'126.943',gpsY:'37.513'},
    {arsId:'10102',stNm:'노량진역(중)',gpsX:'126.941180',gpsY:'37.513040'},
  ]}};
  const result=normalizeMedianBusStops(sample,{name:'노량진역(중)',lng:126.94108,lat:37.51301});
  assert.equal(result.length,2);
  assert.deepEqual(result.map(x=>x.arsId),['10101','10102']);
  assert.deepEqual(result.map(x=>x.lng),[126.941,126.94118]);
  assert.match(busStopDisplayName(result[0]),/영등포 방면/);
  assert.match(busStopDisplayName({...result[0],direction:''}),/ARS 10101/);
});

test('공식 위치가 하나뿐이거나 키가 없으면 맞은편 정류소 좌표를 만들어내지 않는다',()=>{
  const result=normalizeMedianBusStops({msgBody:{itemList:[
    {arsId:'10201',stNm:'보라매역(중)',gpsX:126.92,gpsY:37.4999},
    {arsId:'10202',stNm:'보라매역(중)',gpsX:126.92,gpsY:37.4999},
    {arsId:'garbage',stNm:'보라매역(중)',gpsX:126.92,gpsY:37.49985}
  ]}},{name:'보라매역(중)',lng:126.92,lat:37.4999});
  assert.equal(result.length,1);
  assert.deepEqual(normalizeMedianBusStops({}, {name:'보라매역(중)',lat:37.5,lng:126.92}),[]);
});
