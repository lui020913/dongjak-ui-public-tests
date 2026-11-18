import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDongjakNewsletterHtml,fetchDongjakNews} from '../server/dongjak-news.mjs';
import {classifyBusStopsError} from '../functions/api/transport/[[path]].js';

test('official newsletter parser only accepts authentic dongjak newsletter URLs and publication dates',()=>{
  const html='<table><tr><td>2026-11-06</td><td>제 576호 뉴스레터</td><td><a href="/mzin/20261106/mzfile_20261106133639.html">보기</a></td></tr>'+
    '<tr><td>2030-01-01</td><td><a href="https://evil.example/mzin/20300101/bad.html">악성 URL</a></td></tr></table>';
  const items=parseDongjakNewsletterHtml(html);
  assert.equal(items.length,1);
  assert.equal(items[0].title,'제 576호 뉴스레터');
  assert.equal(items[0].publishedAt,'2026-11-06');
  assert.match(items[0].url,/^https:\/\/enews\.dongjak\.go\.kr\/mzin\/20261106\//);
});

test('official notices fall back to verified newsletter when both boards fail',async()=>{
  const good='<table><tr><td>2026-11-06</td><td>제 576호 뉴스레터</td><td><a href="/mzin/20261106/mzfile_20261106133639.html">보기</a></td></tr></table>';
  const news=await fetchDongjakNews({type:'official',force:true,now:1794040000000,fetchImpl:async url=>{
    if(String(url).includes('enews.dongjak.go.kr'))return {ok:true,text:async()=>good};
    return {ok:false,status:503};
  }});
  assert.match(news.source,/공식 뉴스레터/);
  assert.equal(news.items.length,1);
  assert.match(news.items[0].url,/enews\.dongjak\.go\.kr/);
});

test('bus unauthorized consistently retains HTTP_401 reason without leaking secret',()=>{
  assert.deepEqual(classifyBusStopsError(new Error('UPSTREAM_HTTP_401')).reason,'HTTP_401');
  const script=readFileSync(new URL('../scripts/check-bus-key-local.mjs',import.meta.url),'utf8');
  assert.match(script,/SEOUL_BUS_SERVICE_KEY/);
  assert.doesNotMatch(script,/console\.log\([^\n]*\bkey\b\s*[,)]/i);
});
