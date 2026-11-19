import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const defaultUrl = 'https://dongjak-walk-safety-preview.pages.dev/';
const input = process.env.DONGJAK_MONITOR_URL || defaultUrl;
const tries = 3, timeoutMs = 12000;
const results = [];
function sanitizedUrl(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) {
    throw new Error('Target must be an HTTPS page without userinfo, query, or fragment');
  }
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') || host === 'metadata.google.internal' ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith('[')) {
    throw new Error('Local or numeric IP targets are not permitted');
  }
  return u;
}
async function checkOne(target) {
  const start = performance.now();
  const response = await fetch(target.toString(), {
    redirect: 'manual', cache: 'no-store',
    headers: { 'user-agent': 'DongjakSafetyMap-UptimeAudit/1.0', accept: 'text/html,*/*;q=0.8' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const milliseconds = Math.round(performance.now() - start);
  const status = response.status;
  // Redirects to sign-in pages, missing deployments or other domains count as not-ready.
  if (status >= 300 && status < 400) {
    return { ok: false, status, milliseconds, reason: 'HTTP redirect; deployment target must serve the app directly' };
  }
  if (status < 200 || status > 299) {
    return { ok: false, status, milliseconds, reason: 'Non-success HTTP response' };
  }
  const type = response.headers.get('content-type') || '';
  if (!/text\/html/i.test(type)) {
    return { ok: false, status, milliseconds, reason: 'Unexpected content type' };
  }
  const text = (await response.text()).slice(0, 150000);
  const appMarkers = /id\s*=\s*["'](?:map|app)["']/i.test(text);
  return {
    ok: true, status, milliseconds,
    reason: appMarkers ? 'HTTP and HTML app marker present' : 'HTTP HTML OK; app marker not identified',
    appMarkerFound: appMarkers
  };
}
let validTarget;
try {
  validTarget = sanitizedUrl(input);
} catch (e) {
  process.stderr.write('Invalid monitoring configuration: ' + e.message + '\n');
  process.exit(2);
}
for (let attempt = 1; attempt <= tries; attempt++) {
  try {
    results.push({ attempt, ...await checkOne(validTarget) });
    if (results.at(-1).ok) break;
  } catch (e) {
    results.push({ attempt, ok: false, reason: e.name === 'TimeoutError' ? 'Timeout' :
      String(e.cause?.code || e.code || e.name || 'NetworkError').slice(0, 100) });
  }
  if (attempt < tries) await new Promise(resolve => setTimeout(resolve, 1800));
}
const healthy = results.at(-1)?.ok === true;
const report = {
  checkedAt: new Date().toISOString(),
  targetHost: validTarget.hostname,
  targetPath: validTarget.pathname,
  healthy,
  attempts: results,
  note: 'HTTP reachability test, not a browser/WebGL or third-party API test. GitHub schedule may be delayed.'
};
mkdirSync('uptime-audit', { recursive: true });
writeFileSync('uptime-audit/latest.json', JSON.stringify(report, null, 2) + '\n');
const last = results.at(-1);
const summary = [
  '### Dongjak preview service health check',
  '- Target: ' + report.targetHost + report.targetPath,
  '- Result: ' + (healthy ? 'HTTP responsive' : 'FAILED'),
  '- Attempts: ' + results.length,
  '- Last HTTP status: ' + (last?.status ?? 'no response'),
  '- Last response time: ' + (last?.milliseconds ?? 'not measured') + ' ms',
  '- Detail: ' + (last?.reason || 'unknown'),
  '',
  'This check does not prove the map renders or that external APIs work.',
  ''
].join('\n');
process.stdout.write(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (!healthy) process.exitCode = 1;
