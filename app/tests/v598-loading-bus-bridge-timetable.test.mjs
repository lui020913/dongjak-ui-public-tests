import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HANGANG_BRIDGE_REFERENCES,bridgeReferenceCollection} from '../src/hangang-bridge-labels.js';
import {suppressNativeBusStopGlyphs} from '../src/transport-map.js';
import {createMapStartupLoader} from '../src/map-startup-loader.js';
import {fetchSeoulJsonOverTcp} from '../server/seoul-openapi-tcp.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('five georeferenced bridge labels display without Overpass',()=>{
  const collection=bridgeReferenceCollection();
  assert.equal(collection.features.length,5);
  assert.deepEqual(HANGANG_BRIDGE_REFERENCES.map(x=>x.name),
    ['원효대교','한강철교','한강대교','동작대교','반포대교']);
  assert.ok(collection.features.every(f=>f.geometry.coordinates[0]>126.91 && f.geometry.coordinates[0]<127.01));
});

test('native basemap bus symbol suppression never alters rail or non-POI layers',()=>{
  const touched=[];
  const map={getStyle:()=>({layers:[
    {id:'poi_transit',type:'symbol','source-layer':'poi'},
    {id:'major_rail',type:'line','source-layer':'transportation'},
    {id:'custom-stop',type:'symbol',source:'transport-bus'}
  ]}),getPaintProperty:()=>1,setPaintProperty:(id,prop,value)=>touched.push({id,prop,value})};
  assert.equal(suppressNativeBusStopGlyphs(map),1);
  assert.equal(touched.length,2);
  assert.ok(touched.every(x=>x.id==='poi_transit'));
  assert.deepEqual(touched.map(x=>x.prop),['icon-opacity','text-opacity']);
  assert.match(read('src/transport-map.js'),/id:'dj-transport-bus-pictogram'/);
  assert.match(read('src/transport-map.js'),/'circle-opacity':0/);
});

test('startup overlay is dismissed after map and boundary, without blocking on transit API',()=>{
  const elements=new Map(), progress=new Map(), timers=new Map();
  let now=0,seq=0,idleListener=null;
  const schedule=(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:now+ms});return id;};
  const tick=ms=>{const end=now+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next||next[1].at>end)break;timers.delete(next[0]);now=next[1].at;next[1].fn(now);}now=end;};
  const overlay={hidden:false,states:new Set(),style:{setProperty(k,v){progress.set(k,Number(v));}},classList:{add(x){overlay.states.add(x);}},setAttribute(){}};
  elements.set('map-startup-overlay',overlay);
  elements.set('map-startup-message',{textContent:''});
  elements.set('map-startup-note',{textContent:''});
  elements.set('map-startup-continue',{hidden:true,addEventListener(){},removeEventListener(){}});
  const documentRef={getElementById:id=>elements.get(id),defaultView:{setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:id=>timers.delete(id),matchMedia:()=>({matches:false})}};
  const loader=createMapStartupLoader({documentRef,map:{on(n,fn){idleListener=fn;},off(n,fn){if(idleListener===fn)idleListener=null;},areTilesLoaded:()=>true},timeoutMs:15000});
  loader.baseReady();
  assert.equal(overlay.states.has('is-hidden'),false);
  loader.boundaryReady();
  assert.equal(overlay.states.has('is-hidden'),false);
  tick(32);
  assert.equal(progress.get('--start-progress'),1);
  tick(419);
  assert.equal(overlay.states.has('is-hidden'),false);
  tick(1);
  assert.equal(overlay.states.has('is-hidden'),true);
  loader.transportReady();
  tick(350);
  assert.equal(overlay.hidden,true);
  assert.equal(idleListener,null);
  assert.equal(timers.size,0);
});

test('Cloudflare TCP fallback does not close writable half before reading response',async()=>{
  const value={SearchSTNTimeTableByIDService:{row:[{STATION_NM:'노량진'}]}};
  const body=JSON.stringify(value);
  const raw=new TextEncoder().encode(`HTTP/1.1 200 OK\r\nContent-Length: ${new TextEncoder().encode(body).length}\r\n\r\n${body}`);
  let closeWriterCalled=false,writeCalled=false,closed=false;
  const connectFactory=()=>({
    writable:{getWriter:()=>({write:async()=>{writeCalled=true;},close:async()=>{closeWriterCalled=true;},releaseLock(){}})},
    readable:{getReader:()=>{let once=false;return {read:async()=>{if(once)return {done:true};once=true;return {done:false,value:raw};},releaseLock(){}};}},
    close:async()=>{closed=true;}
  });
  const result=await fetchSeoulJsonOverTcp({key:'TESTKEY_ABCDEFG',service:'SearchSTNTimeTableByIDService',
    parts:[5,'0309',1,1],connectFactory,timeoutMs:1000});
  assert.deepEqual(result,value);
  assert.equal(writeCalled,true);
  assert.equal(closeWriterCalled,false);
  assert.equal(closed,true);
});

test('timetable distinguishes upstream connection failure from no scheduled trains',async()=>{
  const {fetchStationTimetables}=await import('../server/metro-timetable-common.mjs');
  const result=await fetchStationTimetables({station:'노량진',line:'9호선',day:'1',
    fetchJSON:async()=>{throw new Error('upstream not reachable');}});
  assert.equal(result.status,'error');
  assert.match(result.notice,/연결에 실패/);
});
