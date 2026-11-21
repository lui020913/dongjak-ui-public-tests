import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('phone startup and iOS PWA status edge use flat native-matched fills',()=>{
 const html=read('index.html'),status=read('src/mobile-pwa-status-tone-v793.css');
 assert.doesNotMatch(html,/background:radial-gradient\\(ellipse at 50% 39%/);
 assert.doesNotMatch(html,/background:linear-gradient\\(180deg,var\\(--start-bg\\)/);
 assert.match(html,/background:var\\(--start-bg\\)!important/);
 assert.match(status,/height:env\\(safe-area-inset-top,0px\\)!important/);
 assert.doesNotMatch(status,/linear-gradient\\(to bottom/);
 assert.match(status,/#dj-ios-pwa-status-bridge\\{[\\s\\S]*?display:none!important/);
});

test('onboarding shows clear content rather than blurring or darkening the map',()=>{
 const css=read('src/v860-onboarding.css');
 assert.match(css,/#app \\.dj860-onboarding\\{[\\s\\S]*?background:transparent!important/);
 assert.doesNotMatch(css,/backdrop-filter:blur\\(12px\\)/);
 assert.doesNotMatch(css,/background:linear-gradient\\(145deg/);
 assert.match(css,/box-shadow:0 7px 22px rgba\\(0,0,0,\\.12\\)/);
});

test('mobile dock, toolbar and phone primary controls use flat materials',()=>{
 const shell=read('src/mobile-first-layout.css');
 const overlay=read('../frontend/production/mobile-first-overhaul.css');
 const next=read('../frontend/production/mobile-next.css');
 const material=read('src/button-material.css');
 assert.match(shell,/--mf-surface: #ffffff/);
 assert.doesNotMatch(shell,/backdrop-filter: blur\\((?:18|3|2)px\\)/);
 assert.doesNotMatch(overlay,/backdrop-filter: blur\\((?:16|5)px\\)/);
 assert.doesNotMatch(next,/background:linear-gradient\\(180deg,var\\(--djNext-tool/);
 assert.doesNotMatch(next,/mask-image:linear-gradient\\(to right/);
 assert.doesNotMatch(material,/--djNext-tool-primary:linear-gradient/);
 assert.match(next,/background:var\\(--djNext-tool-selected-face\\)!important/);
});

test('noncritical sheets have no dimmer while consent is still guarded',()=>{
 const css=read('../frontend/production/mobile-next.css');
 assert.doesNotMatch(css,/filter:brightness\\(\\.66\\)/);
 assert.doesNotMatch(css,/background:rgba\\(19,40,32,calc\\(\\.4/);
 assert.match(css,/#djNext-permissions:not\\(\\[hidden\\]\\)/);
 assert.match(css,/box-shadow:0 5px 18px rgba\\(18,42,34,\\.12\\)/);
});
