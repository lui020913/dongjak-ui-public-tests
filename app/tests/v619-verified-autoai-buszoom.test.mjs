import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placeData} from '../src/place-details.js';
import {verifiedPlaceRecord} from '../src/verified-place-directory.js';
import {facilityPurpose,onRequestPost} from '../functions/api/place-insight.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('verified public facility has a real address and official homepage (not a fabricated coordinate address)',()=>{
  const lib=placeData({name:'동작도서관',type:'공공기관',lng:126.94,lat:37.5});
  assert.match(lib.address,/장승배기로 94/);
  assert.match(lib.website,/djlib\.sen\.go\.kr/);
  const post=verifiedPlaceRecord('상도동우체국');
  assert.match(post.address,/상도로 236/);
  assert.match(post.website,/koreapost\.go\.kr/);
});

test('unverified place never gets a guessed address or link',()=>{
  const unknown=placeData({name:'이름이 확인되지 않은 장소',type:'공공기관',lat:37.5,lng:126.95,address:'동작구 대표 장소'});
  assert.equal(unknown.address,'');assert.equal(unknown.website,'');
});

test('place popup triggers AI on opening and retains retry button only for failures',()=>{
  const code=read('src/place-details.js');
  assert.match(code,/void loadExplanation\(\)/);
  assert.match(code,/retry\.hidden=true/);
  assert.match(code,/retry\.hidden=false/);
  assert.doesNotMatch(code,/ai\.addEventListener\('click'/);
});

test('AI receives no coordinates and knows the typical purpose of an institution',async()=>{
  let req;
  const request=new Request('https://dongjak.example/api/place-insight',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({name:'상도동우체국',type:'공공기관',lat:37.50111,lng:126.95111})});
  const r=await onRequestPost({request,env:{AI:{run:async(_,input)=>{req=input;return {response:'우편물 접수와 발송 관련 업무를 이용하는 시설입니다.'};}}}});
  assert.equal(r.status,200);
  assert.doesNotMatch(req.messages[1].content,/37\.50111|126\.95111|latitude|longitude/);
  assert.match(req.messages[1].content,/우편물 접수/);
  assert.match(facilityPurpose('동작도서관','공공기관'),/도서/);
});

test('AI answers that only narrate GPS are replaced with clearly bounded facility guidance',async()=>{
  const request=new Request('https://dongjak.example/api/place-insight',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({name:'상도동우체국',type:'공공기관',lat:37.50111,lng:126.95111})});
  const response=await onRequestPost({request,env:{AI:{run:async()=>({response:'상도동우체국은 위도 37.50111, 경도 126.95111에 있습니다.'})}}});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.templateFallback,true);
  assert.match(body.text,/우편/);
  assert.doesNotMatch(body.text,/위도|경도|37\.50111/);
});

test('at max zoom native fallback pictogram stays visible and OSM viewport replenishment is wired',()=>{
  const map=read('src/transport-map.js');
  assert.match(map,/function fillHighZoomOSMBusStops\(/);
  assert.match(map,/void fillHighZoomOSMBusStops\(\)/);
  assert.match(map,/osm-viewport-/);
  assert.match(map,/'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding'/);
  const fallback=map.slice(map.indexOf('export function installBasemapBusStopFallback'),map.indexOf('const BUS_NAME_FILTERS'));
  assert.match(fallback,/'text-allow-overlap':true,'text-ignore-placement':true,'text-optional':true/);
  const filters=map.slice(map.indexOf('function syncNearbyBusStopNameFilters'),map.indexOf('function labelVisibility'));
  assert.doesNotMatch(filters,/circlePolygonAround|radius|\['within'/);
  assert.match(filters,/const next=base;/);
});
