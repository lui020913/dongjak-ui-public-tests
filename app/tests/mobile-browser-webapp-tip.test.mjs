import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webAppInstallSteps,shouldOfferWebApp,
  WEBAPP_TIP_STORAGE_KEY,WEBAPP_TIP_SNOOZE_MS} from '../src/mobile-browser-webapp-tip.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('only ordinary mobile browser sessions are eligible for install advice',()=>{
  assert.equal(shouldOfferWebApp({mode:'browser',now:100,dismissedUntil:0}),true);
  for(const mode of ['pwa','native','desktop']){
    assert.equal(shouldOfferWebApp({mode,now:100,dismissedUntil:0}),false);
  }
  assert.equal(shouldOfferWebApp({mode:'browser',now:100,dismissedUntil:101}),false);
  assert.equal(shouldOfferWebApp({mode:'browser',now:101,dismissedUntil:101}),true);
});
test('iOS Safari steps describe the supported Home Screen web-app workflow',()=>{
  const text=webAppInstallSteps('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1').join(' ');
  assert.match(text,/Safari/);
  assert.match(text,/공유/);
  assert.match(text,/홈 화면에 추가/);
  assert.match(text,/웹 앱으로 열기/);
});
test('iOS Chrome and Android Chrome receive different, truthful instructions',()=>{
  const iphone=webAppInstallSteps('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 CriOS/130.0.0.0 Mobile/15E148 Safari/604.1').join(' ');
  assert.match(iphone,/공유/);
  assert.doesNotMatch(iphone,/Safari에서 공유 메뉴/);
  const android=webAppInstallSteps('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36').join(' ');
  assert.match(android,/더보기/);
  assert.match(android,/홈 화면에 추가/);
});
test('No nagging: 30-day cooldown and hidden, accessible suggestion controls',()=>{
  assert.equal(WEBAPP_TIP_STORAGE_KEY,'dj-browser-webapp-hint-snooze-v1');
  assert.equal(WEBAPP_TIP_SNOOZE_MS,30*24*60*60*1000);
  const js=read('src/mobile-browser-webapp-tip.js');
  assert.match(js,/card\.hidden=true/);
  assert.match(js,/card.setAttribute\('role','region'\)/);
  assert.match(js,/setItem\(WEBAPP_TIP_STORAGE_KEY/);
  assert.match(js,/BLOCKING_SURFACES/);
  assert.match(js,/djWebappTipVisible/);
  assert.match(read('src/mobile-browser-webapp-tip.css'),/#dj840-map-tip/);
  assert.match(js,/data-tab/);
  assert.match(read('src/mobile-browser-webapp-tip.css'),/html\[data-dj-run-mode="browser"\]/);
});
