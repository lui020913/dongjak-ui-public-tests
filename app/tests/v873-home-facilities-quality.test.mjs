import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileMapPixelBudget,responsiveMapPixelRatio} from '../src/map-scale-docking.js';
import {installSafetyHomeGuard} from '../src/safety-home-guard.js';
import {osmGeneralPlaces,bboxToOverpass,loadOsmGeneralFacilities,queryOfficialPlaces} from '../src/seoul-official-facilities.js';
import {validateFacilityBounds,facilityOverpassQuery,onRequestGet} from '../functions/api/osm-general-facilities.js';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('mobile home interception bypasses legacy tab handlers and closes picker',()=>{
 const listeners=new Map(),styles=new Map();
 const picker={hidden:false,classList:{remove(){}},style:{removeProperty(){} }};
 const overview={hidden:false};
 const home={};const app={dataset:{tab:'route',djActiveSheet:'admin-dong-picker'},classList:{remove(){}}};
 const doc={querySelector(s){return s.includes('.nav-tab[data-tab="map"]')?home:null;},getElementById(id){return id==='admin-dong-picker'?picker:id==='overview-sheet'?overview:null;}};
 const win={matchMedia(){return {matches:true};},addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);},queueMicrotask(fn){fn();},requestAnimationFrame(fn){fn();}};
 let calls=0;
 const dispose=installSafetyHomeGuard({doc,win,app,onHome(){calls++;app.dataset.tab='map';picker.hidden=false;overview.hidden=false;}});
 let stopped=false;
 const ev={target:{closest(s){return s.includes('.nav-tab[data-tab="map"]')?home:null;}},preventDefault(){},stopImmediatePropagation(){stopped=true;}};
 listeners.get('click')(ev);
 assert.equal(calls,1);assert.equal(stopped,true);assert.equal(picker.hidden,true);assert.equal(overview.hidden,true);
 dispose();assert.equal(listeners.has('click'),false);
});

test('explicit district open remains accessible through map options',()=>{
 const listeners=new Map();
 const home={};const app={dataset:{tab:'map'},classList:{remove(){}}};
 const picker={hidden:true,classList:{remove(){}},style:{removeProperty(){}}};
 const doc={querySelector(){return home;},getElementById(id){return id==='admin-dong-picker'?picker:null;}};
 const win={matchMedia(){return {matches:true};},addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(){},requestAnimationFrame(){} };
 const dispose=installSafetyHomeGuard({doc,win,app,onHome(){}});
 listeners.get('click')({target:{closest(s){return s.includes('#open-admin-dongs')?{}:null;}}});
 assert.equal(picker.hidden,true,'guard does not mutate picker when its real opener is pressed');
 dispose();
});

test('mobile map gains clarity at rest and lowers rendering demand in motion',()=>{
 const mobile=mobileMapPixelBudget({deviceRatio:3,coarse:true,width:390});
 assert.ok(mobile.moving<mobile.idle);assert.equal(mobile.idle,2);
 assert.deepEqual(mobileMapPixelBudget({deviceRatio:3,coarse:false,width:1440}),{moving:1.5,idle:1.5});
 assert.equal(mobileMapPixelBudget({deviceRatio:3,deviceMemory:2,coarse:true,width:390}).idle,1.65);
 assert.equal(responsiveMapPixelRatio({width:390,coarse:true,deviceRatio:3}),1.75,'old public helper remains compatible');
});

test('OSM general places parse actual tags and preserve source attribution',()=>{
 const places=osmGeneralPlaces([
  {type:'node',id:10,lat:37.5,lon:126.95,tags:{name:'동작 카페',amenity:'cafe'}},
  {type:'way',id:20,center:{lat:37.51,lon:126.94},tags:{name:'마트',shop:'supermarket'}},
  {type:'node',id:30,lat:37.5,lon:126.95,tags:{amenity:'restaurant'}},
 ]);
 assert.equal(places.length,2);assert.equal(places[0].category,'카페');assert.equal(places[1].category,'마트');
 assert.match(places[0].source,/OpenStreetMap/);
});

test('Overpass query respects coordinate order and network parsing',async()=>{
 const query=bboxToOverpass('126.9,37.48,126.96,37.52');
 assert.match(query,/37\.48000,126\.90000,37\.52000,126\.96000/);
 assert.match(query,/out center tags/);
 const places=await loadOsmGeneralFacilities('126.9,37.48,126.96,37.52',{fetcher:async()=>({ok:true,json:async()=>({elements:[{type:'node',id:1,lat:37.5,lon:126.93,tags:{name:'약국',amenity:'pharmacy'}}]})})});
 assert.equal(places.length,1);assert.equal(places[0].category,'약국');
});

test('search falls back to cached general POIs only after live API failure',async()=>{
 const originalFetch=globalThis.fetch,originalLocation=globalThis.location;
 try{
  globalThis.location={origin:'https://example.org'};
  globalThis.fetch=async()=>({ok:false});
  const result=await queryOfficialPlaces('노량진');assert.deepEqual(result,[]);
 }finally{globalThis.fetch=originalFetch;globalThis.location=originalLocation;}
});

test('PC/mobile separation and release history remain coherent',()=>{
 const main=text('src/main.js'),html=text('index.html');
 assert.match(main,/installSafetyHomeGuard\(/);
 assert.match(main,/navigate\('map',\{suppressOverview:true\}\)/);
 assert.match(html,/refresh-general-facilities/);
  assert.ok(html.includes('id="map-startup-version" aria-label="앱 버전">버전 1.0'),'the pre-release UI must keep its public 1.0 label');
  assert.equal(JSON.parse(text('public/version.json')).version,JSON.parse(text('package.json')).version);
 assert.match(text('src/v873-mobile-performance.css'),/@media \(max-width:699px\)/);
});


test('Cloudflare general-facility fallback limits coordinates and emits attribution',async()=>{
 assert.equal(validateFacilityBounds('0,0,1,1'),null);
 assert.equal(validateFacilityBounds('126.9,37.48,126.93,37.50').west,126.9);
 assert.match(facilityOverpassQuery(validateFacilityBounds('126.9,37.48,126.93,37.50')),/126\.90000/);
 const originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>({elements:[{type:'node',id:9,lat:37.49,lon:126.91,tags:{amenity:'cafe',name:'테스트 카페'}}]})});
  const response=await onRequestGet({request:new Request('https://test.test/api/osm-general-facilities?bbox=126.9,37.48,126.93,37.50')});
  const payload=await response.json();assert.equal(payload.ok,true);assert.equal(payload.elements.length,1);
  assert.match(payload.source,/OpenStreetMap/);
 }finally{globalThis.fetch=originalFetch;}
});
