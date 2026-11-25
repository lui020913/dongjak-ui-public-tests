import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SAFETY_DESKTOP_PANES} from '../src/v819-safety-one-screen.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('v819: desktop categories retain current available and disabled subcategories',()=>{
  assert.deepEqual(Object.keys(SAFETY_DESKTOP_PANES),['dj-safety-data','dj-safety-facilities']);
  assert.equal(SAFETY_DESKTOP_PANES['dj-safety-data'].length,4);
  assert.equal(SAFETY_DESKTOP_PANES['dj-safety-facilities'].length,2);
  assert.equal(SAFETY_DESKTOP_PANES['dj-safety-data'][1],'추가 자료');
  const html=read('index.html');
  for(const id of Object.keys(SAFETY_DESKTOP_PANES))assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/v819-safety-one-screen\.css/);
  assert.match(html,/v819-safety-one-screen\.js/);
});

test('v819: desktop subcategories toggle existing content, do not clone or replace functional controls',()=>{
  const js=read('src/v819-safety-one-screen.js');
  assert.match(js,/grid\?\.children/);
  assert.match(js,/Number\(el\.dataset\.dj819PaneIndex\) !== selected/);
  assert.match(js,/el\.toggleAttribute\('data-dj819-inactive',hide\)/);
  assert.match(js,/media\?\.addEventListener\?\.\('change',onMediaChange\)/);
  assert.doesNotMatch(js,/innerHTML\s*=|outerHTML\s*=/);
  assert.match(js,/button\.setAttribute\('aria-pressed',String\(index === selected\)\)/);
});

test('v819: no whole-panel scroll on PC, no subcategory hiding on mobile',()=>{
  const css=read('src/v819-safety-one-screen.css');
  assert.match(css,/@media \(min-width:1080px\)/);
  assert.match(css,/overflow:hidden!important/);
  assert.match(css,/#map-safety-controls \[data-dj819-inactive\]\{display:none!important;\}/);
  assert.match(css,/@media \(max-width:1079px\)/);
  assert.match(css,/\.dj819-subnav\{display:none!important;\}/);
});

test('v819: latest hotfix release records desktop safety navigation once',()=>{
  const recent=read('src/version-history.js').split('export const LATEST_V803_UI_PATCH')[1].split('export const RENUMBERED_VERSION_HISTORY')[0];
  assert.equal((recent.match(/스크롤 없는 대분류·소분류/g)||[]).length,1);
});
