import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewPlaceKey,validateReview} from '../src/v834-place-reviews.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const info=read('src/v834-my-info.js');
const reviews=read('src/v834-place-reviews.js');
const popup=read('src/place-details.js');
const rls=read('supabase/place_reviews.sql');
test('More lists every feature with one visible top-shortcut toggle, no duplicate pin/editor',()=>{
 assert.match(toolbar,/const group=FEATURES\.filter\(f=>!used\.has\(f\[0\]\)&&test\(f\[0\]\)\)/);
 assert.match(toolbar,/input\.type='checkbox'/);
 assert.match(toolbar,/input\.checked=!MORE_ONLY_KEYS\.has\(key\)&&isPrimary\(key\)/);
 assert.doesNotMatch(toolbar,/pin\.textContent='밖으로'/);
 assert.doesNotMatch(toolbar,/editor\.innerHTML/);
 assert.match(read('src/v834-toolbar-settings.css'),/\.dj834-shortcut-switch input:checked/);
});
test('Expanded width follows text measurement with no 126px minimum',()=>{
 assert.match(toolbar,/ctx\.measureText\(label\)\.width/);
 assert.match(toolbar,/Math\.max\(70,Math\.min\(cap,pixels\+46\)\)/);
 assert.match(read('src/v834-toolbar-settings.css'),/min-width:var\(--dj833-expanded-width,94px\)!important/);
});
test('My Info label and menu reuse active cloud account and settings handlers',()=>{
 assert.match(html,/<span>내 정보<\/span><\/button>/);
 assert.match(html,/<h2>내 정보<\/h2>/);
 assert.match(info,/const account=panel\.querySelector\('#dj824-account'\)/);
 for(const item of ['내 프로필 설정','글자 크기·굵기','지도·도보 설정','즐겨찾기 · 내 기록'])assert.ok(info.includes(item));
 assert.doesNotMatch(info,/data-dj834-action="theme"/);
 assert.doesNotMatch(info,/지도 &amp; 이동|도보 길찾기|대중교통 지도 표시/);
 assert.match(info,/data-dj834-action="map"/);
 assert.match(info,/data-dj834-action="history"/);
 assert.match(info,/\.dj824-account-toggle/);
 assert.match(info,/data-manage-tab="profile"/);
});
test('Reviews are available at every place popup and save text securely',()=>{
 assert.match(popup,/installPlaceReviews\(body,p\)/);
 for(const item of ['리뷰 작성','공개 리뷰 등록','별점 선택','작성 내용은 유지됩니다','place_reviews'])assert.ok(reviews.includes(item));
 assert.match(reviews,/reviewBody=makeElement\('p',null,clean\(record\.body\)\)/);
 assert.match(reviews,/reviewBody\.dataset\.djNoTranslate/);
 assert.match(reviews,/card\.append\(header,reviewBody\)/);
 assert.match(reviews,/\.upsert\(payload,\{onConflict:'place_key,user_id'\}\)/);
 assert.match(reviews,/\.select\('id'\)\.single\(\)/);assert.doesNotMatch(reviews,/localWrite\(/);
 assert.equal(reviewPlaceKey({name:'중앙대학교',lng:126.9570056,lat:37.5040056}),'중앙대학교|126.95701,37.50401');
 assert.equal(validateReview(5,'실제 시설 방문 후 작성한 리뷰입니다.'),'');
 assert.match(validateReview(0,'정상 리뷰'),/별점/);
 assert.match(validateReview(4,'짧음'),/5자/);
});
test('Shared review database is restricted by authenticated RLS for writes',()=>{
 assert.match(rls,/enable row level security/);
 assert.match(rls,/for insert to authenticated with check \(auth\.uid\(\)=user_id\)/);
 assert.match(rls,/for update to authenticated using \(auth\.uid\(\)=user_id\)/);
 assert.match(rls,/for select to anon,authenticated using \(true\)/);
 assert.doesNotMatch(rls,/service_role/);
});
