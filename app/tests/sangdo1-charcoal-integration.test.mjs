import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('charcoal UI and 300m vulnerability research share the native PRI modal instead of duplicate options',()=>{
 const main=read('src/main.js'),html=read('index.html'),pri=read('src/pri-map.js');
 const manifest=JSON.parse(read('public/data/pri/manifest.json'));
 assert.match(main,/installPriMap\\(\\{map,maplibregl,app\\}\\)/);
 assert.doesNotMatch(main,/installPolicyGapThreeSourceMap/);
 assert.match(main,/installNightVisibility/);
 assert.match(html,/theme-contract\\.js/);
 assert.match(html,/id="protection-zone-controls"/);
 assert.doesNotMatch(html,/walking-vulnerability-layer-group/);
 assert.match(pri,/protectionGapColors/);
 assert.ok(manifest.patches.includes('/data/pri/sangdo1_protection_gap_3source_factor.json'));
});
test('dark research UI is neutral while risk gradient and gray NULL are semantic',()=>{
  const css=read('src/theme-contract.css'),js=read('src/policy-gap-3source-map-patch.js');
  assert.match(css,/#pza3-panel/);
  assert.match(css,/var\(--dj-theme-selected\)/);
  assert.match(css,/\.pza3-popup/);
  assert.match(js,/#D64550/);
  assert.match(js,/#A3AAB4/);
  assert.match(js,/policyGapTeamAverage/);
  assert.match(js,/indicatorCount:denominator/);
  assert.doesNotMatch(css,/pza3-score-lines/);
});
