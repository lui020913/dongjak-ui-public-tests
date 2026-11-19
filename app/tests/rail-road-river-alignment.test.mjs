import test from 'node:test';
import assert from 'node:assert/strict';
import {CORRIDOR_GUIDES,VERIFIED_STATIONS,railGeojson,stationsGeojson} from '../src/fixed-rail-data.js';
import {fixedRailCollection} from '../src/fixed-rail-lines.js';
import {resolveOfficialLine,extractOfficialPaths,mergeOfficialRail,makeOfficialRailQueryUrl} from '../src/rail-official-shapes.js';

const same=(a,b,tol=1e-7)=>Math.abs(a[0]-b[0])<tol&&Math.abs(a[1]-b[1])<tol;
const line=code=>railGeojson.features.find(f=>f.properties.line===code).geometry.coordinates;

test('2·7호선은 직선 역 연결 대신 도로·하천 참고 굴곡점을 포함하고 기존 역 위치를 보존',()=>{
  const expected={
    '2':['구로디지털단지>신대방','신대방>신림'],
    '7':['신대방삼거리>장승배기','장승배기>상도']
  };
  for(const [code,sections] of Object.entries(expected)){
    const coords=line(code);
    for(const key of sections){
      for(const point of CORRIDOR_GUIDES[code][key])assert.ok(coords.some(c=>same(c,point)),`${code}/${key} 회랑점 ${point}`);
    }
    for(const pin of stationsGeojson.features.filter(s=>s.properties.line===code)){
      const station=pin.properties.name.replace(/역$/,'');
      const reference=station==='대림' && code==='2'?[126.89496,37.49328]
        :station==='대림' && code==='7'?[126.89628,37.49249]
        :VERIFIED_STATIONS[station];
      assert.ok(same(pin.geometry.coordinates,reference),`${code} ${station} 검증된 승강장 중심 좌표`);
      assert.ok(coords.some(c=>same(c,pin.geometry.coordinates)),`${code} ${station} 노선 통과`);
    }
  }
});

test('공식 GIS 조회는 호선별 LineString 경로를 읽고 신림선을 잘못 분류하지 않는다',()=>{
  for(const code of ['1','2','4','7','9'])assert.equal(resolveOfficialLine({sub_nm:`서울 지하철 ${code}호선`}),code);
  assert.equal(resolveOfficialLine({sub_nm:'신림선'}),null);
  assert.equal(resolveOfficialLine({sub_nm:'11호선'}),null);
  const official=line('7');
  const raw=extractOfficialPaths({features:[{attributes:{sub_nm:'7호선'},geometry:{paths:[official]}}]});
  assert.equal(raw.length,1);
  assert.equal(raw[0].line,'7');
  assert.ok(makeOfficialRailQueryUrl().includes('outSR=4326'));
});

test('확인된 공식 노선만 안내용 선형을 대체하고 다른 호선과 신림선은 그대로 유지한다',()=>{
  const official=line('7');
  const input=fixedRailCollection();
  const actual=extractOfficialPaths({features:[{attributes:{sub_nm:'7호선'},geometry:{paths:[official]}}]});
  const {collection,lines}=mergeOfficialRail(input,actual);
  assert.deepEqual(lines,['7']);
  const seven=collection.features.filter(f=>f.properties.line==='7호선');
  assert.ok(seven.length>0);
  assert.ok(seven.some(f=>f.properties.source==='MOIS_KR_Subway_2026'));
  for(const name of ['1호선','2호선','4호선','9호선','신림선']){
    assert.equal(collection.features.filter(f=>f.properties.line===name).length,
      input.features.filter(f=>f.properties.line===name).length);
  }
});

test('공식 GIS 응답이 비었거나 불완전할 경우 기존 노선은 사라지지 않는다',()=>{
  const input=fixedRailCollection();
  assert.equal(mergeOfficialRail(input,[]).collection.features.length,input.features.length);
  assert.equal(mergeOfficialRail(input,[{line:'7',coordinates:[[126.94,37.50],[126.941,37.501]]}]).lines.length,0);
  assert.throws(()=>extractOfficialPaths({error:{code:403,message:'Access denied'}}));
});
