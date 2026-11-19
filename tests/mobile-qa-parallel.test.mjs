import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('release QA parallelizes independent tests in the same spec, with all phone projects',()=>{
 const config=read('playwright.v911-remote.config.mjs'),workflow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 assert.match(config,/fullyParallel:true,workers:4,retries:0/);
 for(const name of ['mobile375','mobile390','mobile430','mobile390-webkit-header']){
  assert.ok(config.includes(name));
  assert.ok(workflow.includes('--project='+name));
 }
 assert.match(workflow,/--project=mobile390-webkit-header --workers=4/);
 assert.match(workflow,/if: needs\.mobile-qa\.result == 'success'/);
 assert.match(config,/grep:\/layer header follows a real pointer\|phone update history rises monotonically\//);
});

test('mobile coverage policy assigns every case explicitly and preserves all functional checks',()=>{
 const config=read('playwright.v911-remote.config.mjs'),spec=read('tests/v911-anonymous-ui.spec.mjs');
 const cases=[...spec.matchAll(/^test\('([^']+)',\{tag:'(@[\w-]+)'\},async\(/gm)].map(m=>({name:m[1],tag:m[2]}));
 assert.equal(cases.length,[...spec.matchAll(/^test\(/gm)].length,'new tests must declare a coverage tag');
 assert.equal(new Set(cases.map(c=>c.name)).size,cases.length);
 const phone=cases.filter(c=>c.tag!=='@non-phone');
 assert.ok(phone.every(c=>['@phone-layout','@phone-common','@phone-platform'].includes(c.tag)));
 assert.equal(cases.filter(c=>c.tag==='@non-phone').length,7);
 for(const prefix of ['phone pilot safety symbols','phone night shortcut waits','phone route comparison uses','phone windows share the opaque']){
  assert.equal(cases.find(c=>c.name.startsWith(prefix))?.tag,'@phone-common');
 }
 for(const prefix of ['compact HUD','transport cards','phone toolbar','phone onboarding copy','phone sheets','phone weather','phone report composer','layer header follows','theme confirmation fades','phone update history rises']){
  assert.equal(cases.find(c=>c.name.startsWith(prefix))?.tag,'@phone-layout');
 }
 assert.equal(cases.find(c=>c.name.startsWith('phone first-run permission intro'))?.tag,'@phone-platform');
 assert.match(config,/mobile375:\/@phone-layout\//);
 assert.match(config,/mobile390:\/@phone-\(\?:layout\|common\|platform\)\//);
 assert.match(config,/mobile430:\/@phone-\(\?:layout\|platform\)\//);
 assert.match(config,/grep:fullMobileQA\?allPhoneCases:phoneCoverage\[name\]/);
 assert.match(config,/DONGJAK_FULL_MOBILE_QA==='1'/);
});
