import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBusRoutePath,busRoutePathUrl,decodeBusRouteResponse,fetchBusRouteGeometry,parseBusRouteStops,decodeBusRouteStops,fetchBusRouteStops} from '../server/bus-route-path.mjs';
import {parseSeoulBusArrival} from '../src/transport-data.js';
import {createBusRouteOverlay,BUS_ROUTE_SOURCE,BUS_ROUTE_STOPS,BUS_ROUTE_STOP_NAMES,routeVehicleFeatures,BUS_ROUTE_LINE_WIDTH} from '../src/bus-route-overlay.js';
const id='100100112';
const row=(no,gpsX,gpsY)=>({busRouteId:id,no,gpsX,gpsY});
const body=rows=>({msgBody:{itemList:rows}});
test('official sequence preserves road shape and rejects missing sections or wrong route',()=>{
  assert.deepEqual(parseBusRoutePath(body([row(2,126.91,37.51),row(1,126.9,37.5)]),id),[[126.9,37.5],[126.91,37.51]]);
  assert.deepEqual(parseBusRoutePath(body([row(1,126.9,37.5),row(3,126.91,37.51)]),id),[]);
  assert.deepEqual(parseBusRoutePath(body([row(1,126.9,37.5),row(2,126.91,37.51)]),'100100113'),[]);
  assert.equal(new URL(busRoutePathUrl('a+b',id)).searchParams.get('ServiceKey'),'a+b');
  assert.equal(parseSeoulBusArrival(body([{busRouteId:id,rtNm:'150',routeType:3}]))[0].routeId,id);
});
test('route selection persists until explicit clear, rejects stale response and restores shape after style reload',async()=>{
  const sources=new Map(),layers=new Map(),events=new Map();let result;
  const map={getSource:k=>sources.get(k),addSource:(k,v)=>sources.set(k,{setData:d=>{result=d;}}),getLayer:k=>layers.get(k),addLayer:v=>layers.set(v.id,v),on:(k,v)=>events.set(k,v),off:k=>events.delete(k)};
  let resolve;
  const overlay=createBusRouteOverlay({map,apiBase:'/api/transport',fetcher:()=>new Promise(r=>{resolve=r;})});
  const pending=overlay.select({routeId:id,route:'150',routeType:3});
  overlay.clear();
  resolve({ok:true,json:async()=>({routeId:id,coordinates:[[126.9,37.5],[126.91,37.51]]})});
  await pending;assert.equal(overlay.getActive(),null);assert.equal(result,undefined);
  await overlay.select({routeId:id,route:'150',routeType:3});
  assert.equal(result.features.length,1);
  sources.clear();layers.clear();events.get('style.load')();
  assert.ok(sources.has(BUS_ROUTE_SOURCE));
  await overlay.select({routeId:id,route:'150',routeType:3});
  assert.equal(result.features.length,1);assert.equal(overlay.getActive().id,id);overlay.clear();assert.equal(result.features.length,0);overlay.destroy();
});

test('official PathList and XML decode while auth and rate-limit errors stay distinct',async()=>{
 const rows=[row(1,126.9,37.5),row(2,126.91,37.51)],coordinates=[[126.9,37.5],[126.91,37.51]];
 assert.deepEqual(decodeBusRouteResponse(JSON.stringify({MsgBody:{PathList:rows}}),id),{coordinates});
 assert.deepEqual(decodeBusRouteResponse(JSON.stringify({msgBody:{pathList:{itemList:rows}}}),id),{coordinates});
 const xml='<ServiceResult><msgHeader><headerCd>0</headerCd></msgHeader><msgBody>'+rows.map(p=>'<itemList><no>'+p.no+'</no><gpsX>'+p.gpsX+'</gpsX><gpsY>'+p.gpsY+'</gpsY></itemList>').join('')+'</msgBody></ServiceResult>';
 assert.deepEqual(decodeBusRouteResponse(xml,id),{coordinates});
 assert.deepEqual(decodeBusRouteResponse('<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>20</returnReasonCode><returnAuthMsg>SERVICE_ACCESS_DENIED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>',id),{code:'ROUTE_PATH_AUTH'});
 assert.deepEqual(decodeBusRouteResponse(JSON.stringify({msgHeader:{headerCd:8}}),id),{code:'ROUTE_PATH_UNAVAILABLE'});
 assert.deepEqual(decodeBusRouteResponse(JSON.stringify({cmmMsgHeader:{returnReasonCode:'22'}}),id),{code:'ROUTE_PATH_RATE_LIMIT'});
 assert.deepEqual(await fetchBusRouteGeometry('test-key',id,{fetcher:async()=>({ok:true,text:async()=>xml})}),{coordinates});
});

 test('2023 Seoul route guide pp. 10–12 and 22: example path and header codes',()=>{
 const rows=[{no:1,gpsX:126.909074,gpsY:37.582225,posX:191969.68329141868,posY:453638.95118162734},{no:2,gpsX:126.909116,gpsY:37.582202,posX:191973.39013920765,posY:453636.395127221}];
 const example={ServiceResult:{msgHeader:{headerCd:0,itemCount:0},msgBody:{itemList:rows}}};
 assert.deepEqual(decodeBusRouteResponse(JSON.stringify(example),id),{coordinates:[[126.909074,37.582225],[126.909116,37.582202]]});
 for(const [headerCd,code] of [[1,'ROUTE_PATH_UPSTREAM'],[2,'ROUTE_PATH_FORMAT'],[3,'ROUTE_PATH_UNAVAILABLE'],[4,'ROUTE_PATH_UNAVAILABLE'],[5,'ROUTE_PATH_FORMAT'],[6,'ROUTE_PATH_UPSTREAM'],[7,'ROUTE_PATH_UNAVAILABLE'],[8,'ROUTE_PATH_UNAVAILABLE']])assert.deepEqual(decodeBusRouteResponse(JSON.stringify({msgHeader:{headerCd}}),id),{code});
 });

test('official stop coordinates and names only; zoom-gated map layers survive theme changes',async()=>{
 const stops=[{busRouteId:id,seq:2,stationNm:'정류소 B',gpsX:'126.91',gpsY:'37.51',arsId:'12345'},{busRouteId:id,seq:1,stationNm:'정류소 A',gpsX:126.9,gpsY:37.5,arsId:'12344'},{busRouteId:'other',seq:3,stationNm:'다른 노선',gpsX:126.9,gpsY:37.5}];
 const official=parseBusRouteStops(body(stops),id);assert.deepEqual(official.map(s=>s.name),['정류소 A','정류소 B']);
 assert.deepEqual(decodeBusRouteStops(JSON.stringify(body(stops)),id),official);
 assert.deepEqual(await fetchBusRouteStops('key',id,{fetcher:async url=>{assert.ok(url.includes('/getStaionByRoute?'));return {ok:true,text:async()=>JSON.stringify(body(stops))}}}),official);
 const layers=new Map(),sources=new Map(),events=new Map();let data;
 const map={getLayer:k=>layers.get(k),getSource:k=>sources.get(k),addSource:(k,v)=>sources.set(k,{setData:d=>{data=d}}),addLayer:l=>layers.set(l.id,l),on:(k,v)=>events.set(k,v),off:()=>{}};
 const overlay=createBusRouteOverlay({map,apiBase:'/api/transport',fetcher:async()=>({ok:true,json:async()=>({routeId:id,coordinates:[[126.9,37.5],[126.91,37.51]],stops:official})})});
 await overlay.select({routeId:id,route:'150',routeType:3});
 assert.equal(data.features.filter(f=>f.geometry.type==='Point').length,2);assert.equal(layers.get(BUS_ROUTE_STOPS).minzoom,14.5);assert.equal(layers.get(BUS_ROUTE_STOP_NAMES).minzoom,16);
 sources.clear();layers.clear();events.get('style.load')();assert.equal(data.features.length,3);overlay.clear();assert.equal(data.features.length,0);
});

test('selected route live positions reject stale or different routes and do not fabricate a heading',()=>{const now=Date.now(),at=new Date(now).toISOString(),rows=[{id:'bus:1',routeId:id,longitude:126.9,latitude:37.5,observedAt:at},{id:'bus:2',routeId:'100100113',longitude:126.9,latitude:37.5,observedAt:at},{id:'bus:3',routeId:id,longitude:126.9,latitude:37.5,observedAt:new Date(now-200000).toISOString()}];const previous=new Map();const collection=routeVehicleFeatures(rows,id,'150','#3566c1',previous,now);assert.equal(collection.features.length,1);assert.deepEqual(collection.features[0].geometry.coordinates,[126.9,37.5]);assert.equal(collection.features[0].properties.headingKnown,false);assert.deepEqual(BUS_ROUTE_LINE_WIDTH.slice(0,3),['interpolate',['linear'],['zoom']]);});
