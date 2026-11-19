import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySafetyTags,safetyFeatures,makeBridgeDeckFeatures} from '../src/safety-layers.js';
import {fetchCurrentWeather} from '../src/ui-environment.js';

test('경찰/소방/병원/AED만 안전시설로 분류하며 미용실은 제외',()=>{
  assert.equal(classifySafetyTags({amenity:'police'}),'police');
  assert.equal(classifySafetyTags({amenity:'fire_station'}),'fire_station');
  assert.equal(classifySafetyTags({emergency:'defibrillator'}),'defibrillator');
  assert.equal(classifySafetyTags({shop:'hairdresser'}),null);
});

test('안전시설과 횡단보도는 동작구 내부 공간정보만 표시',()=>{
  const inside=(lng,lat)=>lng<127&&lat<37.51;
  const elements=[
    {type:'node',id:1,lat:37.50,lon:126.95,tags:{amenity:'hospital',name:'테스트 병원'}},
    {type:'node',id:2,lat:37.50,lon:127.01,tags:{amenity:'police'}},
    {type:'node',id:3,lat:37.50,lon:126.95,tags:{highway:'crossing'}},
    {type:'node',id:4,lat:37.50,lon:126.95,tags:{shop:'hairdresser'}}
  ];
  const places=safetyFeatures(elements,inside,'safety');
  assert.equal(places.features.length,1);
  assert.equal(places.features[0].properties.name,'테스트 병원');
  const crossings=safetyFeatures(elements,inside,'crossing');
  assert.equal(crossings.features.length,1);
  assert.equal(crossings.features[0].properties.crossing_signal,'신호 여부 미확인');
});

test('교량 입체 상판은 제공된 OSM way 위치만 사용하고 다른 지역은 그리지 않음',()=>{
  const data=makeBridgeDeckFeatures([
    {type:'way',id:12,tags:{name:'한강대교'},geometry:[{lon:126.95,lat:37.50},{lon:126.95,lat:37.5001}]},
    {type:'way',id:13,tags:{name:'기타 교량'},geometry:[{lon:127.2,lat:37.50},{lon:127.2001,lat:37.501}]}
  ],(lng)=>lng<127.0);
  assert.equal(data.features.length,1);
  assert.equal(data.features[0].geometry.coordinates[0].length,5);
});

test('날씨 조회는 API 값을 전달하고 측정하지 않은 날씨를 만들지 않음',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({current:{temperature_2m:13.2,apparent_temperature:12.0,weather_code:3,precipitation:0,wind_speed_10m:1.1,time:'2026-11-05T00:00'}})});
  try{
    const current=await fetchCurrentWeather({latitude:37.5,longitude:126.95});
    assert.equal(current.temperature,13.2);
    assert.equal(current.weather,'흐림');
  } finally {globalThis.fetch=previous;}
});
