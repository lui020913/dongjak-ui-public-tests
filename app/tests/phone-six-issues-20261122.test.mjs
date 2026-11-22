import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptLighting,parseImport,segmentScore,observedFactorScore} from '../src/pri-data.mjs';

const source=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
const data=file=>JSON.parse(readFileSync(new URL('../public/data/pri/'+file,import.meta.url),'utf8'));

test('three-source risk composite includes only real overlapping observations, not modeled defaults',()=>{
 const lighting=adaptLighting(data('lighting_segments.json'));
 const accident=data('sangdo1_accidents_factor.json');
 const protection=data('sangdo1_protection_gap_2factor_factor.json');
 const bundle=parseImport(protection,parseImport(accident,lighting));
 const evaluated=bundle.segments.filter(s=>segmentScore(bundle,s,'pri3')!==null);
 const unobserved=bundle.segments.filter(s=>segmentScore(bundle,s,'pri3')===null);
 assert.equal(bundle.segments.length,1686);
 assert.equal(evaluated.length,76,'76 accident-observed roads share matching protection-gap data');
 assert.equal(unobserved.length,1610,'do not award false safety to accident-unselected roads');
 for(const s of evaluated){
  const values=['lighting','accidents','protectionGap'].map(id=>observedFactorScore(s,id));
  assert.ok(values.every(v=>Number.isFinite(v)));
  assert.ok(Math.abs(segmentScore(bundle,s,'pri3')-values.reduce((sum,v)=>sum+v,0)/3)<1e-8);
 }
 assert.ok(unobserved.every(s=>segmentScore(bundle,s,'pri3')===null));
});

test('walking vulnerability selector exposes three-source score, not PRI 1+2 trial mean',()=>{
 const ui=source('pri-map.js');
 assert.ok(ui.includes("['pri3','종합 보행 취약도 · 현재 3개 지표']"));
 assert.ok(!ui.includes("options.unshift(['pri12'"));
 assert.ok(ui.includes("segmentScore(dataset,s,'pri3')"));
 assert.ok(ui.includes('점수가 높을수록 취약'));
 const css=source('pri-map.css');
 assert.ok(css.includes('max-height:calc(100dvh - 174px'));
 assert.ok(css.includes(':focus:not(:focus-visible)'));
});

test('status-to-onboarding-to-map-guide sequence hides transient scale and TIP',()=>{
 const css=source('v9267-phone-surface-regressions.css');
 assert.ok(css.includes(':not([data-dj860-auto-resolved="true"])'));
 assert.ok(css.includes(':has(#map-startup-overlay:not([hidden]))'));
 assert.ok(css.includes(':has(.dj860-onboarding:not([hidden]))'));
 assert.ok(css.includes(':has(#map-gesture-guide:not([hidden]))'));
 assert.ok(css.includes('.maplibregl-ctrl-scale'));
 assert.ok(css.includes('#dj840-map-tip'));
});

test('phone nav persists while incoming page contents fade and route CTA fits above dock',()=>{
 const tabs=source('bottom-tab-navigation.js');
 const css=source('v9267-phone-surface-regressions.css');
 assert.ok(tabs.includes("panel.classList.add('dj-tab-content-enter')"));
 assert.ok(css.includes('.dj-tab-content-enter > :is(.dj-sheet-chrome,.dj836-sheet-body,#dj910-route-footer)'));
 assert.ok(css.includes('animation:dj9267-tab-body-in'));
 assert.ok(css.includes('#route-panel.page-panel:not([hidden]) > #dj910-route-footer'));
 assert.ok(css.includes('bottom:calc(104px + env(safe-area-inset-bottom,0px))'));
 assert.ok(css.includes('> #bottom-nav:not([hidden])'));
});

test('My Info language and theme use native-style subpages, not orphan language card',()=>{
 const info=source('v834-my-info.js');
 const language=source('v854-language.js');
 const css=source('v9267-phone-surface-regressions.css');
 assert.ok(info.includes('data-dj834-action="language"'));
 assert.ok(info.includes("view==='language'?'언어'"));
 assert.ok(info.includes("view==='theme'?'화면 테마'"));
 assert.ok(info.includes("languageControl.dataset.djLanguageDetail='true'"));
 assert.ok(language.includes("if(section.dataset.djLanguageDetail==='true')return;"));
 assert.ok(css.includes('.dj834-settings-group > .dj854-language-section'));
 assert.ok(css.includes('.dj834-language-detail .dj854-language-section select'));
 assert.ok(css.includes('.dj834-theme-choice > button[aria-pressed="true"]'));
});

test('map report composer has animated close path for both return-to-map and feed flows',()=>{
 const main=source('main.js');
 assert.ok(main.includes('function closeComposerWithFade(finish)'));
 assert.ok(main.includes('closeComposerWithFade(done)'));
 assert.ok(main.includes('closeComposerWithFade(finish)'));
 assert.ok(main.includes("communityForm.animate([{opacity:1},{opacity:0}]"));
});

test('nearby card uses light tokens and university labels use regular font',()=>{
 const css=source('v9267-phone-surface-regressions.css');
 const featured=source('featured-place-labels.js');
 assert.ok(css.includes('#ped-tools-panel:not([hidden])'));
 assert.ok(css.includes('background:var(--dj-theme-surface,#fff)!important'));
 assert.ok(css.includes('#news-panel .dongjak-news-item:nth-child(3n+2)'));
 assert.ok(css.includes('#participation-panel'));
 assert.ok(featured.includes("'text-font':['Noto Sans Regular','Open Sans Regular']"));
 assert.ok(featured.includes("text:dark?'#b9c6bf':'#687b70'"));
});
