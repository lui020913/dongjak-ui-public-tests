import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';

// A conservative, no-network pre-commit security guard. It does not replace
// dedicated secret-scanning or a review of API keys embedded in client code.
const rules = [
  { id: 'private-key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: 'github-token', regex: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { id: 'openai-secret', regex: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{28,}\b/g },
  { id: 'stripe-secret', regex: /\bsk_live_[A-Za-z0-9]{20,}\b/g },
  { id: 'aws-access-key-id', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: 'high-risk-secret-assignment', regex: /\b(?:SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN|GITHUB_PAT|CLIENT_SECRET|PRIVATE_API_KEY)\s*[:=]\s*["']?[A-Za-z0-9._/+==-]{24,}["']?/gi }
];
const ignored = /^(?:node_modules|dist|build|coverage|\.git|test-results|playwright-report|\.wrangler)\//;
const isSecretPath = file => {
  const leaf = file.split('/').at(-1);
  return /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/i.test(leaf) &&
    !/\.(?:example|sample|template)$/i.test(leaf)
    || /\.(?:pem|p12|pfx|key)$/i.test(leaf)
    || /(?:^|\/)(?:id_rsa|id_ed25519)$/i.test(file);
};
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    .split('\0').filter(Boolean);
} catch (error) {
  process.stderr.write('Cannot enumerate repository files: ' + (error.code || error.name) + '\n');
  process.exit(2);
}
const findings = [];
let inspected = 0, skippedLarge = 0;
for (const file of tracked) {
  if (ignored.test(file)) continue;
  if (isSecretPath(file)) findings.push({ file, rule: 'tracked-secret-file' });
  let contents;
  try {
    if (statSync(file).size > 2 * 1024 * 1024) { skippedLarge++; continue; }
    contents = readFileSync(file, 'utf8');
  } catch { continue; }
  if (contents.includes('\u0000')) continue;
  inspected++;
  for (const { id, regex } of rules) {
    regex.lastIndex = 0;
    const hit = regex.exec(contents);
    if (hit) {
      const line = contents.slice(0, hit.index).split('\n').length;
      // Never echo matched credentials or line contents into Actions logs.
      findings.push({ file, rule: id, line });
    }
  }
}
const result = { inspectedFiles: inspected, skippedLargeFiles: skippedLarge,
  checkedTrackedFiles: tracked.length, findings, passed: findings.length === 0 };
const report = 'security-audit/security-guard.json';
mkdirSync(dirname(report), { recursive: true });
writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
const summary = [
  '### Secret and sensitive-file guard',
  'Tracked files: ' + tracked.length + '; inspected text files: ' + inspected,
  'Findings: ' + findings.length + '; files too large to inspect: ' + skippedLarge,
  ...(findings.length ? findings.slice(0, 30).map(v =>
    '- ' + v.rule + ' in ' + JSON.stringify(v.file) + (v.line ? ' (line ' + v.line + ')' : '')) :
    ['No strong-pattern credentials or tracked secret-files detected.']),
  '',
  'This is a pattern-based guard, not proof that the repository is free of secrets.'
].join('\n') + '\n';
process.stdout.write(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (findings.length) process.exitCode = 1;
