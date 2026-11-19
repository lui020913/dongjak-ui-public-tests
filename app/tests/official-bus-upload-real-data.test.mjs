import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialStaticBusPlaces,nearbyOfficialStaticStops} from '../src/static-bus-stops.js';
import {deduplicateBusStops} from '../src/bus-stop-dedup.js';

const data=JSON.parse(readFileSync(new URL('../public/data/transport/seoul-bus-stops.json',import.meta.url),'utf8'));
const sangdo=JSON.parse(readFileSync(new URL('../public/data/protection-zone/boundary_reference.geojson',import.meta.url),'utf8')).features[0].geometry;
function inRing(x,y,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
function inBoundary(x,y){
  return inRing(x,y,sangdo.coordinates[0])&&!sangdo.coordinates.slice(1).some(r=>inRing(x,y,r));
}
test('uploaded September official dataset is actually included and has authentic unique locations',()=>{
  assert.equal(data.source,'서울시 버스정류소 위치정보');
  assert.equal(data.sourceDate,'2026-09-02');
  assert.equal(data.realtime,false);
  assert.equal(data.stops.length,11236);
  assert.equal(new Set(data.stops.map(s=>s.arsId)).size,11236);
  assert.ok(data.stops.every(s=>/^\d{5}$/.test(s.arsId)&&s.name&&Number.isFinite(s.lng)&&Number.isFinite(s.lat)));
  assert.equal(officialStaticBusPlaces(data).length,11236);
});
test('Sangdo 1 official stops remain inside confirmed neighborhood polygon and opposite-side ARS IDs are distinct',()=>{
  const neighborhood=officialStaticBusPlaces(data,inBoundary);
  assert.equal(neighborhood.length,41);
  const ars=new Map(neighborhood.map(s=>[s.arsId,s]));
  assert.equal(ars.get('20160')?.name,'상도역');
  assert.equal(ars.get('20161')?.name,'상도역');
  assert.equal(deduplicateBusStops(neighborhood).length,neighborhood.length);
  assert.ok(neighborhood.every(s=>inBoundary(s.lng,s.lat)));
  const nearby=nearbyOfficialStaticStops(data,37.5016271,126.9486225,18);
  assert.ok(nearby.some(s=>s.arsId==='20160'));
  assert.ok(nearby.every(s=>s.source==='seoul-official-static-file'&&!('arrival' in s)));
});

test('the published Cloudflare static fallback returns real uploaded stop names when upstream responds HTTP 401',async()=>{
  const {onRequestGet}=await import('../functions/api/transport/[[path]].js');
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{"error":"unauthorized"}',{status:401,headers:{'Content-Type':'application/json'}});
  try{
    const request=new Request('https://example.pages.dev/api/transport/bus/stops-nearby?lat=37.5016271&lng=126.9486225&radius=180');
    const env={SEOUL_BUS_SERVICE_KEY:'test-key',ASSETS:{fetch:async()=>new Response(JSON.stringify(data),{status:200})}};
    const response=await onRequestGet({request,env});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.realtimeAvailable,false);
    assert.equal(body.sourceDate,'2026-09-02');
    assert.ok(body.items.some(s=>s.arsId==='20160'&&s.name==='상도역'));
    assert.ok(body.items.every(s=>s.source==='seoul-official-static-file'));
  }finally{globalThis.fetch=original;}
});
