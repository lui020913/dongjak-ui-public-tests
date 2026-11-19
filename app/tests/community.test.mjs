import test from 'node:test';import assert from 'node:assert/strict';
import {makeCommunityPost,updateCommunityLike,appendCommunityComment,readCommunityPosts} from '../src/community-store.js';
test('새 게시글: 분류, 위치, 문구 검증',()=>{
 const p=makeCommunityPost({title:'골목길',body:'보행 공간 확인',nickname:'',category:'보행 불편',location:{lng:126.953,lat:37.49}},1234);
 assert.equal(p.category,'보행 불편');assert.equal(p.nickname,'익명 주민');assert.equal(p.location.lng,126.953);assert.equal(p.likes,0);
});
test('공감 재클릭 시 원복',()=>{
 const p=makeCommunityPost({title:'a',body:'b',category:'개선 제안'});
 const a=updateCommunityLike([p],p.id);assert.equal(a[0].likes,1);assert.equal(a[0].liked,true);
 const b=updateCommunityLike(a,p.id);assert.equal(b[0].likes,0);assert.equal(b[0].liked,false);
});
test('댓글 추가와 데이터 복원',()=>{
 const p=makeCommunityPost({title:'a',body:'b',category:'동네 질문'});
 const list=appendCommunityComment([p],p.id,'답변',42);
 assert.equal(list[0].comments[0].body,'답변');
 assert.equal(readCommunityPosts(JSON.stringify(list))[0].comments.length,1);
});
test('잘못된 저장 자료 복구',()=>{
 assert.deepEqual(readCommunityPosts('not-json'),[]);
 assert.deepEqual(readCommunityPosts('{"abc":2}'),[]);
});
