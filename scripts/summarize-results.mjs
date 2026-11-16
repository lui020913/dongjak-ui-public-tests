import { existsSync, readFileSync, readdirSync, appendFileSync } from 'node:fs';
const folder = 'playwright-json';
const paths = existsSync(folder)
  ? readdirSync(folder).filter(p => p.endsWith('.json')).map(p => folder + '/' + p)
  : [];
if (!paths.length) {
  console.log('No Playwright JSON report found.');
  process.exit(0);
}
const aggregate = { expected: 0, unexpected: 0, skipped: 0 };
const failed = [];
for (const path of paths) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const stats = report.stats || {};
  for (const key of Object.keys(aggregate)) aggregate[key] += Number(stats[key] || 0);
  function scan(suites) {
    for (const suite of suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          if (test.status === 'unexpected') {
            failed.push(spec.title + ' (' + (test.projectName || 'unknown') + ')');
          }
        }
      }
      scan(suite.suites);
    }
  }
  scan(report.suites);
}
const lines = [
  '### Dongjak public remote UI audit',
  '- Anonymous public Pages tests only; no private source, secrets, or deployment',
  '- Scope: ' + (paths.length > 1 || paths[0].includes('focus') ? 'targeted unresolved checks' : 'full suite'),
  '- Passed: ' + aggregate.expected + ', Failed: ' + aggregate.unexpected + ', Skipped: ' + aggregate.skipped,
  '- Failed tests: ' + failed.length,
  ...failed.slice(0, 12).map(x => '- ' + x.replace(/[\r\n]/g, ' ')),
  '- Passed tests from previous runs were intentionally not repeated in targeted mode.',
  '- Public Actions screenshots and artifacts may be visible to anyone.',
  '- Cloudflare Production has not been modified.',
  ''
];
const summary = lines.join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
