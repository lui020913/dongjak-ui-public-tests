import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('native vulnerability PRI retains 2-factor gap; duplicate research overlay stays retired',()=>{
 const main=read('src/main.js'),html=read('index.html'),pri=read('src/pri-map.js');
 const manifest=JSON.parse(read('public/data/pri/manifest.json'));
 assert.ok(main.includes('installPriMap({map,maplibregl,app,restoreMode:themeReloadState?.priMode})'));
 // Research data is retained without a second public overlay.
 assert.doesNotMatch(main,/installPolicyGapThreeSourceMap\(/);
 assert.ok(!pri.includes('installPolicyGapThreeSourceMap'));
 assert.ok(!manifest.patches.some(p=>p.includes('3source')));
 assert.doesNotMatch(main,/installNightVisibility/);
 assert.ok(html.includes('theme-contract.js'));
 assert.ok(!html.includes('id="protection-zone-controls"'));
 assert.ok(!html.includes('walking-vulnerability-layer-group'));
 assert.ok(pri.includes('protectionGapColors'));
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json'));
});

test('vulnerability gradient retains its independent semantic palette in the light UI',()=>{
 const css=read('src/theme-contract.css'),pri=read('src/pri-map.js');
 assert.ok(css.includes('--dj-theme-selected:#e1ecec'));
 assert.doesNotMatch(css,/data-theme="dark"/);
 assert.ok(pri.includes('#CB6563'));
 assert.ok(pri.includes('#DDA263'));
 assert.ok(pri.includes('#DBC576'));
 assert.ok(pri.includes('#82AB94'));
 assert.ok(pri.includes('#4C948B'));
 assert.ok(pri.includes("UNKNOWN_COLOR='#B9C3C2'"));
 assert.match(pri,/100,'#CB6563'\],'?UNKNOWN_COLOR/);
});
