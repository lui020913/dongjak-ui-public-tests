import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('native vulnerability PRI retains 2-factor gap; research overlay stays independent',()=>{
 const main=read('src/main.js'),html=read('index.html'),pri=read('src/pri-map.js');
 const manifest=JSON.parse(read('public/data/pri/manifest.json'));
 assert.ok(main.includes('installPriMap({map,maplibregl,app,restoreMode:themeReloadState?.priMode})'));
 // PR255 added a separate opt-in research overlay. It must never replace the native PRI factor.
 assert.equal(main.split('installPolicyGapThreeSourceMap({map,maplibregl,app,nightMode,protectionOverlay})').length-1,1);
 assert.ok(!pri.includes('installPolicyGapThreeSourceMap'));
 assert.ok(!manifest.patches.some(p=>p.includes('3source')));
 assert.ok(main.includes('installNightVisibility'));
 assert.ok(html.includes('theme-contract.js'));
 assert.ok(html.includes('id="protection-zone-controls"'));
 assert.ok(!html.includes('walking-vulnerability-layer-group'));
 assert.ok(pri.includes('protectionGapColors'));
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json'));
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
