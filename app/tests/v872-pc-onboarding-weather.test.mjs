import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('onboarding tour does not capture pointers and remains touch and mouse operable',()=>{
 const js=read('src/v860-onboarding.js');
 assert.match(js,/setPointerCapture/);
 assert.match(js,/pointercancel/);
 assert.match(js,/touch-action/);
});

test('onboarding uses the same mobile-first presentation instead of a PC-only stylesheet',()=>{
 const html=read('index.html'),main=read('src/main.js'),css=read('src/mobile-first-layout.css');
 assert.equal(html.includes('v872-pc-onboarding-weather.css'),false);
 assert.ok(main.includes("import './mobile-first-layout.css'"));
 assert.ok(css.includes('@media (min-width: 700px)'));
 assert.ok(jsHasSharedOnboarding(html,read('src/v860-onboarding.js')));
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
