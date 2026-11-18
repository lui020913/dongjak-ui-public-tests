import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {verifiedKorailLine1Timetable} from '../src/metro-korail-line1.js';
import {plannedArrivalsFromTimetable} from '../src/metro-planned-arrivals.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=readFileSync(path.join(root,'src/metro-sidepanel-20261110.css'),'utf8');
const main=readFileSync(path.join(root,'src/main.js'),'utf8');
test('latest CSS is imported after earlier sheet layout',()=>{
  assert.ok(main.lastIndexOf("import './metro-sidepanel-20261110.css';")>main.lastIndexOf("import './v614-transport-compact.css';"));
});
test('desktop metro sheet is right-docked with no central transform',()=>{
  assert.match(css,/min-width:700px/);
  assert.match(css,/right:calc\(16px \+ env\(safe-area-inset-right/);
  assert.match(css,/left:auto!important/);
  assert.match(css,/transform:none!important/);
  assert.match(css,/overflow-y:auto!important/);
});
test('sheet hides scrollbars while preserving internal scroll',()=>{
  assert.match(css,/scrollbar-width:none!important/);
  assert.match(css,/::-webkit-scrollbar\s*\{display:none!important/);
  assert.match(css,/max-width:699px/);
});
test('line 1 only computes schedule countdown from real verified station rows',()=>{
  assert.equal(verifiedKorailLine1Timetable(null,'노량진','1'),null);
  assert.equal(plannedArrivalsFromTimetable([], '1호선',{minute:600,second:0}).length,0);
  const official={schemaVersion:1,provider:'KORAIL',sourceUrl:'https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable',stations:{노량진:{weekday:[{directionCode:'1',time:'10:06',minute:606,destination:'광운대',express:false}]}}};
  const table=verifiedKorailLine1Timetable(official,'노량진역','1');
  assert.ok(table?.timetable?.length===1);
  const cards=plannedArrivalsFromTimetable(table.timetable,'1호선',{minute:602,second:0});
  assert.equal(cards[0].message,'약 4분 후 도착');
  assert.equal(cards[0].isPlanned,true);
});
