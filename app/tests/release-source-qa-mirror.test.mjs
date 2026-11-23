import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('isolated release tests receive the exact root QA sources, without skipping guards',()=>{
 const script=readFileSync(new URL('../../scripts/build-mobile-first-overhaul.sh',import.meta.url),'utf8');
 const copyScripts=script.indexOf('cp -R "$GITHUB_WORKSPACE/scripts/." "$RUNNER_TEMP/scripts/"');
 const copyWorkflows=script.indexOf('cp -R "$GITHUB_WORKSPACE/.github/workflows/." "$RUNNER_TEMP/.github/workflows/"');
 const regression=script.indexOf('node "$GITHUB_WORKSPACE/scripts/run-mobile-regressions.mjs" "$work"');
 assert.ok(copyScripts>0&&copyWorkflows>copyScripts&&regression>copyWorkflows);
 assert.match(script,/cmp -s "\$GITHUB_WORKSPACE\/scripts\/verify-release-monotonic\.mjs" "\$RUNNER_TEMP\/scripts\/verify-release-monotonic\.mjs"/);
 assert.match(script,/cmp -s "\$GITHUB_WORKSPACE\/\.github\/workflows\/mobile-first-overhaul-preview\.yml" "\$RUNNER_TEMP\/\.github\/workflows\/mobile-first-overhaul-preview\.yml"/);
 assert.match(script,/run_private "Application build" npm run build/);
 assert.match(script,/run_private "Release consistency" npm run check:release/);
 assert.doesNotMatch(script,/DONGJAK_SKIP_RELEASE|SKIP_MONOTONIC_RELEASE|SKIP_VERSION_TEST/);
});

test('root mirror cannot accidentally be packaged as part of deployed app data',()=>{
 const script=readFileSync(new URL('../../scripts/build-mobile-first-overhaul.sh',import.meta.url),'utf8');
 const deploy=script.slice(script.indexOf('tar -C "$RUNNER_TEMP/public-application"'));
 assert.match(deploy,/tar -C "\$RUNNER_TEMP\/public-application" -czf "\$RUNNER_TEMP\/mobile-overhaul\.tar\.gz" dist functions server src package\.json package-lock\.json wrangler\.toml/);
});
