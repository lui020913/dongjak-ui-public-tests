import test from 'node:test';
import assert from 'node:assert/strict';
import {METRO_PLATFORM_SPLIT_ZOOM,metroMarkerVisibleAtZoom,metroLineMarkerPlacements,arrivalsForSelectedMetroLine} from '../src/transport-map.js';
import {stationsGeojson, railGeojson} from '../src/fixed-rail-data.js';

function distancePointToSegment(p,a,b){
  const lat=(p[1]+a[1]+b[1])*Math.PI/540;
  const sx=111320*Math.cos(lat), sy=111320;
  const ax=(a[0]-p[0])*sx, ay=(a[1]-p[1])*sy;
  const bx=(b[0]-p[0])*sx, by=(b[1]-p[1])*sy;
  const dx=bx-ax, dy=by-ay;
  const t=Math.max(0,Math.min(1,(-ax*dx-ay*dy)/((dx*dx+dy*dy)||1)));
  return Math.hypot(ax+t*dx,ay+t*dy);
}
function distancePointToLine(point,lineCoords){
  let best=Infinity;
  for(let i=1;i<lineCoords.length;i++)best=Math.min(best,distancePointToSegment(point,lineCoords[i-1],lineCoords[i]));
  return best;
}

test('역 분리 시작 확대 수준과 동작역 4/9 지리적 분리',()=>{
  assert.equal(METRO_PLATFORM_SPLIT_ZOOM,15.55);
  const marks=metroLineMarkerPlacements('동작',['4호선','9호선'],126.978153,37.502878);
  assert.equal(marks.length,2);
  const fourth=marks.find(x=>x.line==='4호선');
  const ninth=marks.find(x=>x.line==='9호선');
  assert.ok(fourth.lng>ninth.lng,'동작역 4호선은 동쪽, 9호선은 서쪽');
  assert.ok(fourth.lng-ninth.lng>0.002,'두 호선별 마커는 실제 출입구 영역에 나뉘어야 함');
  for(const mark of marks){
    const code=mark.line.replace('호선','');
    const metro=stationsGeojson.features.find(f=>f.properties.name==='동작역'&&f.properties.line===code);
    assert.deepEqual([mark.lng,mark.lat],metro.geometry.coordinates);
    const rail=railGeojson.features.find(f=>f.properties.line===code);
    assert.ok(rail.geometry.coordinates.some(x=>x[0]===mark.lng&&x[1]===mark.lat),'노선도 해당 역을 통과');
  }
});

test('대림역 2/7호선은 각 승강장 좌표로 분리',()=>{
  const points=metroLineMarkerPlacements('대림역',['2호선','7호선'],126.89562,37.492885);
  assert.equal(points.length,2);
  assert.notDeepEqual([points[0].lng,points[0].lat],[points[1].lng,points[1].lat]);
  assert.deepEqual(points.map(x=>x.screenOffset),[[0,0],[0,0]]);
});

test('동일 좌표에서 환승하는 역은 각 노선 위에서만 소폭 분리한다',()=>{
  const points=metroLineMarkerPlacements('노량진',['1호선','9호선'],126.941005,37.513534);
  assert.equal(points.length,2);
  assert.notDeepEqual([points[0].lng,points[0].lat],[points[1].lng,points[1].lat]);
  for(const point of points){
    const code=point.line.replace('호선','').replace('신림선','신림');
    const rail=railGeojson.features.find(f=>f.properties.line===code);
    assert.ok(distancePointToLine([point.lng,point.lat],rail.geometry.coordinates)<1.0,'분리된 아이콘도 노선 위에 남아야 함');
  }
  assert.deepEqual(points.map(x=>x.screenOffset),[[0,0],[0,0]]);
});

test('이수·총신대입구역은 두 승강장 기준점이며 이름 하나로 관리',()=>{
  const points=metroLineMarkerPlacements('이수(총신대입구)', ['4호선','7호선'],126.9818,37.4856);
  assert.equal(points.length,2);
  assert.notDeepEqual([points[0].lng,points[0].lat],[points[1].lng,points[1].lat]);
});

test('호선 마커를 누른 경우 해당 호선의 실시간 도착만 출력',()=>{
  const items=[{line:'4호선',message:'4호선 도착'}, {line:'9호선',message:'9호선 도착'}];
  assert.deepEqual(arrivalsForSelectedMetroLine({kind:'subway',selectedLine:'4호선'},items),[items[0]]);
  assert.deepEqual(arrivalsForSelectedMetroLine({kind:'subway'},items),items);
});

test('멀리서는 통합 배지, 15.55배율부터 노선별 개별 배지를 표시',()=>{
  assert.equal(metroMarkerVisibleAtZoom('summary',true,12),false);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,12),false);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,13.04),true);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,15.55),false);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,15.55),true);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,15.5),true);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,15.5),false);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,10.8),false);
  assert.equal(metroMarkerVisibleAtZoom('detail',true,10.8),false);
  assert.equal(metroMarkerVisibleAtZoom('summary',true,10.1),false);
});
