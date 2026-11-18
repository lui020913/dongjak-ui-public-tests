import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importantPlaceFromFeatures} from '../src/important-place-click.js';
import {isMobileWeb} from '../src/mobile-map-controls.js';
import {HANGANG_BRIDGE_NAMES} from '../src/hangang-bridge-labels.js';
import {fetchDongjakNews} from '../server/dongjak-news.mjs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('map guide and mobile fullscreen are accessible controls without a fake autostart promise',()=>{
  const html=read('index.html');
  for(const id of ['map-gesture-guide','map-gesture-guide-open','map-gesture-guide-close','mobile-fullscreen-toggle'])
    assert.match(html,new RegExp(`id="${id}"`));
  const src=read('src/mobile-map-controls.js');
  assert.match(src,/requestFullscreen/);
  assert.match(src,/pointerdown/);
  assert.match(src,/fullscreenchange/);
  assert.equal(isMobileWeb({width:390,coarse:true,native:false}),true);
  assert.equal(isMobileWeb({width:1200,coarse:true,native:false}),false);
  assert.equal(isMobileWeb({width:390,coarse:true,native:true}),false);
});

test('river crossing names include all required bridges and are embedded in MapLibre style layers',()=>{
  for(const bridge of ['원효대교','한강철교','한강대교','동작대교','반포대교'])
    assert.ok(HANGANG_BRIDGE_NAMES.includes(bridge));
  assert.match(read('src/hangang-bridge-labels.js'),/text-allow-overlap/);
});

test('known universities and civic locations are selectable from rendered map features',()=>{
  assert.equal(importantPlaceFromFeatures([{properties:{'name:ko':'중앙대학교'}}]).name,'중앙대학교');
  assert.equal(importantPlaceFromFeatures([{properties:{name:'숭실대학교'}}]).type,'대학교');
  assert.equal(importantPlaceFromFeatures([{properties:{name:'서울현충원'}}]).name,'국립서울현충원');
  assert.equal(importantPlaceFromFeatures([{properties:{name:'일반도로'}}]),null);
});

test('popup palette separates light and dark, landscape keeps control access',()=>{
  const css=read('src/style.css');
  assert.match(css,/data-theme="dark"\] \.maplibregl-popup-content/);
  assert.match(css,/orientation:landscape/);
  assert.match(css,/mobile-fullscreen-toggle/);
});

test('timetable displays scheduled rows even when upstream summary items are empty',()=>{
  const src=read('src/transport-map.js');
  assert.match(src,/data\.timetable\.length/);
  assert.match(src,/서울교통공사 공식 시간표 안내/);
});

test('official Dongjak notice fallback accepts real Open API data after public board failure',async()=>{
  const type='official';
  const body=await fetchDongjakNews({type,force:true,now:Date.now()+13e6,
    fetchImpl:async()=>({ok:false,status:503,text:async()=>''}),
    openApiKey:'dummy-local-test-key',
    fetchOfficialApi:async(service,parts)=>{
      assert.equal(service,'DongjakNewsNoticeList');
      assert.deepEqual(parts,[20]);
      return {DongjakNewsNoticeList:{RESULT:{CODE:'INFO-000'},row:[{SUBJECT:'테스트 공식 공지',DEPTNAME:'동작구청',REGDATE:'20261109'}]}};
    }});
  assert.equal(body.items.length,1);
  assert.equal(body.items[0].title,'테스트 공식 공지');
  assert.equal(body.source,'동작구청 알려드립니다 · 서울 열린데이터광장 API');
});
