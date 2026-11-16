import { existsSync, readFileSync, appendFileSync } from 'node:fs';
const file = 'playwright-json/results.json';
if (!existsSync(file)) { console.log('No Playwright JSON report found.'); process.exit(0); }
const report = JSON.parse(readFileSync(file, 'utf8'));
const stats = report.stats || {};
const failures = [];
function scan(suites) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'unexpected') failures.push(spec.title + ' (' + (test.projectName || 'unknown') + ')');
      }
    }
    scan(suite.suites);
  }
}
scan(report.suites);
const lines = [
  '### Dongjak public remote UI audit',
  '- Anonymous, public Cloudflare Pages only; no private source code, tokens, or deployment',
  '- Passed: ' + (stats.expected ?? '?') + ', Failed: ' + (stats.unexpected ?? '?') + ', Skipped: ' + (stats.skipped ?? '?'),
  '- Failed tests: ' + failures.length,
  ...failures.slice(0, 12).map(x => '- ' + x.replace(/[\r\n]/g, ' ')),
  '- Public repository Actions artifacts and screenshots are publicly accessible.',
  '- Cloudflare production has not been modified.',
  ''
];
const textReport = lines.join('\n');
console.log(textReport);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, textReport);
