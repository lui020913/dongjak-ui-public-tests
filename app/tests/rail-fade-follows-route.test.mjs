import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FADE_GUIDE_STATIONS,
  FIXED_RAIL_STATION_ORDER,
  VERIFIED_STATIONS,
  railGeojson,
  stationsGeojson
} from '../src/fixed-rail-data.js';
import {fixedRailCollection} from '../src/fixed-rail-lines.js';

const route=code=>railGeojson.features.find(f=>f.properties.line===code).geometry.coordinates;
const near=(p,q,eps=1e-6)=>Math.abs(p[0]-q[0])<eps&&Math.abs(p[1]-q[1])<eps;

function distanceMeters(a,b){
  const rad=(a[1]+b[1])*Math.PI/360;
  return Math.hypot((a[0]-b[0])*111320*Math.cos(rad),(a[1]-b[1])*111320);
}

function distancePointFromChord(p,a,b){
  const lat=p[1]*Math.PI/180;
  const m=111320*Math.cos(lat);
  const ax=(a[0]-p[0])*m,ay=(a[1]-p[1])*111320;
  const bx=(b[0]-p[0])*m,by=(b[1]-p[1])*111320;
  const t=Math.max(0,Math.min(1,-(ax*(bx-ax)+ay*(by-ay))/((bx-ax)**2+(by-ay)**2||1)));
  return Math.hypot(ax+t*(bx-ax),ay+t*(by-ay));
}

test('외곽 페이드 구간은 실제 다음 역을 방향점으로 사용하고 직선 외삽을 사용하지 않는다',()=>{
  const required={
    '1':{before:[126.89108,37.50896],after:[126.97130,37.54102]},
    '4':{before:[126.97260,37.53408],after:[127.00230,37.45167]},
    '9':{before:[126.91787,37.52810],after:[127.00492,37.50489]}
  };
  for(const [code,{before,after}] of Object.entries(required)){
    const coordinates=route(code);
    assert.ok(coordinates.some(p=>near(p,before)),`${code}: 이전 역 안내 좌표 누락`);
    assert.ok(coordinates.some(p=>near(p,after)),`${code}: 다음 역 안내 좌표 누락`);
  }
  const line4=route('4');
  const sino=[126.96789,37.52917];
  const sam=[126.97260,37.53408];
  const ich=VERIFIED_STATIONS['이촌'];
  assert.ok(line4.some(p=>near(p,sino)),'4호선 이촌역 이후 신용산역 실제 방향으로 연결');
  assert.ok(distancePointFromChord(sino,sam,ich)>100,'4호선 페이드는 단순 직선이 아닌 굴곡을 따라야 함');
});

test('페이드 가이드 역은 지도 역 마커 목록에 중복 추가하지 않는다',()=>{
  const markerNames=new Set(stationsGeojson.features.map(f=>f.properties.name.replace(/역$/,'')));
  for(const guides of Object.values(FADE_GUIDE_STATIONS)){
    for(const name of [...guides.before,...guides.after]){
      if(Object.values(FIXED_RAIL_STATION_ORDER).some(order=>order.includes(name)))continue;
      assert.ok(!markerNames.has(name),`${name} 가이드 역은 새 마커로 표시하지 않는다`);
    }
  }
});

test('마지막 표시 역까지 불투명하고 그 이후 같은 노선 곡선을 따라 천천히 사라진다',()=>{
  const geo=fixedRailCollection();
  for(const code of ['1','4','9']){
    const lineName=`${code}호선`;
    const coordinates=route(code);
    const last=VERIFIED_STATIONS[FIXED_RAIL_STATION_ORDER[code].at(-1)];
    const idx=coordinates.findIndex(p=>near(p,last));
    assert.ok(idx>=0);
    assert.ok(coordinates.length>idx+3);
    const segments=geo.features.filter(f=>f.properties.line===lineName);
    // 같은 LineString의 연결 좌표만 사용: 독립 직선 페이드 피처를 추가하지 않는다.
    const srcSet=new Set(coordinates.map(p=>p.map(n=>n.toFixed(6)).join(',')));
    assert.ok(segments.every(f=>f.geometry.coordinates.every(p=>{
      // 40m 샘플링 보간점은 원본 선형의 선분 위에 있어야 함.
      return coordinates.some((a,i)=>i>0&&distancePointFromChord(p,coordinates[i-1],a)<1);
    })));
    const fadeAlphas=segments.filter(f=>f.properties.opacity<0.8&&f.properties.opacity>0.03).map(f=>f.properties.opacity);
    assert.ok(fadeAlphas.length>5,`${code}: 자연스럽게 변하는 페이드 샘플 필요`);
  }
});
