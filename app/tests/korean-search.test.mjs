import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeKoreanSearch,koreanInitials,koreanSearchScore,rankKoreanSearch} from '../src/korean-search.js';

test('조합형 한글과 분리 입력을 같은 검색어로 정규화한다',()=>{
 assert.equal(normalizeKoreanSearch('스ㅌㅏ 버ㄱ스'),'스타벅스');
 assert.equal(normalizeKoreanSearch('스타 벅스'),'스타벅스');
});
test('초성 검색이 상호명과 일치한다',()=>{
 assert.equal(koreanInitials('스타벅스'),'ㅅㅌㅂㅅ');
 assert.ok(koreanSearchScore('ㅅㅌㅂㅅ','스타벅스')>=80);
});
test('한글 한 글자 오타를 유사 검색으로 허용한다',()=>{
 assert.ok(koreanSearchScore('스타벅수','스타벅스')>=55);
});
test('정확도 우선으로 검색 결과를 정렬한다',()=>{
 const rows=rankKoreanSearch('스타벅스',[{name:'스타벅수'}, {name:'스타벅스 흑석점'}, {name:'스타벅스'}]);
 assert.equal(rows[0].name,'스타벅스');
});
