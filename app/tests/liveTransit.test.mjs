import test from 'node:test';
import assert from 'node:assert/strict';
import {haversineMeters,linePointAtMeters,projectOnLine,pointBetweenStations} from '../src/features/liveTransit/geometry.js';
import {busToFeatures,metroToFeatures,payloadToCollection} from '../src/features/liveTransit/normalize.js';
import {normalizeKST,parseBusResponse,parseMetroResponse,parseMetroArrivalPositions,decodeMetroPayload,selectBusRoutes,onRequestGet} from '../functions/api/transport/live-vehicles.js';
const NOW=Date.parse('2026-11-13T13:00:00.000Z');
const line={coordinates:[[126.95,37.51],[126.96,37.51],[126.97,37.52]]};
const routes={'9호선':{stations:[{name:'A',lngLat:[126.95,37.51]},{name:'B',lngLat:[126.96,37.51]},{name:'C',lngLat:[126.97,37.52]}],geometry:line,segmentTimeSeconds:100}};
const metro=(p={})=>({id:'metro:9:111:0',trainNo:'111',line:'9호선',station:'A',direction:'0',status:'2',observedAt:'2026-11-13T12:59:10.000Z',...p});

test('line length and line interpolation',()=>{
  assert(haversineMeters([126.95,37.51],[126.96,37.51])>800);
  const projected=projectOnLine(line.coordinates,[126.955,37.511]);
  assert(projected.errorMeters>0&&projected.errorMeters<150);
  const target=pointBetweenStations(line,[126.95,37.51],[126.96,37.51],.5);
  assert(Math.abs(target[0]-126.955)<.00001);
  assert.deepEqual(linePointAtMeters(line.coordinates,0),line.coordinates[0]);
});
test('metro departure interpolates on actual route, labeled estimate',()=>{
  const f=metroToFeatures([metro()],routes,NOW);
  assert.equal(f.length,1);
  assert(Math.abs(f[0].geometry.coordinates[0]-126.955)<.0001);
  assert.equal(f[0].properties.accuracy,'estimated');
});
test('unknown stations and geometry do not produce fake locations',()=>{
  assert.equal(metroToFeatures([metro({station:'unknown'})],routes,NOW).length,0);
  assert.equal(metroToFeatures([metro()],{},NOW).length,0);
  assert.equal(metroToFeatures([metro({observedAt:'2026-11-13T12:56:00.000Z'})],routes,NOW).length,0);
});
test('metro can map-match arrival station',()=>{
  const f=metroToFeatures([metro({status:'1',station:'B'})],routes,NOW);
  assert.equal(f.length,1);
  assert(Math.abs(f[0].geometry.coordinates[0]-126.96)<.00001);
});
test('bus accurate location and optional route map matching',()=>{
  const b={id:'bus:123',routeId:'R1',routeName:'B1',longitude:126.955,latitude:37.5101,observedAt:'2026-11-13T13:00:00.000Z'};
  const f=busToFeatures([b],{R1:{geometry:line}},NOW);
  assert.equal(f.length,1);assert.equal(f[0].properties.accuracy,'map-matched');
  assert.equal(busToFeatures([{...b,longitude:200}],{},NOW).length,0);
});
test('bounds filters correctly and duplicate vehicle IDs removed',()=>{
  const m=metro(); const col=payloadToCollection({metro:[m,m]}, {stationLines:routes,withinDistrict:p=>p[0]>126.94},NOW);
  assert.equal(col.features.length,1);
  assert.equal(payloadToCollection({metro:[m]}, {stationLines:routes,withinDistrict:()=>false},NOW).features.length,0);
});
test('Seoul metro response normalization and KST timezone',()=>{
  const result=parseMetroResponse({realtimePositionList:[{subwayNm:'9호선',trainNo:'101',statnNm:'노들',trainSttus:'2',updnLine:'0',recptnDt:'2026-11-13 21:59:30'}]},'9호선');
  assert.equal(result[0].id,'metro:9호선:101:0');
  assert.equal(result[0].observedAt,'2026-11-13T21:59:30+09:00');
  assert.equal(normalizeKST('20261113215930'),'2026-11-13T21:59:30+09:00');
});
test('Seoul bus XML parses original WGS84 GPS coordinates',()=>{
  const xml='<msgBody><itemList><gpsX>126.95001</gpsX><gpsY>37.51001</gpsY><vehId>777</vehId><plainNo>서울123</plainNo><dataTm>20261113215900</dataTm></itemList></msgBody>';
  const list=parseBusResponse(xml,'100100001');
  assert.equal(list[0].id,'bus:777');assert.equal(list[0].longitude,126.95001);
  assert.equal(list[0].observedAt,'2026-11-13T21:59:00+09:00');
});
test('endpoint fails safely when API keys are not configured',async()=>{
  const res=await onRequestGet({request:new Request('https://example.com/api/transport/live-vehicles'),env:{}});
  assert.equal(res.status,503);assert.equal((await res.json()).metro.length,0);
});

test('MapLibre overlay starts, renders data, toggles and destroys without touching other sources',async()=>{
  const {attachLiveTransitOverlay}=await import('../src/features/liveTransit/index.js');
  const map={
    sources:new Map(),layers:new Map(),listeners:new Map(),
    isStyleLoaded(){return true},
    getSource(n){return this.sources.get(n)},
    addSource(n,source){this.sources.set(n,{...source,setData(data){this.data=data}})},
    removeSource(n){this.sources.delete(n)},
    addLayer(layer){this.layers.set(layer.id,layer)},
    getLayer(n){return this.layers.get(n)},
    removeLayer(n){this.layers.delete(n)},
    on(n,fn){this.listeners.set(n,fn)},
    off(n){this.listeners.delete(n)},
    queryRenderedFeatures(){return []},
  };
  const overlay=attachLiveTransitOverlay(map,{stationLines:routes,renderIntervalMs:50,getVehicles:async()=>({metro:[metro({observedAt:new Date().toISOString()})],bus:[]})});
  overlay.start();await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(overlay.getStatus().vehicles,1);
  assert.equal(map.layers.size,2);
  overlay.setVisible('metro',false);
  assert.equal(map.getSource(overlay.sourceId).data.features.length,0);
  overlay.destroy();assert.equal(map.sources.size,0);assert.equal(map.layers.size,0);
});

test('existing v8.2.6 rail geometry is reused with route-specific station order',async()=>{
  const {buildDongjakMetroLines}=await import('../src/features/liveTransit/integrate.js');
  const lines=buildDongjakMetroLines();
  assert.deepEqual(Object.keys(lines).sort(),['1호선','2호선','4호선','7호선','9호선']);
  assert(lines['7호선'].geometry.coordinates.length>20);
  assert.equal(lines['7호선'].up.some(x=>x.name==='상도'),true);
  assert.equal(lines['4호선'].up[0].name,'남태령');
  assert(!lines['신림선']); // Seoul realtimePosition does not promise this line
});

test('same metro event keeps first observation; changed station resets motion',async()=>{
  const {preserveMetroEvents}=await import('../src/features/liveTransit/index.js');
  const old=[metro({eventAt:'2026-11-13T12:58:00Z'})];
  const next=preserveMetroEvents([metro({observedAt:'2026-11-13T12:59:50Z'})],old);
  assert.equal(next[0].eventAt,old[0].eventAt);
  const shifted=preserveMetroEvents([metro({station:'B',observedAt:'2026-11-13T12:59:50Z'})],old);
  assert.equal(shifted[0].eventAt,'2026-11-13T12:59:50Z');
});

test('bus route auto-discovery selects verified repeated routes without inventing IDs',()=>{
  const chosen=selectBusRoutes([
    [{id:'100100001',name:'A'},{id:'100100002',name:'B'}],
    [{id:'100100001',name:'A'},{id:'100100003',name:'C'}]
  ],2);
  assert.deepEqual(chosen.map(x=>x.id),['100100001','100100002']);
  assert.equal(selectBusRoutes([[{id:'imaginary',name:'not real'}]],2).length,0);
});

test('API mode metro does not invoke bus upstream even if a bus key is configured',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async url=>{
    calls.push(String(url));
    return new Response(JSON.stringify({realtimePositionList:[{subwayNm:'7호선',trainNo:'77',statnNm:'상도',
      trainSttus:'2',updnLine:'0',recptnDt:'2026-11-13 22:00:00'}]}),{status:200});
  };
  try{
    const response=await onRequestGet({request:new Request('https://example.org/api/transport/live-vehicles?modes=metro'),env:{SEOUL_SUBWAY_API_KEY:'PRIVATEKEY',SEOUL_BUS_SERVICE_KEY:'PRIVATEBUS'}});
    const payload=await response.json();
    assert.equal(response.status,200);
    assert.equal(payload.bus.length,0);
    assert(payload.metro.length>0);
    assert.equal(calls.length,5);
    assert(calls.every(x=>x.includes('/realtimePosition/')&&!x.includes('PRIVATEBUS')));
    assert(!JSON.stringify(payload).includes('PRIVATEKEY'));
  }finally{globalThis.fetch=original;}
});

test('API mode bus parses real provider coordinates and does not call metro',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async url=>{
    calls.push(String(url));
    return new Response('<msgBody><itemList><vehId>3</vehId><plainNo>서울70사1234</plainNo><gpsX>126.9499</gpsX><gpsY>37.5029</gpsY><dataTm>20261113215959</dataTm></itemList></msgBody>',{status:200});
  };
  try{
    const response=await onRequestGet({request:new Request('https://example.org/api/transport/live-vehicles?modes=bus'),env:{SEOUL_BUS_SERVICE_KEY:'SECRET',LIVE_TRANSIT_BUS_ROUTE_IDS:'100100389'}});
    const payload=await response.json();
    assert.equal(response.status,200);
    assert.equal(payload.bus[0].longitude,126.9499);
    assert.equal(payload.metro.length,0);
    assert.equal(calls.length,2); // Mock XML requires the safe JSON-to-XML fallback
    assert(calls.every(x=>x.includes('getBusPosByRtid')));
    assert(!JSON.stringify(payload).includes('SECRET'));
  }finally{globalThis.fetch=original;}
});

test('bus coordinates with absent provider timestamp retain separate receipt provenance',()=>{const now=new Date('2026-11-13T13:00:00Z');const rows=parseBusResponse({msgBody:{item:{vehId:'900',gpsX:'126.95',gpsY:'37.51'}}},'100100001',now);assert.equal(rows.length,1);assert.equal(rows[0].observedAt,'');assert.equal(rows[0].receivedAt,now.toISOString());});

test('real arrival fallback keeps only verified station events and source times',()=>{const now=new Date('2026-11-13T13:00:00Z');const r={subwayId:'1007',statnNm:'상도',btrainNo:'77',updnLine:'상행',arvlCd:'1',recptnDt:'2026-11-13 21:59:30'};const list=parseMetroArrivalPositions({realtimeArrivalList:[r,{...r,btrainNo:'78',arvlCd:'99'},{...r,btrainNo:'79',recptnDt:'2026-11-13 21:50:00'}]},['7호선'],now);assert.equal(list.length,1);assert.equal(list[0].positionSource,'arrival');assert.equal(list[0].station,'상도');assert.equal(list[0].status,'1');});
test('position failure reports official errorMessage and uses real arrival fallback',async()=>{const original=globalThis.fetch;globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('realtimePosition')?{errorMessage:{code:'INFO-100'}}:{realtimeArrivalList:[{subwayId:'1007',statnNm:'상도',btrainNo:'77',updnLine:'상행',arvlCd:'1',recptnDt:new Date().toISOString()}]}));try{const res=await onRequestGet({request:new Request('https://example.org/api/transport/live-vehicles?modes=metro'),env:{SEOUL_SUBWAY_API_KEY:'PRIVATEKEY'}});const data=await res.json();assert.equal(res.status,200);assert.equal(data.metroDiagnostics['7호선'].code,'PROVIDER_INFO-100');assert.equal(data.metro[0].positionSource,'arrival');assert(!JSON.stringify(data).includes('PRIVATEKEY'));}finally{globalThis.fetch=original;}});

test('official position XML and nested JSON row formats preserve the source date and direction',()=>{
 const row={trainNo:'77',statnNm:'상도',subwayNm:'7호선',lastRecptnDt:'20261113',recptnDt:'215930',trainSttus:'1',updnLine:'0'};
 const wrapped=decodeMetroPayload(JSON.stringify({realtimePosition:{RESULT:{CODE:'INFO-000'},row:[row]}}));
 assert.equal(wrapped.details.rawRows,1);assert.equal(parseMetroResponse(wrapped.body,'7호선')[0].observedAt,'2026-11-13T21:59:30+09:00');
 const xml='<realtimePosition><RESULT><CODE>INFO-000</CODE></RESULT><row>'+Object.entries(row).map(([k,v])=>'<'+k+'>'+v+'</'+k+'>').join('')+'</row></realtimePosition>';
 const decoded=decodeMetroPayload(xml);assert.equal(decoded.details.format,'xml');assert.equal(parseMetroResponse(decoded.body,'7호선')[0].station,'상도');
 assert.throws(()=>decodeMetroPayload('{"errorMessage":{"code":"INFO-100"}}'),/PROVIDER_INFO-100/);
 assert.throws(()=>decodeMetroPayload('{"unrelated":"x"}'),/METRO_FEED_UNAVAILABLE/);
});
test('position endpoint recovers official XML when JSON has no supported row container',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return new Response(String(url).includes('/xml/')?'<realtimePosition><RESULT><CODE>INFO-000</CODE></RESULT><row><trainNo>77</trainNo><statnNm>상도</statnNm><recptnDt>'+new Date().toISOString()+'</recptnDt><trainSttus>1</trainSttus></row></realtimePosition>':'{"RESULT":{"CODE":"INFO-000"}}');};
 try{const res=await onRequestGet({request:new Request('https://example.org/api/transport/live-vehicles?modes=metro'),env:{SEOUL_SUBWAY_API_KEY:'PRIVATEKEY',LIVE_TRANSIT_METRO_LINES:'7호선'}});const data=await res.json();assert.equal(res.status,200);assert.equal(calls.length,2);assert.equal(data.metroDiagnostics['7호선'].format,'xml');assert.equal(data.metro.length,1);}finally{globalThis.fetch=original;}
});
