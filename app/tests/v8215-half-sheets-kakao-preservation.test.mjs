import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');

test('Home-half-sheets branch remains intact with My Info and home-center nav', () => {
  const html = read('index.html');
  const nav = html.match(/<nav id="bottom-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  assert.deepEqual([...nav.matchAll(/data-tab="([^"]+)"/g)].map(match => match[1]), ['route', 'participate', 'map', 'news', 'mine']);
  assert.match(nav, /<span>내 정보<\/span>/);
  assert.match(html, /v833-home-sheet-layout\.css/);
  assert.match(html, /v833-home-reset\.js/);
  assert.match(html, /v834-my-info\.css/);
  assert.match(html, /v834-my-info\.js/);
  assert.match(read('src/v833-home-sheet-layout.css'), /max-height:min\(50dvh/);
});

test('Kakao OAuth diagnostics and overlapping-grant protection are preserved', () => {
  const source = read('src/v824-favorites-cloud.js');
  assert.match(source, /getActiveCloudClient\(\)/);
  assert.match(source, /sharedCloudClient=client/);
  assert.match(source, /if\(kakaoSignIn\.disabled\|\|kakaoFallback\.disabled\|\|linkKakao\.disabled\)return/);
  assert.match(source, /logs\/auth-logs/);
  assert.match(source, /if\(response\.error\)throw response\.error/);
  assert.match(read('index.html'), /v833-home-reset\.js/);
});

test('Facilities expose review flow, retaining branch map and panel controllers', () => {
  assert.match(read('src/place-details.js'), /installPlaceReviews\(body,p\)/);
  assert.match(read('src/v834-place-reviews.js'), /getActiveCloudClient/);
  assert.match(read('src/dj-v8212-sheet-controller.js'), /MOBILE_FLOATING_SHEETS/);
  assert.match(read('src/v833-home-reset.js'), /DEFAULT_BASE_LAYERS/);
  assert.match(read('src/v834-toolbar-settings.css'), /dj834-shortcut-switch/);
});
