import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nearestRoadAddress} from '../functions/api/reverse-address.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('nearest real numbered road address wins regardless of provider order',()=>{
 const f=(lng,lat,street,housenumber)=>({geometry:{coordinates:[lng,lat]},properties:{city:'서울',district:'동작구',street,housenumber}});
 assert.equal(nearestRoadAddress([f(126.96,37.5,'상도로','20'),f(126.9501,37.5,'상도로','15'),f(126.95,37.5,'상도로',null)],37.5,126.95),'서울 동작구 상도로 15');
 assert.equal(nearestRoadAddress([f(126.95,37.5,'상도로',null)],37.5,126.95),null);
});
test('report card and geographic marker share cleanup, and do not use map popup',()=>{
 const s=read('src/main.js'),show=s.slice(s.indexOf('function showCommunityLocation('),s.indexOf('async function updateLike('));
 assert.match(s,/communityLocationMarker\?\.remove\(\);communityLocationMarker=null/);
 assert.match(s,/communityLocationCard\?\.remove\(\);communityLocationCard=null/);
 assert.match(show,/setLngLat\(\[lng,lat\]\)/);
 assert.match(show,/app\.append\(card\)/);
 assert.doesNotMatch(show,/setPopup|togglePopup/);
 assert.match(s,/'white-space':'nowrap'/);
});
test('map area list fills available height and selected rows are the only map pins',()=>{
 const s=read('src/map-quick-search.js');
 assert.match(s,/panelHeight=fullArea\?available:Math\.min\(520,available\)/);
 assert.match(s,/selectedMapRows=groups\[index\]\.rows/);
 assert.match(s,/mapResultsClose\.addEventListener\('click',clearMapResults\)/);
 assert.match(s,/for\(const marker of resultMarkers\)marker\.remove\(\)/);
});
test('route entry has one dismiss control and GPS outside district stays in search',()=>{
 const s=read('src/route-screen-v3.js'),css=read('src/route-screen-v3.css'),main=read('src/main.js');
 assert.doesNotMatch(s,/data-v3="close"/);
 assert.match(s,/출발지를 선택하세요/);
 assert.match(css,/grid-column:3;grid-row:3;align-self:center/);
 assert.match(main,/현재 위치가 동작구 밖입니다\. 동작구 내 장소를 검색하거나 지도에서 선택해 주세요\./);
 assert.match(main,/routeTransitCandidate!==place\|\|panel\.hidden/);
});
