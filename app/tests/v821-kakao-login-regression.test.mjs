import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const auth=read('src/v824-favorites-cloud.js');
const css=read('src/v820-account-center.css');
const releases=JSON.parse(read('src/app-release-log.json')).releases;
test('v8.2.1 uses Kakao OAuth for sign-in and linking, not Google buttons',()=>{
  assert.match(auth,/provider:'kakao'/);
  assert.match(auth,/client\.auth\.linkIdentity/);
  assert.match(auth,/client\.auth\.signInWithOAuth/);
  assert.match(auth,/redirectTo:redirectUrl\(\)/);
  assert.match(auth,/카카오로 계속하기/);
  assert.match(auth,/현재 계정에 카카오 연결/);
  assert.doesNotMatch(auth,/signInWithGoogle|googleSignIn|linkGoogle|Google로 계속하기/);
});
test('v8.2.1 keeps existing account identity and favorites on provider link',()=>{
  assert.match(auth,/if\(linkExisting&&!user\)/);
  assert.match(auth,/incoming\?\.id===user\?\.id\)\{user=incoming;updateUI\(\);publishAuthState\(incoming\);return;/);
  assert.match(auth,/linkKakao\.hidden=names\.includes\('kakao'\)/);
  assert.match(auth,/user_favorite_state/);
  assert.match(auth,/replaceFavoritesSnapshot/);
});
test('v8.2.1 Kakao button uses readable theme colors and never embeds secrets',()=>{
  assert.match(css,/\.dj821-kakao-login/);
  assert.match(css,/#FEE500/);
  assert.match(css,/#191919/);
  assert.doesNotMatch(auth,/sb_secret_[A-Za-z0-9]|client_secret\s*[:=]\s*['"][A-Za-z0-9]/i);
});
test('v8.2.1 Kakao release remains available as history after subsequent fixes',()=>{
  assert.equal(releases[0].version,JSON.parse(read('package.json')).version);
  const kakao = releases.find(r=>r.previousVersion==='8.2.1');
  const accounts = releases.find(r=>r.previousVersion==='8.2.0');
  assert.ok(kakao && accounts && releases.indexOf(kakao) < releases.indexOf(accounts));
  assert.match(kakao.originalItems.join(' '),/카카오/);
});
