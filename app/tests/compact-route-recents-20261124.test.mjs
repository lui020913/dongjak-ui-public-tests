import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recordSearchQuery,recentSearchQueries,recordRecentPlace,recentPlaces,clearRecentPlaces} from '../src/v815-place-store.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared history deduplicates, caps, persists and clears places and queries',()=>{const store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};try{recordSearchQuery('노량진역');recordSearchQuery('상도역');recordSearchQuery('노량진역');assert.deepEqual(recentSearchQueries(),['노량진역','상도역']);for(let i=0;i<14;i++)recordSearchQuery('장소 '+i);assert.equal(recentSearchQueries().length,12);recordRecentPlace({name:'상도역',lng:126.95,lat:37.5,kind:'subway'});assert.equal(recentPlaces()[0].name,'상도역');clearRecentPlaces();assert.deepEqual(recentSearchQueries(),[]);assert.deepEqual(recentPlaces(),[]);}finally{delete globalThis.localStorage;}});
test('actual shadow route editor has compact header, waypoint delegation and shared history',()=>{const js=read('src/route-screen-v3.js'),css=read('src/route-screen-v3.css');assert.match(js,/data-v3="waypoint"/);assert.match(js,/openSearch\('waypoint'\)/);assert.match(js,/mirrorWaypoints/);assert.match(js,/mirrorResults\(\)/);assert.match(js,/recentPlaces\(\)/);assert.match(css,/\+ 54px\)/);assert.doesNotMatch(js,/class="mode-row"/);});

test('old history migrates and duplicate named facilities with nearby coordinates coalesce',()=>{
 const cache=new Map(),key='dj-map-v815-recent',queries='dj-map-v815-recent-queries';
 globalThis.localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
 try{
  const a={name:'꿈동산어린이공원',category:'어린이공원',lng:126.95,lat:37.5};
  const b={...a,lng:126.9503,lat:37.5002};
  const far={...a,lng:126.96};
  cache.set(key,JSON.stringify([a,b,a,far]));
  assert.equal(recentPlaces().length,2);
  assert.equal(JSON.parse(cache.get(key)).length,2);
  recordRecentPlace(b);assert.equal(recentPlaces().length,2);
  assert.equal(recentPlaces()[0].lng,b.lng);
  const bus={...a,name:'상도역',kind:'bus',arsId:'20190'};
  recordRecentPlace(bus);recordRecentPlace({...bus,arsId:'20191'});
  assert.equal(recentPlaces().filter(p=>p.kind==='bus').length,2);
  cache.set(queries,JSON.stringify(['노량진',' 노량진 ','ABC','abc','상도  역','상도 역']));
  assert.deepEqual(recentSearchQueries(),['노량진','ABC','상도 역']);
 }finally{delete globalThis.localStorage;}
});
test('picker hints and report location use one compact pill and reduced measured nav gap',()=>{
 const css=read('src/mobile-first-layout.css'),shadow=read('src/route-screen-v3.css');
 assert.ok(css.includes(':is(#route-pick-hint,#community-map-hint,#dj-community-location-card):not([hidden])'));
 assert.ok(css.includes('var(--dj-user-dock-bottom'));
 assert.match(css,/\+ 2px\)!important/);
 assert.ok(css.includes('background:#dce7e1'));
 assert.ok(shadow.includes('.search-results .search-recent-head .history-clear'));
});
