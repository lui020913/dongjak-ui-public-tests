import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {timetableCacheKey,saveTimetable,loadTimetable,storeBusObservation,
  latestBusObservations,expectedBusHeadway,parsedBusEtaMinutes} from '../src/transport-timetable-cache.js';

const src=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
function memoryStore(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};}
const subway={kind:'subway',name:'장승배기',selectedLine:'7호선'};

test('v7.0.29 official timetable local cache is scoped by station, line and service-day, expires safely',()=>{
  const store=memoryStore(),now=Date.UTC(2026,10,11,12);
  const verified={status:'ok',kind:'subway',timetable:[{line:'7호선',directionCode:'1',time:'18:24',minute:1104}],source:'서울교통공사'};
  assert.equal(saveTimetable(subway,'1',verified,{store,now}),true);
  assert.equal(loadTimetable(subway,'1',{store,now:now+1200}).timetable[0].time,'18:24');
  assert.equal(loadTimetable({...subway,selectedLine:'9호선'},'1',{store,now}),null);
  assert.equal(loadTimetable(subway,'2',{store,now}),null);
  assert.equal(loadTimetable(subway,'1',{store,now:now+19*3600_000}),null);
  assert.notEqual(timetableCacheKey(subway,'1'),timetableCacheKey(subway,'2'));
});

test('v7.0.29 bus history saves observations but never fabricates a past arrival',()=>{
  const store=memoryStore(),now=Date.UTC(2026,10,11,12);
  const items=[{route:'동작01',destination:'대방역',message:'약 3분 후',nextMessage:'11분 후'}];
  assert.equal(storeBusObservation('20596',items,{store,now}),true);
  const row=latestBusObservations('20596',{store,now:now+1000})[0];
  assert.equal(row.route,'동작01');
  assert.equal(row.confirmedArrivalNotice,false);
  assert.equal(expectedBusHeadway(row),8);
  assert.equal(parsedBusEtaMinutes('잠시 후 도착'),0);
  assert.equal(expectedBusHeadway({message:'출발대기',nextMessage:'정보 없음'}),null);
  assert.deepEqual(latestBusObservations('20596',{store,now:now+37*3600_000}),[]);
});

test('v7.0.29 mobile always renders five nav targets while every floating panel shares the nav baseline',()=>{
  const css=src('src/v724-final-layout.css'),html=src('index.html');
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
  assert.match(css,/#app #bottom-nav>\.nav-tab/);
  assert.match(css,/--dj-v724-panel-bottom/);
  for(const id of ['route','participate','news','mine','map'])assert.match(html,new RegExp(`data-tab="${id}"`));
  assert.match(css,/#app\[data-tab="map"\]\.map-controls-open #map-advanced-controls/);
  assert.match(css,/#app\[data-tab="map"\] #transport-sheet:not\(\[hidden\]\)/);
});

test('v7.0.29 road width gets a true icon and consistent floating legend',()=>{
  const html=src('index.html'),css=src('src/v724-final-layout.css'),script=src('src/road-width-layer.js');
  assert.match(html,/id="toggle-road-width"[^>]*>\s*<svg class="dj-road-width-icon"/);
  assert.match(html,/class="dj-road-width-label">도로폭/);
  assert.match(css,/#app #road-width-legend:not\(\[hidden\]\)/);
  assert.match(script,/legend\.style\?\.removeProperty\?\./);
});

test('v7.0.29 theme icons stay centered and desktop cards track measured left navigation',()=>{
  const css=src('src/v724-final-layout.css'),rail=src('src/v713-desktop-rail.js');
  assert.match(css,/#app #theme-toggle::after/);
  assert.match(css,/background:#fff!important/);
  assert.match(css,/--dj-v724-rail-right/);
  assert.match(rail,/nav\.getBoundingClientRect\(\)/);
  assert.match(css,/#app #map-options-mobile-close::after/);
});

test('v7.0.29 bus ETA snapshots and scheduled metro table respect provider status',()=>{
  const client=src('src/transport-map.js'),parse=src('src/transport-data.js');
  assert.match(client,/saveTimetable\(place,selectedDay,data\)/);
  assert.match(client,/loadTimetable\(place,selectedDay\)/);
  assert.match(client,/storeBusObservation\(active\.arsId\|\|next\.arsId/);
  assert.match(client,/최근 버스 도착예정 관측 기록/);
  assert.match(parse,/nextMessage:String\(x\.arrmsg2/);
});
