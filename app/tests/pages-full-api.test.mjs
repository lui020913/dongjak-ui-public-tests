import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/transport/[[path]].js';
import {readFileSync} from 'node:fs';
const request=(path,env={})=>onRequest({request:new Request('https://example.pages.dev/api/transport/'+path),env});

test('Production frontend calls first-party Pages Functions by default',()=>{
  const source=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(source,/VITE_TRANSPORT_API_BASE \|\| '\/api\/transport'/);
  assert.doesNotMatch(source,/env\?\.DEV \? '\/api\/transport' : ''/);
});
test('Pages API status supports 3 separate secrets',async()=>{
  const response=await request('status',{SEOUL_BUS_SERVICE_KEY:'B',SEOUL_SUBWAY_API_KEY:'S',SEOUL_OPEN_API_KEY:'O'});
  assert.equal(response.status,200);
  const json=await response.json();
  assert.equal(json.bus,true);assert.equal(json.subway,true);
  assert.equal(json.accessibility,true);
});
test('Pages: official news uses Dongjak HTTPS board without requiring legacy 8088 API key',async()=>{
  const original=globalThis.fetch;
  const html=`<table><tr><td>1</td><td><a href="/portal/bbs/B0000022/view.do?menuNo=200638&amp;nttId=12345">동작구 공식 공지</a></td><td>홍보담당관</td><td>2026-11-05</td></tr></table>`;
  globalThis.fetch=async url=>{
    assert.ok(String(url).includes('/portal/bbs/B0000022/list.do'));
    return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
  };
  try{
    const response=await request('news?type=official&refresh=1');
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.items[0].title,'동작구 공식 공지');
    assert.equal(data.source,'동작구청 알려드립니다 · 공식 홈페이지');
  }finally{globalThis.fetch=original;}
});
test('Pages: service-hours route reports unconfigured state without a key',async()=>{
  const response=await request('service-hours?kind=subway&station=%EB%85%B8%EB%9F%89%EC%A7%84&line=1%ED%98%B8%EC%84%A0');
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.status,'unconfigured');
  assert.equal(body.kind,'subway');
});
test('Pages: 1호선 official timetable query yields original timetable rows',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async url=>{
    const path=String(url);
    if(path.includes('SearchInfoBySubwayNameService'))return new Response(JSON.stringify({SearchInfoBySubwayNameService:{row:[{STATION_NM:'노량진',LINE_NUM:'1호선',FR_CODE:'136',STATION_CD:'1004'}]}}));
    if(path.includes('SearchSTNTimeTableByFRCodeService'))return new Response(JSON.stringify({SearchSTNTimeTableByFRCodeService:{row:[{WEEK_TAG:'1',LEFTTIME:'05:12:00',SUBWAYENAME:'청량리',TRAIN_NO:'1001'}]}}));
    throw new Error('UNEXPECTED_URL');
  };
  try{
    const result=await request('service-hours?kind=subway&station=%EB%85%B8%EB%9F%89%EC%A7%84&line=1%ED%98%B8%EC%84%A0&day=1',{SEOUL_OPEN_API_KEY:'SECRET'});
    assert.equal(result.status,200);
    const body=await result.json();
    assert.equal(body.status,'ok');
    assert.ok(body.items.length);
    assert.ok(body.timetable.length);
    assert.equal(body.timetable[0].line,'1호선');
    assert.ok(!(JSON.stringify(body)).includes('SECRET'));
  }finally{globalThis.fetch=original;}
});
test('Pages: median stop is validated before calling upstream',async()=>{
  const result=await request('bus/median-nearby?lat=0&lng=0&name=aaa',{SEOUL_BUS_SERVICE_KEY:'B'});
  assert.equal(result.status,400);
});
