import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/mobile-ui/current.css');
const settings=read('src/mobile-primary-fullscreen.css');
const lang=read('src/v854-language.js');

test('language lives in one fixed-height settings row and uses the actual saved preference owner',()=>{
  assert.match(lang,/section\.className='dj854-language-section dj834-language-row'/);
  assert.match(lang,/select\.hidden=true;select\.tabIndex=-1/);
  assert.match(lang,/select\.addEventListener\('change',\(\)=>setLanguage\(select\.value\)\)/);
  assert.match(settings,/\.dj854-language-section:not\(\[hidden\]\)/);
  assert.match(settings,/height:62px!important/);
  assert.match(settings,/\.dj854-language-section > select \{/);
  assert.match(settings,/display:none!important/);
  assert.match(settings,/\.dj834-choice-settings\.dj834-view-active/);
});

test('community has exactly one action bar and keeps all button owners',()=>{
  assert.doesNotMatch(html,/class="community-heading-row"/);
  assert.match(html,/class="community-toolbar" role="group"/);
  for(const id of ['community-search','community-notifications-toggle','community-sort','community-saved-toggle','community-compose-toggle','community-list']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(css,/\.community-toolbar \{[\s\S]*?grid-template-columns:/);
  assert.match(css,/\.community-post \{[\s\S]*?border-radius:18px/);
  assert.match(css,/\.community-category-tabs \{[\s\S]*?overflow-x:auto!important/);
});

test('nearby information sheet shrinks to its content without obscuring bottom navigation',()=>{
  assert.match(css,/#ped-tools-panel:not\\(\\[hidden\\]\\):not\\(\\.dj871-sheet-expanded\\) \\{/);
  assert.match(css,/max-height:min\(58dvh,calc\(100dvh - 186px\)\)/);
  assert.match(css,/#ped-tools-panel #ped-tools-close/);
  assert.match(css,/#mine-panel\.page-panel:not\(\[hidden\]\) > \.dj836-sheet-body/);
  assert.match(css,/padding:14px 16px 28px!important/);
  assert.match(css,/border-radius:50%!important/);
  assert.match(css,/#ped-tools-panel #ped-tools-results button/);
  const source=read('src/pedestrian-tools.js');
  assert.match(source,/dj-nearby-map-center/);
  assert.match(source,/showNearby\(true\)/);
});

test('route source keeps its existing handlers while start, end and GPS controls use compact phone sizing',()=>{
  for(const id of ['route-search-start','route-pick-start','route-gps-start','route-search-end','route-pick-end','route-calc']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(css,/#route-panel \.route-location-row/);
  assert.match(css,/#route-panel \.route-mini-btn/);
  assert.match(css,/#route-panel \.route-gps-btn/);
  assert.match(css,/#route-panel \.route-calc/);
  assert.match(css,/#route-panel \.page-note/);
});
