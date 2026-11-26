import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCommunityReportBody} from '../src/community-report-presentation.js';
import {readFileSync} from 'node:fs';
test('legacy report prefix becomes two facts and original multiline body',()=>{
 const raw='[보행불편 유형: 보행공간 협소] [현장 확인: 일반 확인]\n보행로가 너무 협소해요 ㅠㅠ\n두 번째 줄';
 assert.deepEqual(splitCommunityReportBody(raw,'보행 불편'),{type:'보행공간 협소',priority:'일반 확인',body:'보행로가 너무 협소해요 ㅠㅠ\n두 번째 줄'});
});
test('unstructured and other categories are never changed',()=>{
 for(const [raw,category] of [['[보행불편 유형: 기타] 본문','보행 불편'],['[보행불편 유형: 기타] [현장 확인: 일반 확인]\n본문','자유게시판'],['원문\n그대로','보행 불편']]){
  assert.deepEqual(splitCommunityReportBody(raw,category),{type:'',priority:'',body:raw});
 }
});
test('detail uses facts, feed uses only body, list button has vector arrow',()=>{
 const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(s.includes('communityReportContent(post,false)'));
 assert.ok(s.includes('communityReportContent(post,true)'));
 assert.ok(s.includes('community-report-facts'));
 assert.ok(s.includes('community-back-arrow'));
});
