import test from 'node:test';
import assert from 'node:assert/strict';
import {sillimStationUrl,parseSillimPublishedHtml} from '../server/sillim-published-timetable.mjs';
import {readFileSync} from 'node:fs';

const hourTable=(base)=>'<table><tr><th>시</th><th>분</th></tr>'+Array.from({length:10},(_,i)=>`<tr><th>${i+5}</th><td>${String((base+i)%60).padStart(2,'0')} 45</td></tr>`).join('')+'</table>';
const src='<table><tr><th>구분</th><th>하행</th><th>상행</th></tr><tr><th>첫차</th><td>05:30</td><td>05:45</td></tr></table>';
const html=src+hourTable(30)+hourTable(40)+src+hourTable(32)+hourTable(42);
test('only operator-whitelisted stations resolve to a fixed origin',()=>{
  assert.equal(sillimStationUrl('샛강역'),'https://www.sillimlrt.com/kr/html/sub01/01010201.html');
  assert.equal(sillimStationUrl('대방(성애병원)'),'https://www.sillimlrt.com/kr/html/sub01/01010202.html');
  assert.equal(sillimStationUrl('관악산'),'https://www.sillimlrt.com/kr/html/sub01/01010211.html');
  assert.equal(sillimStationUrl('https://evil.example'),null);
});
test('operator timetable HTML conversion uses exact published hour cells, both days and directions',()=>{
  const a=parseSillimPublishedHtml(html,{station:'샛강',day:'1'});
  assert.equal(a?.status,'ok');
  assert.equal(a.timetable.length,40);
  assert(a.timetable.some(row=>row.directionCode==='2'&&row.time==='05:30'));
  assert(a.timetable.some(row=>row.directionCode==='1'&&row.time==='05:40'));
  const b=parseSillimPublishedHtml(html,{station:'샛강',day:'3'});
  assert(b?.timetable.some(row=>row.directionCode==='2'&&row.time==='05:32'));
  assert.equal(parseSillimPublishedHtml('<html>No timetable</html>',{station:'샛강',day:'1'}),null);
});
test('operator fetch route is same-origin and never for guessed line 1 schedule',()=>{
  const server=readFileSync(new URL('../functions/api/transport/[[path]].js',import.meta.url),'utf8');
  const client=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(server,/'operator-timetable'/);
  assert.match(server,/sillimStationUrl\(station\)/);
  assert.match(client,/\/operator-timetable\?\$\{params\}/);
});
test('Cloudflare operator route returns in-app train rows rather than redirect',async()=>{
  const {onRequestGet}=await import('../functions/api/transport/[[path]].js');
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(html,{status:200,headers:{'Content-Type':'text/html'}});
  try{
    const response=await onRequestGet({request:new Request('https://example.test/api/transport/operator-timetable?station=%EB%B3%B4%EB%9D%BC%EB%A7%A4&day=2'),env:{}});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.status,'ok');
    assert.equal(body.timetable.length,40);
    assert.equal(body.day,'2');
    assert(body.sourceUrl.endsWith('01010204.html'));
  }finally{globalThis.fetch=previous;}
});
