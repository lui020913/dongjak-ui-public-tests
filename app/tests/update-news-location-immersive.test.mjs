import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dongjakGpsRegion,createOutsideDistrictNotifier} from '../src/dongjak-location-alert.js';
import {installMapImmersive} from '../src/map-immersive.js';
import {formatNewsDate} from '../src/dongjak-news.js';
import {decodeXmlText,parseDongjakGoogleNewsRss,parseDongjakOfficeNotices,parseDongjakBoardHtml,fetchDongjakNews} from '../server/dongjak-news.mjs';

const boundary={type:'Polygon',coordinates:[[[126.93,37.49],[126.97,37.49],[126.97,37.51],[126.93,37.51],[126.93,37.49]]]};
test('GPS 동작구 내/외, 저정확도 경계 판정',()=>{
  assert.equal(dongjakGpsRegion(126.95,37.5,boundary,10),'inside');
  assert.equal(dongjakGpsRegion(126.98,37.5,boundary,10),'outside');
  assert.equal(dongjakGpsRegion(126.97015,37.5,boundary,100),'border');
  assert.equal(dongjakGpsRegion(126.95,37.5,null,10),'unknown');
});
test('GPS 위치 밖 경고는 반복하지 않으며 재진입 후에만 재경고',()=>{
  let calls=0;
  const alert=createOutsideDistrictNotifier(()=>{calls++;});
  alert.check(126.98,37.5,boundary,10);
  alert.check(126.98,37.5,boundary,10);
  alert.check(126.9701,37.5,boundary,100); // border - should not re-arm
  alert.check(126.98,37.5,boundary,10);
  assert.equal(calls,1);
  alert.check(126.95,37.5,boundary,10);
  alert.check(126.98,37.5,boundary,10);
  assert.equal(calls,2);
});
test('지도 손 동작·확대 중에도 상하 UI와 검색창은 계속 표시',()=>{
  const handlers=new Map();
  const classes=new Set();
  const app={dataset:{tab:'map'},classList:{add(x){classes.add(x);},remove(x){classes.delete(x);},contains(x){return classes.has(x);}}};
  const listeners=new Map();const button={hidden:true,addEventListener(name,fn){listeners.set(name,fn);}};
  const map={on(name,fn){handlers.set(name,fn);}};
  const control=installMapImmersive({map,app,restoreButton:button});
  handlers.get('zoomstart')({});
  assert.equal(button.hidden,true,'자동 카메라 이동에 숨김 금지');
  handlers.get('dragstart')();
  assert.equal(control.isHidden(),false);
  assert.equal(button.hidden,true);
  listeners.get('click')();
  assert.equal(control.isHidden(),false);
  assert.equal(button.hidden,true);
  app.dataset.tab='news';
  handlers.get('dragstart')();
  assert.equal(control.isHidden(),false);
});
test('RSS 뉴스 원문/발행일/언론사만 추출하고 스크립트 텍스트는 DOM에 HTML로 삽입하지 않음',()=>{
  const rss=`<rss><channel><item><title><![CDATA[동작구 &amp; 흑석동 소식]]></title><link>https://news.google.com/rss/articles/abc</link><pubDate>Thu, 05 Nov 2026 10:12:00 GMT</pubDate><source url="https://press.example">언론사</source></item><item><title>잘못된 링크</title><link>javascript:alert(1)</link></item></channel></rss>`;
  const rows=parseDongjakGoogleNewsRss(rss);
  assert.equal(rows.length,1);
  assert.equal(rows[0].title,'동작구 & 흑석동 소식');
  assert.equal(rows[0].source,'언론사');
  assert.ok(rows[0].url.startsWith('https://news.google.com/'));
  assert.equal(decodeXmlText('&lt;script&gt;'),'\x3cscript>');
  assert.ok(formatNewsDate('20261105').includes('2026'));
});
test('동작구청 API는 공식 제목·담당부서·날짜만 표시',()=>{
  assert.deepEqual(parseDongjakOfficeNotices({DongjakNewsNoticeList:{RESULT:{CODE:'INFO-000'},row:[{SUBJECT:'주민센터 안내',DEPTNAME:'자치행정과',REGDATE:'2026-11-05',NTTCN:'공고문 본문'}]}}),
   [{title:'주민센터 안내',source:'자치행정과',publishedAt:'2026-11-05',url:'https://www.dongjak.go.kr/portal/main/main.do'}]);
  assert.throws(()=>parseDongjakOfficeNotices({DongjakNewsNoticeList:{RESULT:{CODE:'INFO-100'}}}));
});
test('동작구 공식 게시판 HTML에서 제목·부서·날짜·원문 링크를 추출',()=>{
  const html=`<table><tbody><tr><td>9854</td><td><a href="/portal/bbs/B0000022/view.do?menuNo=200638&amp;nttId=10757438&amp;pageIndex=1">제8기 동작구소식지 명예기자 모집</a></td><td>홍보담당관</td><td>2026-10-02</td><td>19</td></tr></tbody></table>`;
  const rows=parseDongjakBoardHtml(html,{baseUrl:'https://www.dongjak.go.kr/portal/bbs/B0000022/list.do?menuNo=200638',sourceLabel:'동작구청 알려드립니다'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].title,'제8기 동작구소식지 명예기자 모집');
  assert.equal(rows[0].source,'홍보담당관');
  assert.equal(rows[0].publishedAt,'2026-10-02');
  assert.match(rows[0].url,/nttId=10757438/);
});
test('구청 소식은 API 키 없이도 공식 HTTPS 게시판을 우선 사용',async()=>{
  const html=`<table><tr><td>1</td><td><a href="/portal/bbs/B0000022/view.do?menuNo=200638&amp;nttId=12345">주민센터 안내</a></td><td>자치행정과</td><td>2026-11-05</td></tr></table>`;
  let calls=0;
  const fetchImpl=async(url)=>{calls++;assert.ok(url.startsWith('https://www.dongjak.go.kr/portal/bbs/'));return {ok:true,text:async()=>html};};
  const result=await fetchDongjakNews({type:'official',openApiKey:'',fetchImpl,force:true,now:1793870000000});
  assert.equal(calls,2,'공식 공지와 보도자료를 병렬로 조회합니다.');
  assert.equal(result.items[0].title,'주민센터 안내');
  assert.equal(result.source,'동작구청 알려드립니다 · 공식 홈페이지');
});
test('지역 뉴스는 Bing RSS를 먼저 조회하고 실패하면 Google RSS로 대체',async()=>{
  const xml='<rss><channel><item><title>동작구 안전 소식</title><link>https://news.google.com/rss/articles/xyz</link><pubDate>Thu, 05 Nov 2026 10:12:00 GMT</pubDate></item></channel></rss>';
  let calls=0,rssCalls=0;
  const fetchImpl=async(url)=>{
    calls++;
    if(url.includes('bing.com/news/search')){rssCalls++;return {ok:true,text:async()=>xml};}
    // Image discovery can independently query the linked Google News article.
    return {ok:false,status:404,headers:{get:()=>null}};
  };
  const a=await fetchDongjakNews({type:'media',fetchImpl,force:true,now:1793870000000});
  assert.equal(a.items.length,1);
  const b=await fetchDongjakNews({type:'media',fetchImpl,now:1793870001000});
  assert.equal(rssCalls,1,'뉴스 10분 캐시 사용');
  assert.equal(b.items[0].title,'동작구 안전 소식');
});
test('지역 뉴스 RSS가 모두 실패하면 실제 구청 보도자료만 출처를 명시해 대체 표시',async()=>{
  const urls=[];
  const html='<table><tr><td>1</td><td><a href="/portal/bbs/B0000171/view.do?menuNo=200647&amp;nttId=12345">동작구 공식 보도자료</a></td><td>홍보담당관</td><td>2026-11-11</td></tr></table>';
  const fetchImpl=async(url)=>{
    urls.push(String(url));
    if(String(url).includes('/B0000171/list.do'))return {ok:true,text:async()=>html};
    return {ok:false,status:503,text:async()=>''};
  };
  const result=await fetchDongjakNews({type:'media',fetchImpl,force:true,now:1793880000000});
  assert.equal(result.fallback,true);
  assert.match(result.source,/보도자료 · 지역뉴스 대체/);
  assert.equal(result.items[0].title,'동작구 공식 보도자료');
  assert.match(result.items[0].url,/www\.dongjak\.go\.kr/);
  assert.ok(urls.some(url=>url.includes('/B0000171/list.do')));
});
test('기존 지도 설정을 유지하며 뉴스 탭, 15초 갱신, 지도 복구 컨트롤 포함',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const transport=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  const server=readFileSync(new URL('../server/transport-proxy.mjs',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(main,/outsideDistrictAlert\.check/);
  assert.match(main,/installMapImmersive/);
  assert.match(main,/if \(tab === 'news'\) dongjakNews\.open\(\)/);
  assert.match(transport,/autoRefreshSelectedArrival/);
  assert.match(transport,/15000/);
  assert.match(transport,/document\.hidden/);
  assert.match(server,/fetchDongjakNews/);
  assert.match(server,/\/api\/transport\/news/);
  assert.match(server,/Date\.now\(\)-cached\.at<10000/);
  assert.match(html,/data-tab="news"/);
  assert.match(html,/id="map-chrome-restore"/);
});
