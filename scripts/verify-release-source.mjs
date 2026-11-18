// Exact release-source guard. No credentials, private source, or network side effects.
const raw = process.env.DONGJAK_EXPECTED_SOURCE_SHA?.trim() || '';
const expectedBuild = process.env.DONGJAK_EXPECTED_BUILD_RUN?.trim() || '';
if(expectedBuild && (!raw || !/^[1-9][0-9]*$/.test(expectedBuild)))throw Error('Exact build run requires a numeric run ID and a source SHA.');
if (!raw) {
  console.log('Standalone public UI audit: source SHA constraint not requested.');
  process.exit(0);
}
if (!/^[a-f0-9]{40}$/i.test(raw)) {
  throw new Error('Expected Preview source must be one 40-character Git commit SHA.');
}
const target = new URL(process.env.DONGJAK_TARGET_URL ||
  'https://v881-integrated-1116.dongjak-walk-safety-preview.pages.dev/');
const root = 'dongjak-walk-safety-preview.pages.dev';
if (target.protocol !== 'https:' || target.username || target.password ||
    target.port || target.search || target.hash || target.pathname !== '/' ||
    !(target.hostname === root || target.hostname.endsWith('.' + root))) {
  throw new Error('Preview source guard requires an approved public HTTPS Pages root URL.');
}
if(expectedBuild && target.hostname !== 'ui-v911-motion-preview.'+root)throw Error('Public v911 build proof requires the exact candidate Preview hostname.');
const endpoint = new URL('release-source.json', target);
let marker;
for (let n = 1; n <= 4; n++) {
  const resp = await fetch(endpoint, {
    redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(25000),
    headers:{accept:'application/json'}
  });
  if (resp.ok) {
    const result = await resp.json();
    const sha = String(result.source_commit||'').trim().toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Preview release-source.json is missing an immutable source_commit.');
    if (sha === raw.toLowerCase() && result.release_status === 'CANDIDATE_PREVIEW_NOT_PRODUCTION' &&
        (!expectedBuild || (String(result.build_run)===expectedBuild && result.application_version==='8.9.12'))) {
      marker = result; break;
    }
    console.log('Preview source not yet matching requested revision, attempt ' + n);
  } else {
    console.log('Preview source marker HTTP status: ' + resp.status + ', attempt ' + n);
  }
  if(n<4) await new Promise(ok=>setTimeout(ok,3500));
}
if(!marker) throw new Error('Preview SHA, build run or Preview-only release status mismatched. Audit blocked.');
console.log('Verified Preview source_commit: '+marker.source_commit+(expectedBuild?' build_run: '+expectedBuild:''));
