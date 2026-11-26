import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {normalMapPixelRatio,phoneProfile} from '../src/adaptive-phone-map-budget.mjs';
import {facilityPresentation} from '../src/v912-poi-presentation.js';
import {fetchArrivalHistory} from '../server/bus-arrival-history.mjs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('normal phones smooth edges, legacy economy remains one pixel per CSS px',()=>{
 assert.equal(normalMapPixelRatio({phone:true,ua:'iPhone OS 18_2',deviceRatio:3}),2.5);
 assert.equal(phoneProfile({phone:true,ua:'Android 10; SM-N960N'}),'economy');
 assert.match(read('main.js'),/antialias: djInitialBudget!=='economy'/);
 assert.match(read('bus-route-overlay.js'),/tolerance:0,buffer:128,maxzoom:19/);
});
test('major and public facilities are available earlier without promoting all commercial icons',()=>{
 assert.equal(facilityPresentation('우체국').group,'public');
 assert.match(read('featured-place-labels.js'),/minzoom:13\.5/);
 assert.match(read('civic-facility-layer.js'),/minzoom:safety\?13\.8:type==='school'\|\|type==='civic'\?14\.2:16/);
 assert.match(read('seoul-official-facilities.js'),/map\.getZoom\?\.\(\)<14/);
});
test('facility scroll owns body; cards do not shrink; common save group lives below content',()=>{
 const js=read('place-details.js'),css=read('mobile-first-layout.css'),transport=read('transport-map.js');
 assert.match(js,/root\.append\(folderSection\)/);assert.match(js,/header\.append\(closeButton\)/);
 assert.match(css,/\.dj-place-body > \*\{flex:0 0 auto!important/);
 assert.match(css,/\.dj834-reviews\{background:/);
 assert.match(js,/folderSelect\.classList\.add\('dj-shared-favorite-select'\)/);
 assert.match(transport,/transportFolder\.classList\.add\('dj-shared-favorite-select'\)/);
 assert.ok(js.indexOf('aiSection.append(text(\'small\'')<js.indexOf('installPlaceReviews(body,p)'));
});
test('outgoing community view cannot redraw or clear its detail before normal dissolve',()=>{
 const main=read('main.js');
 assert.match(main,/if\(!preserveCommunityComposer&&tab==='participate'/);
 assert.match(main,/function renderCommunity\(\) \{\s*if\(document\.getElementById\('participation-panel'\)\?\.dataset\.djTabOutgoing==='true'\)return/);
});
test('vehicle interval keeps honest estimated text but no decorative dotted outline; history preserves full times',()=>{
 const css=read('bus-route-detail.css'),js=read('bus-route-detail.js');
 assert.doesNotMatch(css,/data-position-accuracy=interval[^}]*outline:1px dashed/);
 assert.match(js,/정류장 구간 내 위치 미확인/);
 assert.match(js,/time\.dateTime=/);assert.match(js,/7일 이전 조회/);
 assert.match(js,/전체 조회가 완료되지 않았습니다/);
});
test('larger route-day pages can retrieve an exact stop beyond the first thousand rows',async()=>{
 const query={routeId:'100100081',stationId:'201000123',seq:'37',date:'20261031'};
 const row={routeId:query.routeId,stdrDe:query.date,sttnId:query.stationId,sttnSn:'37',runSn:'1',planId:'1',arvlDt:'20261031083000'};
 const first=Array.from({length:5000},(_,i)=>({...row,sttnId:'201000124',runSn:String(i)}));let calls=0;
 const r=await fetchArrivalHistory(query,'test-key',{fetcher:async url=>{
  assert.equal(url.searchParams.get('rowCnt'),'5000');
  assert.equal(url.searchParams.get('startRow'),calls?'5001':'1');
  return new Response(JSON.stringify(calls++?[row]:first));
 }});
 assert.equal(r.complete,true);assert.equal(r.arrivals.length,1);assert.equal(r.arrivals[0].time,'08:30:00');
});
