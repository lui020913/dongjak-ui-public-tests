import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('advanced settings menu is not mounted; map and display preferences remain',()=>{
 const js=read('../src/v834-my-info.js'),html=read('../index.html');
 assert.doesNotMatch(js,/고급 지도 도구|dj834-advanced-tools|advancedTools|toolsBox/);
 for(const id of ['dj-settings-motion','dj-settings-weather','dj-settings-tools'])assert.ok(js.includes(id));
 for(const id of ['map-tools-toggle','map-safety-toggle','ped-report-open'])assert.ok(html.includes('id="'+id+'"'));
});
test('report button invalidates nearby queries without restoring old overview',()=>{
 const js=read('../src/pedestrian-tools.js');
 const handler=js.slice(js.indexOf("reportButton.addEventListener('click'"),js.indexOf("width?.addEventListener('click'"));
 assert.match(handler,/\+\+seq/);
 assert.match(handler,/panel.hidden=true/);
 assert.doesNotMatch(handler,/restoreOverview\(\)/);
 assert.match(handler,/onReport\(\)/);
});
test('metro keeps destination suffix and route shadow buttons use pill radius',()=>{
 const js=read('../src/transport-map.js'),css=read('../src/route-screen-v3.css');
 assert.ok(js.includes("desc.append(el('strong','',info.heading));"));
 assert.ok(css.includes('.action,.switch,.tools button,.recent-head button,.recent-list button'));
 assert.match(css,/\.recent-list button[^{}]*\{border-radius:999px!important\}/);
});

test('phone layout aligns metro arrival times horizontally and shrinks the nearby safety text',()=>{
 const generated=new URL('../src/mobile-next.css',import.meta.url);
 const css=readFileSync(existsSync(generated)?generated:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
 const compact=css.split('\n').filter(line=>line.includes('[data-dj-transport-layout="compact-v2"][data-kind="subway"]'));
 const row=compact.find(line=>line.includes('.metro-arrival-direction-group .transport-arrival-row{'));
 const eta=compact.find(line=>line.includes('.metro-arrival-time-block{'));
 assert.match(row,/flex-direction:row!important/);
 assert.match(row,/min-height:42px!important/);
 assert.match(eta,/text-align:right!important/);
 assert.match(eta,/width:auto!important/);
 assert.match(css,/\.dj-nearby-safety-summary>summary\{font-size:14px!important/);
 assert.match(css,/\.dj-gps-status h3\{font-size:14px!important/);
 assert.match(css,/#ped-tools-heading\{font-size:17px!important/);
 assert.match(css,/#participation-panel\[hidden\]:not\(\[data-dj-tab-outgoing="true"\]\)/);
 assert.match(css,/\.dj885-type-choices,\.dj-record-tabs\)\{border-radius:999px!important\}/);
});
