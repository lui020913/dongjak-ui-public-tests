import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const auth=source('src/v824-favorites-cloud.js');
const html=source('index.html');
const css=source('src/v820-account-center.css');
test('v8.2.0 offers password sign-in, signup, magic-link and password reset',()=>{
  for(const name of ['signInWithPassword','signUp','signInWithOtp','resetPasswordForEmail'])assert.match(auth,new RegExp(name));
  assert.match(auth,/shouldCreateUser:false/);
  assert.match(auth,/password\.value\.length<8/);
  assert.match(auth,/password\.value!==pwConfirm\.value/);
});
test('v8.2.1 supports Kakao OAuth sign-in and current-user identity linking',()=>{
  assert.match(auth,/signInWithOAuth/);assert.match(auth,/linkIdentity/);
  assert.match(auth,/redirectTo:redirectUrl\(\)/);
  assert.match(auth,/provider:'kakao'/);
  assert.match(auth,/카카오로 계속하기/);
  assert.match(auth,/현재 계정에 카카오 연결/);
});
test('v8.2.0 account screens handle profile, password, email and logout',()=>{
  assert.match(auth,/auth\.updateUser\(\{data:\{display_name:name\}\}\)/);
  assert.match(auth,/auth\.updateUser\(\{password:newPassword\.value\}\)/);
  assert.match(auth,/auth\.updateUser\(\{email\}\)/);
  assert.match(auth,/auth\.signOut\(\)/);
  for(const key of ['profile','security','identities'])assert.ok(auth.includes(`['${key}'`)||auth.includes(`,'${key}'`));
  assert.doesNotMatch(auth,/localStorage\.setItem\([^\n]*(?:password|client_secret|service_role)/i);
});
test('v8.2.0 mobile panels own their close control within their heading',()=>{
  for(const type of ['participation-panel','mine-panel']){
    const start=html.indexOf(`<main id="${type}"`);const rest=html.slice(start,start+1200);
    assert.ok(start>=0,type);
    assert.match(rest,/<header class="dj-sheet-chrome"[\s\S]*?<button type="button" class="dj-sheet-chrome-close page-dismiss"/);
  }
  assert.match(css,/#route-panel,#participation-panel,#news-panel,#mine-panel/);
  assert.match(css,/right:0!important;left:auto!important/);
  assert.match(html,/href="\/src\/v820-account-center\.css"/);
});
test('v8.2.0 account hub has accessible grouped controls and hidden state',()=>{
  assert.match(auth,/aria-label','로그인 방식/);
  assert.match(auth,/aria-label','계정 관리 메뉴/);
  assert.match(css,/\.dj824-account-details \[hidden\]\{display:none!important\}/);
  assert.match(css,/data-theme="dark"/);
});
