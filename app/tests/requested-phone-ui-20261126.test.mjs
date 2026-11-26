import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
