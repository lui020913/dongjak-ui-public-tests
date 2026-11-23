import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
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
 assert.match(ci,/node --test tests\/retired-smoke-workflows\.test\.mjs tests\/workflow-release-safety-contract\.test\.mjs/);
});
