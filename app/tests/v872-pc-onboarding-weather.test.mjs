import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('onboarding swipe tracking does not capture pointers and keeps native touch scrolling',()=>{
 const js=read('src/v860-onboarding.js'),css=read('src/v860-onboarding.css');
 assert.equal(js.includes('setPointerCapture'),false);
 assert.ok(js.includes('function onPointerDown(event)'));
 assert.ok(js.includes('pointercancel'));
 assert.ok(js.includes('swipeClickUntil'));
 assert.ok(css.includes('touch-action:pan-y'));
});
test('onboarding uses the same mobile-first presentation instead of a PC-only stylesheet',()=>{
 const html=read('index.html'),main=read('src/main.js'),css=read('src/mobile-first-layout.css');
 assert.equal(html.includes('v872-pc-onboarding-weather.css'),false);
 assert.ok(main.includes("import './mobile-first-layout.css'"));
 assert.ok(css.includes('@media (min-width: 700px)'));
 assert.match(html,/<script\s+type="module"\s+src="\/src\/v860-onboarding\.js"><\/script>/);
 assert.ok(read('src/v860-onboarding.js').includes('ONBOARDING_IMAGE_SLOTS'));
 assert.ok(css.includes('prefers-reduced-motion'));
});

function jsHasSharedOnboarding(html,js){
 return html.includes('v860-onboarding.js')&&js.includes('ONBOARDING_IMAGE_SLOTS');
}

test('weather sheet and temperature badge are shared across mobile tablet and desktop',()=>{
 const weather=read('src/v854-weather-desktop.js'),html=read('index.html'),css=read('src/mobile-first-layout.css');
 assert.ok(weather.includes("matchMedia('(min-width: 0px)')"));
 assert.ok(weather.includes('dj854-weather-sheet'));
 assert.ok(html.includes('data-dj-weather-icon'));
 assert.ok(html.includes('data-dj-temperature'));
 assert.ok(css.includes('#dj854-weather-sheet:not([hidden])'));
 assert.equal(html.includes('v872-pc-onboarding-weather.css'),false);
});
