import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public deployment verifies cumulative exact-source viewport evidence',()=>{
 const gate=read('.github/workflows/v911-remote-ui-gate.yml');
 const source=read('scripts/verify-release-source.mjs');
 const build=read('.github/workflows/public-private-source-preview.yml');
 const prod=read('.github/workflows/public-exact-production.yml');
 const evidence=read('scripts/verify-release-evidence.mjs');
 assert.match(gate,/expected_build_run:/);
 assert.match(gate,/DONGJAK_EXPECTED_BUILD_RUN:/);
 assert.match(source,/String\(result\.build_run\)===expectedBuild/);
 assert.match(source,/target\.hostname !== 'ui-v911-motion-preview\.'/);
 assert.match(build,/expected_build_run:\$build/);
 assert.ok(prod.includes('evidence_runs:'));
 assert.ok(prod.includes('node scripts/verify-release-evidence.mjs'));
 assert.ok(prod.includes('v911 Production source=$SOURCE_SHA build=$BUILD_RUN evidence=$EVIDENCE_RUNS'));
 assert.ok(evidence.includes('standardAuditBuildId'));
 assert.ok(evidence.includes('validateFocusedTabletEvidence'));
 assert.ok(evidence.includes('missingViewports'));
 assert.match(prod,/\.approval=="explicit-owner-request"/);
 assert.match(read('scripts/release-evidence-policy.mjs'),/mobile375.*mobile390.*tablet768.*tablet820.*tablet1024.*tablet1180.*pc1280.*pc1440.*pc1920/s);
 assert.equal((gate.match(/node scripts\/verify-release-source\.mjs/g)||[]).length,2);
});

test('candidate publication is single-attempt and serializes with Production',()=>{
 const build=read('.github/workflows/public-private-source-preview.yml');
 const prod=read('.github/workflows/public-exact-production.yml');
 assert.ok(build.includes('group: dongjak-public-release'));
 assert.ok(prod.includes('group: dongjak-public-release'));
 assert.equal((build.match(/test "\$GITHUB_RUN_ATTEMPT" = 1/g)||[]).length,2);
 assert.ok(prod.includes('test "$GITHUB_RUN_ATTEMPT" = 1'));
 assert.match(read('scripts/release-evidence-policy.mjs'),/run\.run_attempt===1/);
});

test('public runner synchronizes visible version metadata before the complete Node test suite',()=>{
 const build=read('.github/workflows/public-private-source-preview.yml');
 const metadata=build.indexOf('node scripts/ci-v911-release.mjs');
 const stamp=build.indexOf('node scripts/stamp-version.mjs');
 const test=build.indexOf('node --test --test-reporter=tap tests/*.test.mjs');
 assert.ok(metadata>=0 && stamp>metadata && test>stamp);
 assert.match(build,/private-test-fingerprint\.mjs/);
});


test('remote UI gate uses the matching preinstalled browser image instead of repeated system installs',()=>{
 const gate=read('.github/workflows/v911-remote-ui-gate.yml');
 const preflight=read('.github/workflows/public-release-preflight.yml');
 const version=JSON.parse(read('package.json')).devDependencies['@playwright/test'];
 for(const workflow of [gate,preflight]) assert.ok(workflow.includes('image: mcr.microsoft.com/playwright:v'+version+'-noble'));
 assert.doesNotMatch(gate,/playwright install --with-deps/);
 assert.match(gate,/PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD/);
 assert.match(gate,/Verify preinstalled Chromium/);
 assert.ok(gate.includes('["mobile375","mobile390","tablet768","tablet820","tablet1024","tablet1180","pc1280","pc1440","pc1920"]'));
});

test('owner-only preview request pushes pin exact source and deduplicate before private fetch',()=>{
 const build=read('.github/workflows/public-private-source-preview.yml');
 const prod=read('.github/workflows/public-exact-production.yml');
 assert.ok(build.includes('paths: [release/preview-request.json]'));
 assert.ok(build.includes("github.actor == 'lui020913'"));
 assert.ok(build.includes('id: resolve')&&build.includes('id: dedup'));
 assert.ok(build.indexOf('id: dedup')<build.indexOf('git -C "$work" fetch'));
 assert.ok(build.includes('needs.build.outputs.source_sha'));
 assert.ok(build.includes('force_rebuild:'));
 assert.ok(build.includes('test "$SOURCE_SHA" = "$actual"'));
 assert.match(prod,/workflow_dispatch:/);
 assert.match(prod,/paths: \[release\/production-request\.json\]/);
 assert.match(prod,/\.approval=="explicit-owner-request"/);
 assert.ok(prod.includes('==["release/production-request.json"]'));
 assert.ok(prod.includes('gh api "repos/$GITHUB_REPOSITORY/commits/$GITHUB_SHA"'));
 assert.ok(prod.includes('[.files[].filename]|unique'));
 assert.doesNotMatch(prod,/\.head_commit\.added\[\]/);
 assert.ok(prod.includes('.pusher.name=="lui020913"'));
 assert.ok(prod.includes('v911 Production source=$SOURCE_SHA build=$BUILD_RUN evidence=$EVIDENCE_RUNS'));
 assert.ok(prod.includes('test "$GITHUB_RUN_ATTEMPT" = 1'));
 assert.ok(prod.includes('run-id: ${{ steps.resolve.outputs.build_run }}'));
 assert.ok(prod.includes("github.actor == 'lui020913'"));
 assert.ok(prod.includes('environment: public-cloudflare-production'));
 assert.ok(read('scripts/release-evidence-policy.mjs').includes('run.display_title===`v911 build source=${sourceSha}`'));
});

test('v8.9.14 candidate checks the exact deployed v8.9.13 predecessor and marker without weakening audit gates',()=>{
 const preview=read('.github/workflows/public-private-source-preview.yml'),prod=read('.github/workflows/public-exact-production.yml'),verify=read('scripts/verify-release-source.mjs');
 for(const workflow of [preview,prod]){
   assert.ok(workflow.includes('.application_version=="8.9.14"'));
   assert.ok(workflow.includes('.application_version=="8.9.13" and .source_commit=="b752b6a0cbffca93b5e39642610b4ec4e9f122b2"'));
 }
 assert.ok(verify.includes("result.application_version==='8.9.14'"));
});
