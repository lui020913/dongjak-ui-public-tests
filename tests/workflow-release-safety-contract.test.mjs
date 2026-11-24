import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {assessPerformance} from '../scripts/verify-ui-performance.mjs';
const root=new URL('../',import.meta.url);
const path=file=>new URL(file,root);
const read=file=>readFileSync(path(file),'utf8');

test('production uptime checks the actual live app rather than a historical Preview',()=>{
 const yml=read('.github/workflows/public-uptime.yml');
 assert.match(yml,/DONGJAK_TARGET_URL:\s*\$\{\{ vars\.DONGJAK_TARGET_URL \|\| 'https:\/\/dongjak-walk-safety-preview\.pages\.dev\/' \}\}/);
 assert.doesNotMatch(yml,/v881-integrated-1116/);
 assert.match(yml,/cron:\s*'17,47 \* \* \* \*'/);
});

test('obsolete pinned 8.26.1 Production promotion path is removed without altering the current guarded release',()=>{
 assert.equal(existsSync(path('.github/workflows/mobile-only-production-retry.yml')),false);
 assert.equal(existsSync(path('release/mobile-only-production-retry.json')),false);
 const flow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 assert.match(flow,/environment: public-cloudflare-production/);
 assert.match(flow,/needs: \[build, preview, mobile-qa, desktop-tablet-qa, visual-capture, visual-qa, explore-qa\]/);
 assert.match(flow,/trap rollback EXIT/);
 assert.match(flow,/previous_public_sha/);
 assert.match(flow,/Confirm tested Preview still matches the exact candidate/);
 const rel=JSON.parse(read('release/mobile-first-overhaul-request.json'));
 assert.equal(rel.source,'public-app');
 assert.match(rel.application_version,/^\d+\.\d+\.\d+$/);
});

test('do not retain a misleading notification subscription for the removed workflow',()=>{
 assert.doesNotMatch(read('.github/workflows/development-notifications.yml'),/Promote previously phone-tested mobile-only artifact to Production/);
 const ci=read('.github/workflows/public-app-pr.yml');
 assert.match(ci,/node --test tests\/mobile-qa-parallel\.test\.mjs/);
 assert.match(ci,/node --test [^\n]*tests\/retired-smoke-workflows\.test\.mjs/);
 assert.match(ci,/node --test [^\n]*tests\/workflow-release-safety-contract\.test\.mjs/);
});


test('v9.3 performance comparison uses immutable baseline and exact candidate before protected promotion',()=>{
 const flow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 const performance=flow.split('\n  performance-compare:')[1].split('\n  production:')[0];
 const promotion=flow.split('\n  production:')[1].split('\n  notify-production:')[0];
 assert.match(performance,/needs: \[build, preview\]/);
 assert.match(performance,/app_version == '9\.3\.0'/);
 assert.match(performance,/DONGJAK_PERF_BASELINE_COMMIT: 674766692107cba977fe3181e9638493c33c7c8e/);
 assert.match(performance,/DONGJAK_PERF_CANDIDATE_COMMIT: \$\{\{ needs\.build\.outputs\.public_sha \}\}/);
 assert.match(performance,/compare-ui-performance\.mjs "\$BASELINE_URL" "\$CANDIDATE_URL" 3/);
 assert.match(performance,/node scripts\/verify-ui-performance\.mjs "\$DONGJAK_PERF_OUTPUT"/);
 assert.ok(performance.indexOf('actions/upload-artifact@v4')<performance.indexOf('node scripts/verify-ui-performance.mjs'));
 assert.match(promotion,/needs: \[build, preview, mobile-qa, desktop-tablet-qa, visual-capture, visual-qa, explore-qa, performance-compare\]/);
 assert.match(promotion,/needs\.performance-compare\.result == 'success'/);
 assert.match(promotion,/app_version != '9\.3\.0' && needs\.performance-compare\.result == 'skipped'/);
 const script=read('scripts/compare-ui-performance.mjs');
 assert.match(script,/Release provenance changed during comparison/);
 assert.match(script,/Insufficient frame samples/);
 assert.match(script,/byScenario/);
});

test('protected v9.3 minor replay retains every prior 9.2.136 release increment',()=>{
 const build=read('scripts/build-mobile-first-overhaul.sh');
 const replay=build.slice(build.indexOf('export DONGJAK_BATCH_RELEASE_STAMP=1'),build.indexOf('unset DONGJAK_BATCH_RELEASE_STAMP'));
 const invoke=(version,kind)=>{
  const stub='set -euo pipefail\nAPP_VERSION="$1"\nREQUEST=fixture\nkind="$2"\njq(){ printf "%s\\n" "$kind"; }\n';
  // Record the exact bump invocations, including notes, without changing files.
  const script=stub+'\nnode(){ test "$1" = scripts/bump-app-version.mjs; printf "%s\\n" "$2" >&2; }\n'+replay+'\n';
  const result=spawnSync('bash',['-c',script,'replay',version,kind],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const kinds=result.stderr.trim().split('\n');
  const versions=[];let parts=[8,26,1];
  for(const k of kinds){
   if(k==='major')parts=[parts[0]+1,0,0];
   else if(k==='minor')parts=[parts[0],parts[1]+1,0];
   else if(k==='patch')parts=[parts[0],parts[1],parts[2]+1];
   else assert.fail('Unexpected bump: '+k);
   versions.push(parts.join('.'));
  }
  return versions;
 };
 const previous=invoke('9.2.136','patch');
 assert.equal(previous.at(-1),'9.2.136');
 assert.deepEqual(invoke('9.3.0','minor'),[...previous,'9.3.0']);
 assert.equal(invoke('9.2.17','patch').at(-1),'9.2.17');
});

test('performance promotion requires improvement without material severe-stall regression',()=>{
 const row=(p50,p95,share,click,samples=150)=>({frameIntervalMs:{p50,p95,samples},shareOver50msPct:share,clickDispatchDelayMs:{p50:click}});
 const baseline=row(50,1266.6,50,36.4);
 const assess=candidate=>assessPerformance({rounds:3,summary:{baseline,candidate}});
 const oldCandidate=assess(row(33.4,3049.8,44.3,34.5,149));
 assert.equal(oldCandidate.pass,false);
 assert.ok(oldCandidate.reasons.some(x=>x.includes('P95')));
 assert.equal(assess(row(40,1100,44,34)).pass,true);
 assert.equal(assess(baseline).pass,false);
 assert.equal(assess(row(33,1000,60,34)).pass,false);
 assert.equal(assess(row(33,1000,44,80)).pass,false);
 assert.equal(assess(row(33,1000,44,34,10)).pass,false);
 assert.equal(assessPerformance({}).pass,false);
});
