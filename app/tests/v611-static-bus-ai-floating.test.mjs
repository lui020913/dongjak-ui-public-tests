import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialStaticBusPlaces} from '../src/static-bus-stops.js';
import {facilityFallbackDescription} from '../src/place-details.js';
import {facilityVisitAdvice,facilityPurpose} from '../functions/api/place-insight.js';
import {boundedFloatPosition,DRAGGABLE_PANELS,enableAnchoredPopupDragging} from '../src/draggable-floats.js';
const code=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('official dataset must be validated and never invent absent stops',()=>{
  assert.deepEqual(officialStaticBusPlaces(undefined),[]);
  const insufficient={source:'서울시 버스정류소 위치정보',sourceDate:'2026-09-02',stops:[{arsId:'01234',name:'검증',lng:126.96,lat:37.5}]};
  assert.deepEqual(officialStaticBusPlaces(insufficient),[]);
  const stops=Array.from({length:1003},(_,i)=>({arsId:String(i+100).padStart(5,'0'),name:`실제 원본 테스트 행 ${i}`,lng:126.95,lat:37.49}));
  const data={...insufficient,stops};
  const result=officialStaticBusPlaces(data,()=>true);
  assert.equal(result.length,1003);
  assert.equal(result[0].arsId,'00100');
  assert.equal(result[0].source,'seoul-official-static-file');
  assert.equal(officialStaticBusPlaces(data,()=>false).length,0);
  data.stops[1]={...data.stops[1],arsId:data.stops[0].arsId};
  assert.equal(officialStaticBusPlaces(data,()=>true).length,1002);
});

test('official static file loaded at startup before any subsequent viewport-dependent refresh',()=>{
  assert.match(code,/preloadOfficialStaticBusStops/);
  assert.match(code,/fetch\('\/data\/transport\/seoul-bus-stops\.json'/);
  assert.match(code,/void preloadOfficialStaticBusStops\(\)/);
  assert.match(code,/officialStaticStopCount>0/);
  assert.match(code,/transport-bus-names-close',type:'symbol',source:'transport-bus',minzoom:18\.4/);
  assert.match(code,/text-allow-overlap':true,'text-ignore-placement':true/);
});

test('AI facility tips are different for different real facility types',()=>{
  assert.match(facilityPurpose('서울흑석동우체국','시설'),/우편/);
  assert.match(facilityVisitAdvice('서울흑석동우체국','시설'),/접수 마감시간/);
  assert.match(facilityVisitAdvice('동작도서관','시설'),/휴관일/);
  assert.match(facilityVisitAdvice('상현초등학교','시설'),/통학|방문|등·하교/);
  assert.match(facilityFallbackDescription('청송경로당','경로당'),/프로그램/);
  assert.match(facilityFallbackDescription('상현초등학교','학교'),/등·하교/);
  assert.doesNotMatch(facilityFallbackDescription('상현초등학교','학교'),/경도|GPS/);
});

test('floating windows have existing close actions and bounded desktop dragging',()=>{
  assert.equal(typeof enableAnchoredPopupDragging,'function');
  assert.ok(DRAGGABLE_PANELS.some(([id])=>id==='transport-sheet'));
  assert.ok(DRAGGABLE_PANELS.some(([id])=>id==='night-visibility-float'));
  assert.match(html,/id="road-width-legend-close"/);
  assert.match(html,/id="transport-close"/);
  assert.match(html,/id="night-visibility-float-stop"[^>]*><\/button>/);
  assert.deepEqual(boundedFloatPosition(-900,-10,220,200,1200,800),{x:6,y:6});
  assert.deepEqual(boundedFloatPosition(1200,999,220,200,1200,800),{x:974,y:594});
});
