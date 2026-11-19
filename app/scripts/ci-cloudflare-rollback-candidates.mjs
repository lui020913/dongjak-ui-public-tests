import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

const token = process.env.CLOUDFLARE_API_TOKEN || '';
const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const project = process.env.CLOUDFLARE_PAGES_PROJECT || '';
if (!token || !/^[0-9a-f]{32}$/i.test(account) || !/^[a-z0-9][a-z0-9-]*$/.test(project)) {
  process.stderr.write('Cloudflare credential or project variables are missing or invalid.\n');
  process.exit(2);
}
async function cloudflare(path) {
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account +
      '/pages/projects/' + project + path, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Cloudflare request failed with status ' + response.status);
  const data = await response.json();
  if (data.success !== true) throw new Error('Cloudflare API reported an error');
  return data.result;
}
try {
  const projectInfo = await cloudflare('');
  const list = await cloudflare('/deployments?per_page=50');
  if (!Array.isArray(list)) throw new Error('Cloudflare response does not contain a deployment list');
  const items = list.filter(x =>
    x.environment === 'production' && x.latest_stage?.status === 'success' && !x.is_skipped
  ).map(x => ({
    deploymentId: x.id,
    createdAt: x.created_on || '',
    commitShort: String(x.deployment_trigger?.metadata?.commit_hash || '').slice(0, 12),
    environment: x.environment
  })).slice(0, 15);
  const report = {
    checkedAt: new Date().toISOString(),
    project,
    productionBranch: projectInfo.production_branch || null,
    scannedDeployments: list.length,
    successfulProductionCandidates: items,
    note: 'READ ONLY. Nothing was rolled back. Preview deployments are not production rollback targets.'
  };
  mkdirSync('deployment-audit', { recursive: true });
  writeFileSync('deployment-audit/rollback-candidates.json', JSON.stringify(report, null, 2) + '\n');
  const summary = [
    '### Cloudflare Pages production rollback candidates (read-only)',
    '- Project: ' + project,
    '- Production branch: ' + (report.productionBranch || 'unknown'),
    '- Deployments scanned: ' + list.length,
    '- Successful production candidates: ' + items.length,
    '',
    'No deployment was modified. Confirm target version and use the Cloudflare Pages dashboard for any actual production rollback.',
    ''
  ].join('\n');
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} catch (error) {
  process.stderr.write('Read-only rollback inspection failed: ' + String(error.message || error).slice(0, 230) + '\n');
  process.exitCode = 1;
}
