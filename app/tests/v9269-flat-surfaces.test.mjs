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

test('base canvas remains flat while compact action controls use restrained glass',()=>{
 const shell=read('src/mobile-first-layout.css'),overlay=productionStyle('mobile-first-overhaul.css');
 const next=productionStyle('mobile-next.css'),material=read('src/button-material.css');
 assert.ok(shell.includes('--mf-surface: #ffffff'));
 for(const old of ['backdrop-filter: blur(18px)','backdrop-filter: blur(3px)','backdrop-filter: blur(2px)'])assert.equal(shell.includes(old),false,old);
 for(const old of ['backdrop-filter: blur(16px)','backdrop-filter: blur(5px)'])assert.equal(overlay.includes(old),false,old);
 assert.equal(next.includes('background:linear-gradient(180deg,var(--djNext-tool'),false);
 assert.equal(next.includes('mask-image:linear-gradient(to right'),false);
 assert.equal(material.includes('--djNext-tool-primary:linear-gradient'),false);
 assert.ok(next.includes('background:color-mix(in srgb,var(--djNext-tool-selected-face) 86%,transparent)!important'));
 assert.ok(next.includes('backdrop-filter:blur(11px) saturate(1.18)!important'));
 assert.ok(next.includes('backdrop-filter:blur(13px) saturate(1.15)!important'));
 assert.ok(next.includes('background:color-mix(in srgb,var(--djNext-tool-face) 82%,transparent)!important'));
 assert.doesNotMatch(next,/#transport-title:has\([^}]*border:2px solid var\(--dj9272-ink\)/);
});

test('ordinary sheets do not dim navigation; permission consent remains isolated',()=>{
 const css=productionStyle('mobile-next.css');
 assert.equal(css.includes('filter:brightness(.66)'),false);
 assert.equal(css.includes('background:rgba(19,40,32,calc(.4'),false);
 assert.ok(css.includes('#djNext-permissions:not([hidden])'));
 assert.ok(css.includes('box-shadow:0 5px 18px rgba(18,42,34,.12)'));
});


test('phone search, AI and small action controls use restrained glass without panel scrims',()=>{
 const next=productionStyle('mobile-next.css');
 const block=next.split('/* Map search and AI keep their soft phone surfaces')[1]?.split('/* v9.2.72 — one mobile visual system')[0];
 assert.ok(block,'v9.2.71 scoped header treatment missing from the shipped build source');
 assert.ok(block.includes('@media(max-width:699px)'));
 assert.ok(block.includes('.topbar .map-quick-search-form'));
 assert.ok(block.includes('.topbar .header-tools > #dj890-ai-orb'));
 assert.ok(block.includes('background:rgba(255,255,255,.84)!important;'));
 assert.ok(block.includes('background:rgba(35,38,44,.90)!important;'));
 assert.ok(block.includes('background:rgba(12,130,107,.91)!important;'));
 assert.ok(block.includes('background:rgba(51,57,67,.94)!important;'));
 assert.equal((block.match(/backdrop-filter:blur\(9px\)/g)||[]).length,4);
 assert.ok(block.includes('#dj-ios-pwa-map-seam'));
 assert.ok(block.includes('var(--dj-pwa-native-edge)'));
 for(const forbidden of ['.dj860-onboarding','.page-panel','.djNext-modal-body','background:rgba(12,30,25,.48)']){
  assert.equal(block.includes(forbidden),false,'unintended soft/scrim surface '+forbidden);
 }
});

test('v9.2.72 full-screen phone tour, real route comparison and safe-area layers are installed',()=>{
 const css=productionStyle('mobile-next.css');
 const js=productionStyle('mobile-next.js');
 const nav=read('src/bottom-tab-navigation.js');
 const buildApply=new URL('../../scripts/apply-mobile-next.mjs',import.meta.url);
 // The sealed mobile build copies app/ only, so the parent scripts/ folder
 // deliberately does not exist in the isolated release test workspace.
 const hasSourceScript=existsSync(buildApply);
 const main=read('src/main.js');
 const block=css.split('/* v9.2.72 — one mobile visual system')[1];
 assert.ok(block,'expected final v9.2.72 phone UI stylesheet');
 for(const expected of ['.dj860-onboarding:not([hidden])','.dj860-card','height:100dvh!important','--dj9272-page','.page-panel.dj-tab-content-enter:not([hidden])','djTabContentReveal','#route-map-card #dj804-route-compare{display:none','#route-map-card .dj9272-route-points','#djNext-route-compare','#djNext-layer-panel .djNext-layer-scroll','.metro-arrival-countdown']){
  assert.ok(block.includes(expected)||css.includes(expected),expected);
 }
 assert.ok(!css.includes('.dj854-language-section{order:99!important;display:block!important'),'no production orphan language card');
 assert.ok(!js.includes('host.append(language)'),'no production language-row reparenting');
 assert.ok(js.includes("export function installV9272PhoneExperience"));
 assert.ok(read('src/route-experience-20261123.js').includes("actions?.before(choices)"));
 assert.equal(js.includes("button.insertAdjacentHTML('afterbegin',phoneIcon(key))"),false);
 assert.ok(js.includes("Math.max(96,Math.round(win.innerHeight*.12))"));
 if(hasSourceScript){
  const apply=readFileSync(buildApply,'utf8');
  assert.ok(apply.includes('installV9272PhoneExperience({app});'));
 }else{
  assert.ok(main.includes('installV9272PhoneExperience({app});'),'sealed app must contain the injected phone initializer');
 }
 assert.ok(main.includes("window.addEventListener('dj-next:fit-route'"));
 const aiMotion=read('src/v880-supabase-safety-ai.css');
 assert.match(aiMotion,/dj9251-ai-content-enter/);
 assert.match(aiMotion,/dj9251-ai-content-leave/);
 assert.doesNotMatch(css,/dj9272AiIn|dj9272AiOut|dj9272-ai-leave/);
 assert.equal(nav.includes('doc.startViewTransition'),false);
 assert.match(nav,/if\(!replay\(button\)\)\{[^}]*return;/);
 assert.match(css,/\.page-panel\.dj-tab-content-enter:not\(\[hidden\]\)/);
 assert.equal(nav.includes("ensureCurtain()"),false);
 assert.ok(!block.includes('filter:brightness(.66)'));
});


test('walking routes reuse the native selection and do not invent four extra alternatives',()=>{
 const js=productionStyle('mobile-next.js');
 const route=read('src/route-experience-20261123.js');
 const css=read('src/route-experience.css');
 assert.ok(!js.includes("cards.append(b)"));
 assert.ok(route.includes("const available=equal?[items[0]]:items;"));
 assert.ok(route.includes("native.click();"));
 assert.ok(route.includes("routeComparisonItems(latest)"));
 assert.ok(css.includes("#route-map-card #route-guide-start"));
 assert.ok(css.includes("#dj-route-turn-banner"));
});

