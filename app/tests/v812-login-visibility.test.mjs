import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('v8.1.2: account action is above saved groups in My Records',()=>{
  const source=read('src/v815-map-product.js');
  assert.match(source,/const accountSlot=el\('div','dj824-account-slot'\);myBox\.append\(accountSlot\)/);
  assert.match(source,/installFavoritesCloud\(\{root:accountSlot\}\)/);
  assert.ok(source.indexOf('installFavoritesCloud({root:accountSlot})')<source.indexOf('myBox.append(groupBar,groupStatus)'));
  assert.match(read('index.html'),/id="mine-panel"/);
});

test('v8.1.2: unauthenticated UI always creates visible login action even without server configuration',()=>{
  const source=read('src/v824-favorites-cloud.js');
  assert.match(source,/toggle\.textContent='로그인'/);
  assert.match(source,/header\.append\(title,toggle\)/);
  assert.match(source,/section\.append\(header,status,details\)/);
  assert.match(source,/if\(!config\.configured\)\{/);
  assert.match(source,/authPanel\.hidden=true;accountPanel\.hidden=true;instructions\.hidden=false/);
  assert.doesNotMatch(source,/if\(!config\.configured\)return\s+null/);
});

test('v8.1.2: login button exposes email auth only when requested and CSS honors hidden attribute',()=>{
  const source=read('src/v824-favorites-cloud.js');
  const css=read('src/v824-favorites.css');
  assert.match(source,/toggle\.setAttribute\('aria-expanded',String\(willOpen\)\)/);
  // v8.2.4: desktop may autofocus, while iOS mobile must not auto-zoom/scroll.
  assert.match(source,/if\(willOpen&&config\.configured&&!user&&window\.matchMedia/);
  assert.match(css,/\.dj824-account-details\[hidden\],#app \.dj824-account-details \[hidden\]\{display:none!important\}/);
  assert.match(css,/#app#app #dj824-account \.dj824-account-toggle/);
});

test('v8.1.2: no secret keys included and version log records login UI fix',()=>{
  assert.doesNotMatch(read('src/v824-favorites-cloud.js'),/sb_secret_[\w-]+/);
  const history=JSON.parse(read('src/app-release-log.json'));
  const loginRelease=history.releases.find(entry=>entry.version==='8.1.2');
  assert.ok(loginRelease,'the original v8.1.2 release must remain in history');
  assert.match(loginRelease.items.join(' '),/로그인 버튼/);
});
