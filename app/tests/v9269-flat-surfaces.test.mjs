import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const productionStyle=name=>{
 const generated=new URL('../src/'+name,import.meta.url);
 const original=new URL('../../frontend/production/'+name,import.meta.url);
 return readFileSync(existsSync(generated)?generated:original,'utf8');
};

test('phone startup and iOS PWA status edge use flat native-matched fills',()=>{
 const html=read('index.html'),status=read('src/mobile-pwa-status-tone-v793.css');
 for(const old of ['background:radial-gradient(ellipse','background:linear-gradient(180deg,var(--start-bg)'])assert.equal(html.includes(old),false,old);
 assert.ok(html.includes('background:var(--start-bg)!important'));
 assert.ok(status.includes('height:env(safe-area-inset-top,0px)!important'));
 assert.equal(status.includes('linear-gradient(to bottom'),false);
 assert.ok(status.includes('display:none!important;position:fixed!important;inset:0 0 auto!important'));
});

test('onboarding no longer blurs, dims or gradients its backdrop',()=>{
 const css=read('src/v860-onboarding.css');
 assert.ok(css.includes('background:transparent!important;'));
 for(const old of ['backdrop-filter:blur(12px)','background:linear-gradient(145deg'])assert.equal(css.includes(old),false,old);
 assert.ok(css.includes('box-shadow:0 7px 22px rgba(0,0,0,.12)'));
 // The later-loaded v8.6.4 stylesheet has a higher-specificity !important
 // selector; checking only the original v8.6.0 file misses iPhone regressions.
 const legacy=read('src/v864-refinements.css');
 assert.ok(legacy.includes('html body #app#app#app#app .dj860-onboarding'));
 assert.ok(legacy.includes('overflow:hidden!important;background:transparent!important;'));
 assert.ok(legacy.includes('-webkit-backdrop-filter:none!important;backdrop-filter:none!important;'));
 assert.ok(legacy.includes('box-shadow:0 7px 22px rgba(8,34,25,.12)!important;'));
 assert.ok(legacy.includes('touch-action:pan-y!important;background:#e9f3ed!important;'));
 assert.ok(legacy.includes('background:#263d39!important;'));
 for(const old of ['background:rgba(12,30,25,.48)','backdrop-filter:blur(5px)','linear-gradient(145deg,#eef7f1,#e0eee6)','0 22px 72px rgba(8,34,25,.28)']){
  assert.equal(legacy.includes(old),false,'legacy onboarding effect still active: '+old);
 }
});

test('dock toolbar and controls have solid flat backgrounds',()=>{
 const shell=read('src/mobile-first-layout.css'),overlay=productionStyle('mobile-first-overhaul.css');
 const next=productionStyle('mobile-next.css'),material=read('src/button-material.css');
 assert.ok(shell.includes('--mf-surface: #ffffff'));
 for(const old of ['backdrop-filter: blur(18px)','backdrop-filter: blur(3px)','backdrop-filter: blur(2px)'])assert.equal(shell.includes(old),false,old);
 for(const old of ['backdrop-filter: blur(16px)','backdrop-filter: blur(5px)'])assert.equal(overlay.includes(old),false,old);
 assert.equal(next.includes('background:linear-gradient(180deg,var(--djNext-tool'),false);
 assert.equal(next.includes('mask-image:linear-gradient(to right'),false);
 assert.equal(material.includes('--djNext-tool-primary:linear-gradient'),false);
 assert.ok(next.includes('background:var(--djNext-tool-selected-face)!important'));
});

test('ordinary sheets do not dim navigation; permission consent remains isolated',()=>{
 const css=productionStyle('mobile-next.css');
 assert.equal(css.includes('filter:brightness(.66)'),false);
 assert.equal(css.includes('background:rgba(19,40,32,calc(.4'),false);
 assert.ok(css.includes('#djNext-permissions:not([hidden])'));
 assert.ok(css.includes('box-shadow:0 5px 18px rgba(18,42,34,.12)'));
});


test('v9.2.71 permits soft glass ONLY on phone search and AI, plus native status-edge color fade',()=>{
 const next=productionStyle('mobile-next.css');
 const block=next.split('/* v9.2.71 — the ONLY translucent/soft phone surfaces')[1]?.split('/* v9.2.72 — one mobile visual system')[0];
 assert.ok(block,'v9.2.71 scoped header treatment missing from the shipped build source');
 assert.ok(block.includes('@media(max-width:699px)'));
 assert.ok(block.includes('.topbar .map-quick-search-form'));
 assert.ok(block.includes('.topbar .header-tools > #dj890-ai-orb'));
 assert.ok(block.includes('background:rgba(255,255,255,.84)!important;'));
 assert.ok(block.includes('background:rgba(29,48,48,.82)!important;'));
 assert.ok(block.includes('background:rgba(12,130,107,.91)!important;'));
 assert.ok(block.includes('background:rgba(35,94,78,.88)!important;'));
 assert.equal((block.match(/backdrop-filter:blur\(9px\)/g)||[]).length,4);
 assert.ok(block.includes('#dj-ios-pwa-map-seam'));
 assert.ok(block.includes('var(--dj-pwa-native-edge)'));
 for(const forbidden of ['.dj860-onboarding','.page-panel','.bottom-nav','.djNext-modal-body','background:rgba(12,30,25,.48)']){
  assert.equal(block.includes(forbidden),false,'unintended soft/scrim surface '+forbidden);
 }
});

test('v9.2.72 full-screen phone tour, real route comparison and safe-area layers are installed',()=>{
 const css=productionStyle('mobile-next.css');
 const js=productionStyle('mobile-next.js');
 const nav=read('src/bottom-tab-navigation.js');
 const apply=readFileSync(new URL('../../scripts/apply-mobile-next.mjs',import.meta.url),'utf8');
 const main=read('src/main.js');
 const block=css.split('/* v9.2.72 — one mobile visual system')[1];
 assert.ok(block,'expected final v9.2.72 phone UI stylesheet');
 for(const expected of ['.dj860-onboarding:not([hidden])','.dj860-card','height:100dvh!important','--dj9272-page','#dj-tab-surface-curtain','.dj9272-tab-leave','.dj9272-tab-enter','#route-map-card #dj804-route-compare{display:none','#route-map-card .dj9272-route-points','#djNext-route-compare','#mine-panel .dj854-language-section','#djNext-layer-panel .djNext-layer-scroll','dj-metro-line-selector + .dj-metro-line-selector','dj9272AiIn','dj9272AiOut']){
  assert.ok(block.includes(expected)||css.includes(expected),expected);
 }
 assert.ok(js.includes("export function installV9272PhoneExperience"));
 assert.ok(js.includes("win.dispatchEvent(new Event('dj-next:fit-route'))"));
 assert.ok(js.includes("transport.dataset.dj9272Transfer"));
 assert.ok(js.includes("Math.max(96,Math.round(win.innerHeight*.12))"));
 assert.ok(apply.includes('installV9272PhoneExperience({app});'));
 assert.ok(main.includes("window.addEventListener('dj-next:fit-route'"));
 assert.ok(nav.includes("previous.classList.add('dj9272-tab-leave')")||nav.includes("previous)previous.classList.add('dj9272-tab-leave')"));
 assert.ok(nav.includes("protectPageTransition(nextTab)"));
 assert.ok(!block.includes('filter:brightness(.66)'));
});
