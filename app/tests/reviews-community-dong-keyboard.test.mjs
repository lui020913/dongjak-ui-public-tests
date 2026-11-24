import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMMUNITY_DONGS,makeCommunityPost,readCommunityPosts} from '../src/community-store.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('official 15 dong options are distinct and optional for legacy posts',()=>{
 assert.equal(COMMUNITY_DONGS.length,15);
 assert.equal(new Set(COMMUNITY_DONGS).size,15);
 for(const dong of COMMUNITY_DONGS){
   const p=makeCommunityPost({title:'테스트',body:'분류 확인',dong});
   assert.equal(p.dong,dong);
   assert.equal(readCommunityPosts(JSON.stringify([p]))[0].dong,dong);
 }
 assert.equal(makeCommunityPost({title:'기존 글',body:'지역 없음'}).dong,null);
 assert.equal(makeCommunityPost({title:'잘못된 분류',body:'확인',dong:'강남구'}).dong,null);
 assert.equal(readCommunityPosts(JSON.stringify([{id:'old',title:'기존',body:'본문'}]))[0].dong,null);
});
test('district selection goes through moderated publication and feed filtering',()=>{
 const html=read('index.html'),main=read('src/main.js'),cloud=read('src/community-cloud.js'),edge=read('supabase/functions/community-moderation/index.ts');
 for(const dong of COMMUNITY_DONGS)assert.ok(html.includes('<option>'+dong+'</option>'));
 assert.match(html,/id="community-dong-filter"/);
 assert.match(main,/!dongFilter\|\|p\.dong===dongFilter/);
 assert.match(cloud,/dong:p\.dong\|\|null/);
 assert.match(cloud,/dong:row\.dong\|\|null/);
 assert.match(edge,/!dongs\.has\(p\.dong\)/);
 assert.match(edge,/dong:p\.dong\|\|null/);
});
test('review mutations require the current authenticated user and review ID',()=>{
 const reviews=read('src/v834-place-reviews.js'),mine=read('src/v834-my-info.js');
 assert.match(reviews,/user\.is_anonymous/);
 assert.match(reviews,/\.delete\(\)\.eq\('id',id\)\.eq\('user_id',user\.id\)/);
 assert.match(reviews,/\.update\([^\n]+\.eq\('id',editingId\)\.eq\('user_id',session\.user\.id\)/);
 assert.match(reviews,/ownIds\.has\(record\.id\)/);
 assert.match(mine,/await readMyPlaceReviews\(\)/);
 assert.match(mine,/history:true,onChange:/);
});
test('review keyboard editor is separate from map and disposed on popup close',()=>{
 const review=read('src/v834-place-reviews.js'),css=read('src/v834-place-reviews.css'),place=read('src/place-details.js');
 assert.match(review,/doc\.body\.append\(host\)/);
 assert.match(review,/win\.visualViewport\?\.addEventListener\('resize',sync/);
 assert.match(review,/win\.visualViewport\?\.removeEventListener\('resize',sync/);
 assert.match(place,/reviewController\?\.close\(\)/);
 assert.match(css,/data-dj-review-editor="open"\] #bottom-nav\{display:none!important/);
});
test('comment actions share a shape and dock stays hidden during comment keyboard input',()=>{
 const main=read('src/main.js'),css=read('src/community-composer-portal.css');
 assert.match(main,/community-comment-form input\[type=text\]/);
 assert.match(main,/community-comment-submit/);
 assert.match(main,/dj-community-comment-keyboard/);
 assert.match(css,/:is\(\.community-comment-submit,\.community-comment-photo\)/);
 assert.match(css,/input\[type=text\]:focus\{\s*outline:none!important;box-shadow:none!important/);
 assert.match(css,/dj-community-comment-keyboard #bottom-nav\{display:none!important/);
});