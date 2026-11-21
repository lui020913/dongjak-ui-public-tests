import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {TAB_TRANSITION,adjacentTabIndex} from '../src/bottom-tab-navigation.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function frontend(name){
 const built=new URL('../src/'+name,import.meta.url);
 return readFileSync(existsSync(built)?built:new URL('../../frontend/production/'+name,import.meta.url),'utf8');
}

test('superseded transit badge rings and injected start/end icons are removed, not re-layered',()=>{
 const phone=frontend('mobile-next.js');
 const css=frontend('mobile-next.css');
 const current=read('src/mobile-ui/current.css');
 for(const text of ['dj9272-station-route-button',"button.insertAdjacentHTML('afterbegin',phoneIcon(key))"]){
  assert.equal(phone.includes(text),false,'obsolete JS origin icon remains: '+text);
 }
 assert.doesNotMatch(css,/#transport-title:has\([^{}]*?\.dj-metro-line-selector\[aria-pressed="true"\]\{border:2px/);
 assert.equal((current.match(/\.dj-metro-line-selector\[aria-pressed="true"\]\s*\{/g)||[]).length,0);
 assert.match(css,/\.dj-metro-line-selector\[aria-pressed=true\]::after/);
 assert.ok(current.includes('width:25px!important;height:25px!important'));
 assert.ok(current.includes('min-width:44px!important;min-height:44px!important'));
});

test('compact subway displays arrival data before optional rail neighbor controls',()=>{
 const metro=read('src/transport-map.js');
 assert.match(metro,/arrivalsEl\.parentNode\.insertBefore\(neighborsEl,arrivalsEl\.nextSibling\)/);
 assert.doesNotMatch(metro,/liveHeading\.parentNode\.insertBefore\(neighborsEl,liveHeading\)/);
 assert.ok(metro.includes("arrivalsEl.setAttribute?.('aria-busy','true')"));
 assert.match(frontend('mobile-next.css'),/\[data-kind="subway"\]:not\(\.dj871-sheet-expanded\) :is\(#transport-description,#transport-chips\)\{display:none!important\}/);
 assert.ok(metro.includes('stationMetroQuotaUntil>Date.now()'));
});

test('bottom-tab dissolve has one controller with coalesced selection and no old patch animations',()=>{
 const source=read('src/bottom-tab-navigation.js');
 const css=frontend('mobile-next.css');
 assert.deepEqual(TAB_TRANSITION,{exit:90,enter:145});
 assert.equal(adjacentTabIndex(2,5,-70,0),3);
 assert.ok(TAB_TRANSITION.exit+TAB_TRANSITION.enter<260);
 assert.match(source,/if\(exitTimer\)\{pending=button;return;\}/);
 assert.match(source,/if\(settleTimer\)finishVisual\(\)/);
 assert.match(source,/if\(reduced\(\)\)\{const target=pending;pending=null;replay\(target\);return;\}/);
 assert.match(source,/outgoing\.classList\.add\('dj-mobile-tab-exit'\)/);
 assert.match(source,/incoming\.classList\.add\('dj-mobile-tab-enter'\)/);
 assert.match(source,/curtain\?\.classList\.add\('dj-tab-curtain-out'\)/);
 assert.ok(css.includes('.dj-mobile-tab-exit:not([hidden])'));
 assert.ok(css.includes('.dj-mobile-tab-enter:not([hidden])'));
 for(const retired of ['dj9272-tab-leave','dj9272-tab-enter','dj9272PageEnter','curtainFade','curtainHide']){
  assert.equal(source.includes(retired),false,retired);
 }
 for(const retired of ['.dj9272-tab-leave','.dj9272-tab-enter','dj9272PageEnter']){
  assert.equal(css.includes(retired),false,retired);
 }
});

test('icons and floating nav use a controlled glass material, never page-wide opacity',()=>{
 const css=frontend('mobile-next.css');
 assert.match(css,/background:color-mix\(in srgb,var\(--djNext-tool-face\) 82%,transparent\)!important/);
 assert.match(css,/backdrop-filter:blur\(11px\) saturate\(1\.18\)!important/);
 assert.match(css,/background:color-mix\(in srgb,var\(--dj9272-surface,var\(--mf-surface,#fff\)\) 84%,transparent\)!important/);
 assert.match(css,/backdrop-filter:blur\(13px\) saturate\(1\.15\)!important/);
 assert.ok(css.includes('#djNext-permissions:not([hidden])'));
 assert.equal(css.includes('filter:brightness(.66)'),false);
 assert.equal(css.includes('background:rgba(19,40,32,calc(.4'),false);
});
