import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validPublicCloudCredentials,cloudConfiguration} from '../src/v824-favorites-cloud.js';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('v8.1.3: public Supabase project URLs and publishable keys are validated',()=>{
  const u='https://test-project-123.supabase.co';
  assert.equal(validPublicCloudCredentials(u,'sb_publishable_abcdefghijk987654321'),true);
  assert.equal(validPublicCloudCredentials('https://attacker.example','sb_publishable_abcdefghijk987654321'),false);
  assert.equal(validPublicCloudCredentials(u,'sb_secret_abcdefghijk987654321'),false);
  assert.equal(validPublicCloudCredentials(u,'service_role'),false);
  assert.equal(validPublicCloudCredentials('http://test-project-123.supabase.co','sb_publishable_abcdefghijk987654321'),false);
  assert.equal(typeof cloudConfiguration().configured,'boolean');
});
test('v8.1.3: account can be configured from browser without pretending to be server-connected',()=>{
  const s=read('src/v824-favorites-cloud.js');
  assert.match(s,/dj-map-v813-supabase-url/);
  assert.match(s,/const setup=document\.createElement\('form'\)/);
  assert.match(s,/validPublicCloudCredentials\(url,key\)/);
  assert.match(s,/setup\.addEventListener\('submit'/);
  assert.match(s,/window\.location\.reload\(\)/);
  assert.match(s,/if\(!config\.configured\)\{publishAuthState\(null\);return \{configured:false,element:section\};\}/);
  assert.match(s,/setValue\(PUBLIC_CONFIG_URL_KEY,url\)/);
  assert.match(s,/!\/sb_secret_\|service_role\/i/);
});
test('v8.1.3: route dismiss is a header child, not a left-hand flex item',()=>{
  const html=read('index.html');
  assert.match(html,/<main id="route-panel"[\s\S]*?<header class="dj-sheet-chrome(?: dj-primary-fullscreen-header)?" data-dj-sheet-header="route">[\s\S]*?<button type="button" class="dj-sheet-chrome-close page-dismiss"/);
  assert.match(html,/href="\/src\/v813-route-account-fix\.css"/);
  const css=read('src/v813-route-account-fix.css');
  assert.match(css,/\.dj813-route-heading > \.page-dismiss\{/);
  assert.match(css,/position:absolute!important/);
  assert.match(css,/right:0!important;left:auto!important/);
});
test('v8.1.3: Windows settings script is additive and does not ship actual credentials',()=>{
  const ps=read('SETUP_SUPABASE.ps1');const bat=read('SETUP_SUPABASE.cmd');
  assert.match(ps,/\.env\.production\.local/);
  assert.match(ps,/\.env\.local/);
  assert.match(ps,/sb_publishable_/);
  assert.match(ps,/Where-Object/);
  assert.match(ps,/\.env settings/);
  assert.match(bat,/SETUP_SUPABASE\.ps1/);
  assert.ok(existsSync(new URL('../supabase/favorites.sql',import.meta.url)));
  assert.ok(!existsSync(new URL('../.env.production.local',import.meta.url)));
});
