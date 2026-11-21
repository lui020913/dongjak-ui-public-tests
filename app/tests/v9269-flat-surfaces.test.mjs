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
