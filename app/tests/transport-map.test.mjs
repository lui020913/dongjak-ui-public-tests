import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOSMTransport,baseMapTransitPlace} from '../src/transport-map.js';
test('OSM 버스 정류소 이름과 ARS 및 태그 노선을 정규화',()=>{
 const out=normalizeOSMTransport([{type:'node',id:42,lat:37.5,lon:126.95,tags:{highway:'bus_stop',name:'테스트 정류소',ref:'12345',route_ref:'152;5517'}}]);
 assert.equal(out.length,1);
 assert.equal(out[0].arsId,'12345');
 assert.deepEqual(out[0].lines,['152','5517']);
});
test('OSM 지하철의 빈 호선에는 알려진 환승 호선 보완 및 경계 필터',()=>{
 const out=normalizeOSMTransport([
  {type:'node',id:100,lat:37.5,lon:126.95,tags:{railway:'station',name:'노량진역',ref:'101'}},
  {type:'node',id:101,lat:37.7,lon:127.1,tags:{highway:'bus_stop',name:'외부'}},
 ],(lng,lat)=>lat<37.6);
 assert.equal(out.length,1);
 assert.deepEqual(out[0].lines,['1호선','9호선']);
});

// 공개 OpenFreeMap Bright style: source-layer=poi, id=poi_transit, class bus / rail.
test('실제 배경지도 poi_transit 버스 아이콘 탭 대상 탐지',()=>{
 const f={id:55,layer:{id:'poi_transit','source-layer':'poi',type:'symbol'},
   properties:{class:'bus',subclass:'bus_stop','name:latin':'Sangdodong Central',
     'name:nonlatin':'상도동중앙하이츠.상도전통시장'},
   geometry:{type:'Point',coordinates:[126.95,37.50]}};
 const place=baseMapTransitPlace(f,{lng:126.951,lat:37.501});
 assert.equal(place?.kind,'bus');
 assert.equal(place?.name,'상도동중앙하이츠.상도전통시장');
 assert.equal(place?.lng,126.95);
});
test('실제 배경지도 poi_transit 철도역 호선 보완 및 잘못된 POI 차단',()=>{
 const make=(cls,name)=>({id:12,layer:{id:'poi_transit','source-layer':'poi',type:'symbol'},
   properties:{class:cls,name},geometry:{type:'Point',coordinates:[126.943,37.515]}});
 assert.deepEqual(baseMapTransitPlace(make('rail','노량진역')).lines,['1호선','9호선']);
 assert.equal(baseMapTransitPlace(make('airport','김포공항')),null);
 assert.equal(baseMapTransitPlace({layer:{id:'poi_transit','source-layer':'water'},
   properties:{class:'bus'},geometry:{type:'Point',coordinates:[126.95,37.5]}}),null);
});
test('배경 지도 정류장 이름 미등록이어도 상세 패널 대상 유지',()=>{
 const place=baseMapTransitPlace({layer:{id:'poi_transit','source-layer':'poi'},properties:{class:'bus'}},
   {lng:126.953,lat:37.5});
 assert.equal(place?.kind,'bus');
 assert.match(place.name,/미등록/);
});
