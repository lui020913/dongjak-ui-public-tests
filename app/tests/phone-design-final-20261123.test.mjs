import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkingRouteViewportPadding} from '../src/route-map-focus.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const prod=(name)=>{
  try{return read('src/'+name);}
  catch(error){if(error?.code!=='ENOENT')throw error;return read('../frontend/production/'+name);}
};

test('walking route camera fits between real top controls and compact sheet, not 52% height guess',()=>{
 const p=walkingRouteViewportPadding({viewportHeight:844,mapTop:0,toolbarBottom:395,sheetTop:628,navigationTop:775});
 assert(p.top>=395,'upper inset clears the real action toolbar');
 assert(p.bottom>=844-628,'lower inset clears the route card');
 assert(p.top+p.bottom<=844-126,'map remains navigable');
 assert.equal(p.left,p.right);
 const short=walkingRouteViewportPadding({viewportHeight:667,mapTop:0,toolbarBottom:250,sheetTop:440,navigationTop:590,minVisible:126});
 assert(short.top+short.bottom<=667-126,'short PWA viewport retains minimum visible map');
 const main=read('src/main.js');
 assert.match(main,/walkingRouteViewportPadding\(\{/);
 assert.match(main,/sheetTop:visible\(card\)\?card\.getBoundingClientRect\(\)\.top/);
 assert.doesNotMatch(main,/Math\.floor\(window\.innerHeight\*\.61\)/);
});

test('route result starts compact; four route choices and full-geometry action remain one tap away',()=>{
 const js=prod('mobile-next.js'),css=prod('mobile-next.css');
 assert.match(js,/showCompact\(\);/);
 assert.match(js,/host\.dataset\.dj9272RouteFocus='true'/);
 assert.match(js,/expand\.setAttribute\('aria-expanded','false'\)/);
 assert.match(js,/const variants=\[\['standard'/);
 assert.match(js,/win\.requestAnimationFrame\(\(\)=>win\.requestAnimationFrame/);
 assert.match(css,/\.dj9272-selected-route\{display:none!important/);
 assert.match(css,/#route-map-card\[data-dj9272-route-focus="true"\] \.dj9272-selected-route\{display:flex!important/);
 assert.match(css,/max-height:min\(34dvh,278px\)!important/);
});

test('community status has no opaque blank white panel and refresh remains a compact action',()=>{
 const css=prod('mobile-next.css');
 assert.match(css,/\.dj-community-status-label\{font-size:12px!important[^}]*border:0!important[^}]*background:transparent!important/);
 assert.match(css,/\.dj-community-feed-status\{display:flex!important[^}]*background:transparent!important[^}]*box-shadow:none!important/);
 assert.match(css,/#participation-panel #community-search\{margin:0 0 12px!important/);
 assert.match(css,/#participation-panel \.dj-community-refresh\{width:auto!important/);
});

test('typography options are flat rounded segments, with consistent history child surface and retained content',()=>{
 const css=prod('mobile-next.css'),history=read('src/version-history-v7.js'),phone=read('src/phone-surface-consistency-20261123.css');
 assert.match(css,/\.dj885-type-choices button\{border-radius:11px!important/);
 assert.match(css,/\.dj885-type-choices button\[aria-pressed=true\]\{box-shadow:none!important/);
 assert.match(phone,/\.v707-release-head \.dj-semver-size \{\s*display:none!important/);
 assert.match(history,/currentTexts\.has\(first\)\?'이전 변경 기록 펼치기'/);
 assert.match(history,/for\(const description of notes\)ul\.append\(el\('li'/);
});
