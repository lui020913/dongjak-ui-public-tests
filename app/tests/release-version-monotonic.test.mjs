import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {
 parseReleaseVersion,compareReleaseVersions,verifyMonotonicRelease
} from '../../scripts/verify-release-monotonic.mjs';
const old='a'.repeat(40),fresh='b'.repeat(40);
const marker=(version,source=old)=>({release_status:'DEPLOYED_PRODUCTION',source_commit:source,application_version:version});

test('semantic versions are compared by component, not lexicographically',()=>{
 assert.deepEqual(parseReleaseVersion('9.2.112'),[9,2,112]);
 assert.equal(compareReleaseVersions('9.2.112','9.2.99'),1);
 assert.equal(compareReleaseVersions('10.0.0','9.99.999'),1);
 assert.equal(compareReleaseVersions('9.2.111','9.2.112'),-1);
 for(const value of ['',undefined,'9.2','9.02.3-rc','9.2.3beta','9.2.x','999999999999999999999999.1.1']){
  assert.throws(()=>parseReleaseVersion(value));
 }
});

test('newer versions pass, downgraded and recycled versions are rejected',()=>{
 assert.equal(verifyMonotonicRelease(marker('9.2.112'),'9.2.113',fresh).repeat,false);
 assert.equal(verifyMonotonicRelease(marker('8.26.1'),'9.2.113',fresh).repeat,false);
 assert.equal(verifyMonotonicRelease(marker('9.2.112'),'9.2.112',old).repeat,true);
 assert.throws(()=>verifyMonotonicRelease(marker('9.2.112'),'9.2.111',fresh),/downgrade/);
 assert.throws(()=>verifyMonotonicRelease(marker('9.2.112'),'9.2.112',fresh),/reuse/);
 assert.throws(()=>verifyMonotonicRelease({...marker('9.2.112'),release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'},'9.2.113',fresh));
 assert.throws(()=>verifyMonotonicRelease(marker('9.2.112'),'9.2.113','bad'));
});

test('the real guarded Production job checks version before any deployment call',()=>{
 const flow=readFileSync(new URL('../../.github/workflows/mobile-first-overhaul-preview.yml',import.meta.url),'utf8');
 const validation=flow.indexOf('node scripts/verify-release-monotonic.mjs');
 const deploy=flow.indexOf('npx --yes wrangler@4 pages deploy dist --project-name');
 assert.ok(validation>0&&deploy>validation);
 assert.match(flow,/environment: public-cloudflare-production/);
 assert.match(flow,/trap rollback EXIT/);
});

test('the CLI blocks a downgrade without invoking a deployment',()=>{
 const folder=mkdtempSync(join(tmpdir(),'dongjak-version-gate-'));
 try{
  const file=join(folder,'previous.json');
  writeFileSync(file,JSON.stringify(marker('9.2.112')));
  const cli=new URL('../../scripts/verify-release-monotonic.mjs',import.meta.url);
  const downgrade=spawnSync(process.execPath,[cli.pathname,file,'9.2.111',fresh],{encoding:'utf8'});
  assert.equal(downgrade.status,1);
  assert.match(downgrade.stderr,/downgrade/);
  const advance=spawnSync(process.execPath,[cli.pathname,file,'9.2.113',fresh],{encoding:'utf8'});
  assert.equal(advance.status,0);
  assert.match(advance.stdout,/PASS monotonic Production release/);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
