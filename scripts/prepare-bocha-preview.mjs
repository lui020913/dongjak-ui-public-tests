import { readFileSync, writeFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const productionUrl = 'https://dongjak-walk-safety-preview.pages.dev';
const sourceSha = process.env.GITHUB_SHA;
const buildRun = process.env.GITHUB_RUN_ID;
if (!/^[a-f0-9]{40}$/.test(sourceSha) || !/^[1-9][0-9]*$/.test(buildRun)) {
  throw Error('An exact source commit and Actions run are required');
}

const { version } = read('package.json');
const { releases } = read('src/app-release-log.json');
const newest = releases[0];
if (newest.version !== version || !['major', 'minor', 'patch'].includes(newest.scale)) {
  throw Error('Candidate package and release notes disagree');
}

async function readProduction(path) {
  const response = await fetch(productionUrl + path + '?preview=' + buildRun, {
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw Error('Production metadata request failed with HTTP ' + response.status);
  return response.json();
}

const [previousSource, previousHistory] = await Promise.all([
  readProduction('/release-source.json'),
  readProduction('/ui-autorelease-history.json')
]);
if (previousSource.release_status !== 'DEPLOYED_PRODUCTION' || !Array.isArray(previousHistory.releases)) {
  throw Error('Invalid Production source marker or release archive');
}

write('public/ui-autorelease-history.json', previousHistory);
write('public/release-source.json', {
  source_commit: sourceSha,
  base_source_commit: sourceSha,
  original_application_source: previousSource.original_application_source,
  previous_source: previousSource,
  public_ui_source_commit: previousSource.public_ui_source_commit,
  public_ui_overlay_sha256: previousSource.public_ui_overlay_sha256,
  application_version: version,
  cloud_auth_embedded: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  profile: 'sangdo1-bocha-reference-preview',
  release_scale: newest.scale,
  build_run: buildRun,
  release_status: 'CANDIDATE_PREVIEW_NOT_PRODUCTION'
});
console.log('Prepared Preview metadata for the checked-in release ' + version);
