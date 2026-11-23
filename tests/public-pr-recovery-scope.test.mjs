import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const flow=readFileSync(new URL('../.github/workflows/public-pr-failure-recovery.yml',import.meta.url),'utf8');
test('only branches supported by the existing trusted repair worker trigger its recovery job',()=>{
 const eligibility=flow.slice(flow.indexOf('  recover:\n'),flow.indexOf('    runs-on: ubuntu-24.04',flow.indexOf('  recover:\n')));
 assert.match(eligibility,/github\.event_name == 'workflow_run'/);
 assert.match(eligibility,/github\.event\.workflow_run\.conclusion == 'failure'/);
 assert.match(eligibility,/startsWith\(github\.event\.workflow_run\.head_branch, 'feature\/'\)/);
 assert.match(eligibility,/github\.event\.workflow_run\.head_branch != 'main'/);
 assert.match(flow,/\[\[ "\$FAILED_BRANCH" =~ \^feature\/\[A-Za-z0-9\._\/-\]\+\$ && "\$FAILED_BRANCH" != \*\.\.\* \]\]/);
});
test('production failure recovery remains independent and unchanged',()=>{
 const release=readFileSync(new URL('../.github/workflows/mobile-release-failure-recovery.yml',import.meta.url),'utf8');
 assert.match(release,/workflow_run:/);
 assert.match(release,/head_branch == 'main'/);
 assert.match(release,/conclusion == 'failure'/);
 assert.match(flow,/node --test tests\/public-pr-recovery-scope\.test\.mjs/);
});
