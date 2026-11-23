import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canAuditProduction,isCurrentAppTree,validLiveMarker} from '../scripts/verify-live-production-source.mjs';
const deployed='a'.repeat(40),now='b'.repeat(40);
const marker={release_status:'DEPLOYED_PRODUCTION',source_commit:deployed,public_ui_source_commit:deployed,application_version:'9.2.116'};
test('equal SHA is eligible without a network fetch',()=>{
 let calls=0;
 assert.equal(isCurrentAppTree(marker,deployed,{run:()=>{calls++;}}),true);
 assert.equal(calls,0);
 assert.equal(canAuditProduction(marker,deployed),true);
});
test('documentation-only main commit can still audit only if app/ trees are identical',()=>{
 const calls=[];
 const mock=(cmd,args)=>{calls.push([cmd,args]);};
 assert.equal(isCurrentAppTree(marker,now,{run:mock}),true);
 assert.equal(calls.length,2);
 assert.deepEqual(calls[0][1],['fetch','--no-tags','--quiet','--depth=1','origin',deployed]);
 assert.deepEqual(calls[1][1],['diff','--quiet',deployed,now,'--','app/']);
 assert.equal(canAuditProduction(marker,now,true),true);
 assert.equal(canAuditProduction(marker,now,false),false);
});
test('any changed app source, fetch failure or malformed release is fail closed',()=>{
 const changed=()=>{throw Error('changed files or unavailable GitHub');};
 assert.equal(isCurrentAppTree(marker,now,{run:changed}),false);
 for(const altered of [
  {...marker,release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'},
  {...marker,public_ui_source_commit:now},
  {...marker,source_commit:';dangerous git args'},
  {...marker,application_version:'9.2.bad'}
 ]){
  assert.equal(validLiveMarker(altered,now),false);
  assert.equal(canAuditProduction(altered,now,true),false);
  assert.equal(isCurrentAppTree(altered,now,{run:()=>{throw Error('Should not execute git')}}),false);
 }
});
test('the scheduled workflow checks the source tree before any browser or Gemini audit',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/autonomous-production-audit.yml',import.meta.url),'utf8');
 const guard=workflow.indexOf('node scripts/verify-live-production-source.mjs');
 const browser=workflow.indexOf('npx playwright test');
 assert.ok(guard>0&&browser>guard);
 assert.match(workflow,/if: steps\.live\.outputs\.current == 'true'/);
 assert.match(workflow,/Recheck exact live source/);
 assert.match(workflow,/DONGJAK_TARGET_URL: https:\/\/dongjak-walk-safety-preview\.pages\.dev\//);
});
