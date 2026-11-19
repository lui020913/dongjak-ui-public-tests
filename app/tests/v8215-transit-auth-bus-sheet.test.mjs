import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBusRoute,BUS_CATEGORY_LABEL} from '../src/v8215-transit-auth-bus-sheet.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('category: Seoul trunk, branch, village, metropolitan, airport, night, ambiguous',()=>{
 assert.equal(classifyBusRoute('151'),'trunk');
 assert.equal(classifyBusRoute('641'),'trunk');
 assert.equal(classifyBusRoute('650'),'trunk');
 assert.equal(classifyBusRoute('6515'),'branch');
 assert.equal(classifyBusRoute('6515','1'),'airport');
 assert.equal(classifyBusRoute('unknown','2'),'village');
 assert.equal(classifyBusRoute('5524'),'branch');
 assert.equal(classifyBusRoute('동작01'),'village');
 assert.equal(classifyBusRoute('9401'),'metro');
 assert.equal(classifyBusRoute('M5115'),'metro');
 assert.equal(classifyBusRoute('6000'),'airport');
 assert.equal(classifyBusRoute('N15'),'night');
 assert.equal(classifyBusRoute('서틀'),'unknown');
 assert.equal(BUS_CATEGORY_LABEL.unknown,'버스 유형 미확인');
});
test('auth: original bookmark click is stopped until Supabase session has user ID',()=>{
 const s=read('../src/v8215-transit-auth-bus-sheet.js');
 assert.match(s,/event\.stopImmediatePropagation\(\)/);
 assert.match(s,/client\.auth\.getSession\(\)/);
 assert.match(s,/data\?\.session\?\.user\?\.id/);
 assert.match(s,/if\(!authorized\)\{open\(\);return;\}/);
 assert.match(s,/replaying=true/);
});
test('auth: existing My Info and Kakao entry are reused',()=>{
 const s=read('../src/v8215-transit-auth-bus-sheet.js');
 assert.match(s,/\.nav-tab\[data-tab="mine"\]/);
 assert.match(s,/\.dj834-profile-card/);
 assert.match(s,/카카오로 간편로그인/);
 assert.match(s,/dj821-kakao-login/);
});
test('sheet: real grabber stays non-interactive to central swipe gesture filter',()=>{
 const s=read('../src/v8215-transit-auth-bus-sheet.js');
 const css=read('../src/v8215-transit-auth-bus-sheet.css');
 assert.match(s,/role','separator'/);
 assert.match(css,/touch-action:none!important/);
 assert.match(css,/position:sticky!important;top:0!important/);
});
test('transport-only: import links present and protected transport renderer left untouched',()=>{
 const index=read('../index.html');
 assert.match(index,/v8215-transit-auth-bus-sheet\.css/);
 assert.match(index,/v8215-transit-auth-bus-sheet\.js/);
 assert.doesNotMatch(read('../src/transport-map.js'),/classifyBusRoute/);
});
