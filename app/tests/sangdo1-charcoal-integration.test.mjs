import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('native vulnerability PRI has the 3-source gap; duplicate map option removed',()=>{
 const main=read('src/main.js'),html=read('index.html'),pri=read('src/pri-map.js');
 const manifest=JSON.parse(read('public/data/pri/manifest.json'));
 assert.ok(main.includes('installPriMap({map,maplibregl,app,restoreMode:themeReloadState?.priMode})'));
 assert.ok(!main.includes('installPolicyGapThreeSourceMap'));
 assert.ok(main.includes('installNightVisibility'));
 assert.ok(html.includes('theme-contract.js'));
 assert.ok(html.includes('id="protection-zone-controls"'));
 assert.ok(!html.includes('walking-vulnerability-layer-group'));
 assert.ok(pri.includes('protectionGapColors'));
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_3source_factor.json'));
});

test('new vulnerability gradient uses a restrained semantic palette and the charcoal theme',()=>{
 const css=read('src/theme-contract.css'),pri=read('src/pri-map.js');
 assert.ok(css.includes('var(--dj-theme-selected)'));
 assert.ok(pri.includes('#CB6563'));
 assert.ok(pri.includes('#DDA263'));
 assert.ok(pri.includes('#DBC576'));
 assert.ok(pri.includes('#82AB94'));
 assert.ok(pri.includes('#4C948B'));
 assert.ok(pri.includes('#8D969F'));
});
