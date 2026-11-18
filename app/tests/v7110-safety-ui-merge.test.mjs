import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('v8.0.0 mobile and PC experience remains alongside the optional safety UI',()=>{
 const html=read('index.html');
 assert.match(html,/src="\/src\/v711-experience\.js"/);
 assert.match(html,/href="\/src\/v711-experience\.css"/);
 assert.match(html,/id="dj-full-transition"/);
 assert.match(html,/id="dj-type-settings"/);
 assert.match(html,/id="dj-type-scale"/);
 assert.match(html,new RegExp('v'+APP_VERSION.replaceAll('.','\\.')));
 const entry=read('src/safety-workbench-entry-v7104.js');
 assert.match(entry,/safety-polish-v7104\.css/);
});
test('mobile panel title spacing overrides legacy high-specificity selectors',()=>{
 const css=read('src/safety-polish-v7104.css');
 assert.match(css,/#app#app\[data-tab="map"\]\.map-safety-open #map-safety-controls \.map-safety-head/);
 assert.match(css,/padding:14px 4px 17px!important/);
 assert.match(css,/#app#app\[data-tab="map"\]\.map-controls-open #map-advanced-controls \.map-options-mobile-heading/);
 assert.match(css,/width:51px!important/);
 assert.match(css,/width:57px!important/);
});
