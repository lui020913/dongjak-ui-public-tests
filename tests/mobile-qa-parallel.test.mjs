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
