import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const module=text('src/v877-mobile-settings.js'),css=text('src/v877-mobile-settings.css'),my=text('src/v834-my-info.js'),html=text('index.html');
test('v877 mobile settings feature runs after desktop UI without changing map engine',()=>{
 assert.match(html,/\/src\/v877-mobile-settings\.js/);
 assert.match(module,/installV877SettingsAndSheets/);
 assert.match(module,/const PHONE='\(max-width:1079px\)'/);
 assert.doesNotMatch(module,/fetch\(|map\.setStyle\(/);
});
test('map preferences expose route controls while the legend stays with safety layers',()=>{
 assert.doesNotMatch(module,/dj877-legend-grid/);
 for(const key of ['도보 설정','nav-voice','nav-orientation','dj816-voice-mode']) assert.ok(module.includes(key),key);
});
test('superseded map design controls are removed; walking options reuse native route state',()=>{
 assert.doesNotMatch(module,/지도 디자인 설정/);
 assert.doesNotMatch(module,/data-dj877-layer=/);
 assert.doesNotMatch(module,/\[data-base-layer=/);
 assert.match(module,/clickExisting\(doc,'#nav-voice'\)/);
 assert.match(module,/clickExisting\(doc,'#nav-orientation'\)/);
});
test('mobile sheets can expand fully and keep bottom navigation inside frame',()=>{
 for(const key of ['route-panel','participation-panel','news-panel','mine-panel','transport-sheet']) assert.ok(module.includes(key),key);
 assert.match(css,/dj877-any-expanded #bottom-nav/);
 assert.match(css,/height:calc\(100dvh - env\(safe-area-inset-top/);
 assert.match(module,/createMobileSheetCoordinator/);
 assert.match(text('src/v880-sheet-state.js'),/dj871-sheet-expanded/);
});
test('My Info moves map settings and release history into its own menu',()=>{
 assert.match(my,/data-dj834-action="map"/);
 assert.match(my,/data-dj834-action="history"/);
 assert.match(my,/data-dj834-action="type"/);
 assert.match(my,/map:mapBox/);
 assert.match(my,/version-history-trigger/);
 assert.match(css,/dj840-more-quick-actions/);
});
test('photo picker is local only with resize and reset, preserving cloud account',()=>{
 assert.match(my,/input type="file"/);
 assert.match(my,/canvas\.width=256/);
 assert.match(my,/toDataURL\('image\/jpeg'/);
 assert.match(my,/localStorage\.setItem\(photoKey,data\)/);
 assert.match(my,/localStorage\.removeItem\(photoKey\)/);
 assert.match(my,/accountBox\.prepend\(photoBox\)/);
 assert.doesNotMatch(my,/\.upload\(/);
});
