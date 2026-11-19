import test from 'node:test';
import assert from 'node:assert/strict';
import { VERIFIED_STATIONS, FIXED_RAIL_STATION_ORDER, railGeojson, stationsGeojson } from '../src/fixed-rail-data.js';

const meterDistance = (a,b)=>Math.hypot((a[0]-b[0])*88340,(a[1]-b[1])*111320);
const stations = (line)=>stationsGeojson.features.filter(f=>f.properties.line===line && f.properties.name==='대림역');
const lineGeometry=(line)=>railGeojson.features.find(f=>f.properties.line===line).geometry.coordinates;

test('대림역은 2·7호선 환승역으로 하나의 대표 중심점을 갖는다',()=>{
  assert.deepEqual(VERIFIED_STATIONS['대림'],[126.89562,37.492885]);
  assert.equal(FIXED_RAIL_STATION_ORDER['7'][0],'대림');
  assert.equal(stations('2').length,1);
  assert.equal(stations('7').length,1);
  assert.ok(meterDistance(stations('2')[0].geometry.coordinates,VERIFIED_STATIONS['대림'])<85);
  assert.ok(meterDistance(stations('7')[0].geometry.coordinates,VERIFIED_STATIONS['대림'])<85);
});

test('2호선과 7호선 노선은 각기 다른 대림역 승강장 중심을 지난다',()=>{
  for (const line of ['2','7']) {
    const xy=stations(line)[0].geometry.coordinates;
    assert.ok(lineGeometry(line).some(p=>meterDistance(p,xy)<1),`${line}호선 선형 미통과`);
  }
  assert.ok(meterDistance(stations('2')[0].geometry.coordinates,stations('7')[0].geometry.coordinates)>100);
});
