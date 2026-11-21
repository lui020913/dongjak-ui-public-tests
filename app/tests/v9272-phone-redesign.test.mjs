import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const css=read('frontend/production/mobile-next.css');
const next=read('frontend/production/mobile-next.js');
const tab=read('app/src/bottom-tab-navigation.js');
const main=read('app/src/main.js');
const ai=read('app/src/v880-supabase-safety-ai.js');
const metro=read('app/src/transport-map.js');
const language=read('app/src/v854-language.js');
const redesign=css.split('/* v9.2.72 — single-owner phone redesign')[1];
test('phone redesign is scoped to phones with fullscreen onboarding and theme continuity',()=>{
 assert.ok(redesign?.includes('@media(max-width:699px)'));
 assert.ok(redesign.includes('.dj860-onboarding:not([hidden])'));
 assert.ok(redesign.includes('width:100vw!important;min-width:0!important;max-width:100vw!important'));
 assert.ok(redesign.includes('height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important'));
 assert.ok(redesign.includes('safe-area-inset-top'));
 assert.ok(redesign.includes('safe-area-inset-bottom'));
 assert.ok(redesign.includes('background:#192d32!important'));
 assert.ok(redesign.includes('-webkit-backdrop-filter:none!important;backdrop-filter:none!important'));
});
test('map never replaces an intermediate tab and all primary exits fade out',()=>{
 assert.ok(tab.includes('dj-tab-surface-curtain'));
 assert.ok(tab.includes("['map','route','participate','news','mine'].includes(next)"));
 assert.ok(tab.includes('duration:215'));
 assert.ok(tab.includes('duration:235'));
 assert.ok(tab.includes('replay(next)'));
 assert.ok(main.includes('fadePrimaryPageToMap(active,finish)'));
 assert.ok(main.includes('fadePrimaryPageToMap(panel,finish)'));
 assert.ok(redesign.includes('#dj-tab-surface-curtain:not([hidden])'));
 assert.ok(redesign.includes('z-index:6450!important'));
});
test('route result only offers calculated geometry, shows both endpoints, and fits whole route',()=>{
 assert.ok(next.includes("result=data[id];if(!result?.coords?.length)continue"));
 assert.ok(next.includes('route-start-label'));
 assert.ok(next.includes('route-end-label'));
 assert.ok(next.includes("doc.getElementById('route-return-map')?.click()"));
 assert.ok(redesign.includes('#route-map-card #dj804-route-compare'));
 assert.ok(redesign.includes('#route-map-card .dj9272-route-endpoints'));
 assert.ok(redesign.includes('#route-map-card .djNext-route-compare'));
 assert.ok(redesign.includes('#route-panel .route-location-row'));
});
test('alerts wrap, language remains last and old white profile block is removed',()=>{
 assert.ok(redesign.includes('#toast.show, #djNext-toast:not([hidden])'));
 assert.ok(redesign.includes('word-break:keep-all!important'));
 assert.ok(language.includes("mine.querySelector('.dj834-my-home')"));
 assert.ok(language.includes('home.append(section)'));
 assert.ok(redesign.includes('#mine-panel.page-panel:not([hidden])'));
 assert.ok(redesign.includes('#mine-panel .dj854-language-section'));
});
test('expanded layer is inset-safe and AI closes with the fullscreen fade',()=>{
 assert.ok(next.includes("/* CSS safely anchors expanded height below native status bar. */"));
 assert.ok(redesign.includes('[data-dj-layer-expanded="true"]'));
 assert.ok(redesign.includes('env(safe-area-inset-top,0px)'));
 assert.ok(redesign.includes('env(safe-area-inset-bottom,0px)'));
 assert.ok(ai.includes('},235)'));
 assert.ok(redesign.includes('dj9272-ai-leave 215ms'));
});
test('station transfer indicators are selected-only, metadata remains available on quota failures',()=>{
 assert.ok(metro.includes("panel.dataset.djMetroTransfer=badgeLines.length>1?'true':'false'"));
 assert.ok(redesign.includes('#transport-sheet[data-dj-metro-transfer="false"]'));
 assert.ok(redesign.includes('#transport-sheet[data-dj-metro-transfer="true"]'));
 assert.ok(metro.includes('dj9272-transport-icon'));
 assert.ok(metro.includes('인접역 정보가 확인되지 않았습니다'));
});
