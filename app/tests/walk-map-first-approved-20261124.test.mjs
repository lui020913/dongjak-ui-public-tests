import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('approved walking input is a real map with a TOP location card and separate dock-clear CTA',()=>{
  const css=read('src/route-experience.css'),ui=read('src/route-experience-20261123.js');
  assert.match(css,/2026-11-24 approved visual/);
  assert.match(css,/data-dj-route-stage="input"[\s\S]*?#route-panel\.page-panel:not\(\[hidden\]\)[\s\S]*?top:0!important;bottom:auto!important/);
  assert.match(css,/data-dj-route-stage="input"[\s\S]*?#route-panel\.page-panel:not\(\[hidden\]\)[\s\S]*?background:transparent!important/);
  assert.match(css,/position:fixed!important;[\s\S]*?bottom:calc\(var\(--dj910-dock-bottom,88px\) \+ 8px\)!important/);
  assert.match(css,/#dj-walk-map-actions\[hidden\]/);
  assert.match(ui,/chrome\?\.querySelector\('\.dj-sheet-chrome-title'\)\?\.before\(inputBack\)/);
  assert.match(ui,/on\(inputBack,'click',\(\)=>nativeClose\?\.click\(\)\)/);
  assert.match(ui,/on\(center,'click',\(\)=>byId\('center-dongjak'\)\?\.click\(\)\)/);
  assert.match(ui,/on\(locate,'click',\(\)=>byId\('current-location'\)\?\.click\(\)\)/);
  assert.match(ui,/mapActions\.hidden=clear<134/);
  assert.match(ui,/const navRect=byId\('bottom-nav'\)\?\.getBoundingClientRect\(\)/);
  assert.match(ui,/const desired=navRect\.top-12-actual\.height/);
  assert.match(ui,/routeFooter\.style\.setProperty\('transform','translateY\('/);
  assert.match(ui,/if\(stage!=='input'\)restoreInputFooter\(\)/);
});

test('input redesign does not replace native place search, route calculation, PRI preview, or locked guidance',()=>{
  const ui=read('src/route-experience-20261123.js'),main=read('src/main.js');
  for(const id of ['route-search-start','route-search-end','route-gps-start','route-pick-end'])
    assert.match(ui,new RegExp(id));
  assert.match(main,/async function calculateRoute\(/);
  assert.match(ui,/routeComparisonItems\(latest\)/);
  assert.match(ui,/if\(e\.target\?\.closest\?\.\('#nav-stop'\)\)return/);
  assert.match(ui,/topBanner\.append\(instruction\)/);
  assert.doesNotMatch(ui,/watchPosition\(/);
});
