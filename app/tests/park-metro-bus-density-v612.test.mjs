import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parkPlaceFromFeature,installParkInfoClick} from '../src/park-info-click.js';
import {seoulSubwayIdForLine,permitsSubwayBulkRecovery,filterBulkArrivalsForStation} from '../src/subway-source-recovery.js';
import {installBasemapBusStopFallback} from '../src/transport-map.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('공원 이름만 실제 원천 정보로 안내하고 일반 녹지는 공원으로 추측하지 않음',()=>{
  const point={lng:126.952,lat:37.503};
  const park={properties:{class:'park','name:ko':'햇님어린이공원'}};
  assert.equal(parkPlaceFromFeature(park,point).name,'햇님어린이공원');
  assert.match(parkPlaceFromFeature(park,point).type,/어린이/);
  assert.equal(parkPlaceFromFeature({properties:{class:'park'}},point),null);
  assert.equal(parkPlaceFromFeature({properties:{class:'commercial',name:'상점'}},point),null);
  assert.equal(parkPlaceFromFeature(park,{lng:Infinity,lat:37.5}),null);
});

test('공원 클릭은 동작구 내 이름 확인 공원에만 반응하며 선택 위치를 전달',()=>{
  let handler,removed;
  const map={on(type,fn){if(type==='click')handler=fn;},off(type,fn){removed=[type,fn];},
    queryRenderedFeatures:()=>[{layer:{id:'dongjak-park-names'},properties:{class:'park',name:'샛별어린이공원'}}]};
  const dispose=installParkInfoClick({map,maplibregl:{Popup:class {}},isDongjak:()=>false});
  assert.equal(typeof handler,'function');
  handler({point:{x:10,y:10},lngLat:{lng:126.96,lat:37.5}});
  dispose();assert.deepEqual(removed,['click',handler]);
});

test('1호선과 신림선은 다른 호선 및 같은 이름 환승역과 정확히 구분',()=>{
  assert.equal(seoulSubwayIdForLine('1호선'),'1001');
  assert.equal(seoulSubwayIdForLine('신림선'),'1094');
  assert.ok(permitsSubwayBulkRecovery('노량진','1001'));
  assert.ok(permitsSubwayBulkRecovery('대방','1094'));
  assert.equal(permitsSubwayBulkRecovery('노량진','1094'),false);
  const body={realtimeArrivalList:[
    {statnNm:'대방',subwayId:'1001',recptnDt:'2026-11-10 12:10:00'},
    {statnNm:'대방',subwayId:'1094',recptnDt:'2026-11-10 12:10:00'},
    {statnNm:'보라매',subwayId:'1094',recptnDt:'2026-11-10 12:10:00'},
  ]};
  assert.deepEqual(filterBulkArrivalsForStation(body,'대방',{lineId:'1001'}).map(x=>x.subwayId),['1001']);
  assert.deepEqual(filterBulkArrivalsForStation(body,'대방',{lineId:'1094'}).map(x=>x.subwayId),['1094']);
});

test('버스 아이콘과 이름은 도로 상세 확대에서만 등장하고 최대 확대 상한 없음',()=>{
  const js=read('src/transport-map.js');
  const fallback=js.slice(js.indexOf('export function installBasemapBusStopFallback'),js.indexOf('const BUS_NAME_FILTERS'));
  assert.match(fallback,/minzoom:16\.4/);
  assert.match(fallback,/'text-field':\['step',\['zoom'\],'',17\.75/);
  assert.match(js,/source:'transport-bus',minzoom:16\.4/);
  assert.match(js,/source:'transport-bus',minzoom:17\.75/);
  assert.match(js,/source:'transport-bus',minzoom:18\.4/);
  assert.match(js,/'icon-size':\['interpolate',\['linear'\],\['zoom'\],16\.4,0\.262/);
  assert.doesNotMatch(fallback,/maxzoom:/);
});

test('지하철 Cloudflare 프록시는 환승역 호선 별 조회와 ALL 정확 매칭 후 생성시각 검사',()=>{
  const js=read('functions/api/transport/[[path]].js');
  assert.match(js,/requestedLineId/);
  assert.match(js,/filterBulkArrivalsForStation\(rawBody,id,\{lineId:requestedLineId/);
  assert.match(js,/realtimeStationArrival\/0\/100/);
  assert.match(js,/validateSeoulSubwayFeed\(body\)/);
});
