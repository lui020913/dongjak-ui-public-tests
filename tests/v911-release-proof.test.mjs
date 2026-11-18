import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public deployment and audit carry the exact build identity',()=>{
 const gate=read('.github/workflows/v911-remote-ui-gate.yml');
 const source=read('scripts/verify-release-source.mjs');
 const build=read('.github/workflows/public-private-source-preview.yml');
 const prod=read('.github/workflows/public-exact-production.yml');
 assert.match(gate,/expected_build_run:/);
 assert.match(gate,/DONGJAK_EXPECTED_BUILD_RUN:/);
 assert.match(source,/String\(result\.build_run\)===expectedBuild/);
 assert.match(source,/target\.hostname !== 'ui-v911-motion-preview\.'/);
 assert.match(build,/expected_build_run:\$build/);
 assert.ok(prod.includes('("v911 UI source="+$sha+" build="+$build)'));
 assert.match(prod,/mobile375 mobile390 tablet768 tablet1024 pc1440/);
 assert.equal((gate.match(/node scripts\/verify-release-source\.mjs/g)||[]).length,2);
});

test('candidate publication is single-attempt and serializes with Production',()=>{
 const build=read('.github/workflows/public-private-source-preview.yml');
 const prod=read('.github/workflows/public-exact-production.yml');
 assert.ok(build.includes('group: dongjak-public-release'));
 assert.ok(prod.includes('group: dongjak-public-release'));
 assert.equal((build.match(/test "\$GITHUB_RUN_ATTEMPT" = 1/g)||[]).length,2);
 assert.match(prod,/\.run_attempt==1/);
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
 assert.match(gate,/viewport: \[mobile375,mobile390,tablet768,tablet820,tablet1024,tablet1180,pc1280,pc1440,pc1920\]/);
});
