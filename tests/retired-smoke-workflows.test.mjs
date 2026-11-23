import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const path=file=>new URL(file,root);
const read=file=>readFileSync(path(file),'utf8');

test('retire only standalone manual smoke workflows, keep all live recovery owners',()=>{
 for(const name of ['recovery-smoke.yml','recovery-smoke-controller.yml','notification-test.yml'])
  assert.equal(existsSync(path('.github/workflows/'+name)),false,name+' must stay retired');
 for(const name of ['mobile-release-failure-recovery.yml','public-pr-failure-recovery.yml','ai-ui-recovery.yml','v911-failure-recovery.yml',
   'mobile-first-overhaul-preview.yml','public-uptime.yml'])
  assert.equal(existsSync(path('.github/workflows/'+name)),true,name+' is a live owner');
 const main=read('.github/workflows/mobile-first-overhaul-preview.yml');
 assert.match(main,/environment: public-cloudflare-production/);
 assert.match(main,/trap rollback EXIT/);
 assert.match(main,/mobile-qa/);
 assert.match(main,/preview/);
});
