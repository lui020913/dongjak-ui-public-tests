// Verify the exact immutable Preview marker before and after browser capture.
const hex40=/^[0-9a-f]{40}$/i,hex64=/^[0-9a-f]{64}$/i;
const expected={source_commit:process.env.SOURCE_SHA,public_ui_source_commit:process.env.PUBLIC_SHA,public_ui_overlay_sha256:process.env.CSS_SHA,application_version:process.env.APP_VERSION,build_run:process.env.BUILD_RUN,release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'};
if(!hex40.test(expected.source_commit||'')||!hex40.test(expected.public_ui_source_commit||'')||!hex64.test(expected.public_ui_overlay_sha256||'')||!/^\d+\.\d+\.\d+$/.test(expected.application_version||'')||!/^\d+$/.test(expected.build_run||''))throw Error('Missing exact visual candidate identity');
const url=new URL(process.env.DONGJAK_TARGET_URL);
if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||!/^([a-z0-9-]+\.)dongjak-walk-safety-preview\.pages\.dev$/.test(url.hostname))throw Error('Require an isolated HTTPS Preview origin');
const endpoint=new URL('/release-source.json',url);endpoint.searchParams.set('visual-qa',expected.build_run);
const response=await fetch(endpoint,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error('Preview marker unavailable');
const marker=await response.json();
if(!Object.entries(expected).every(([k,v])=>String(marker[k])===String(v)))throw Error('Exact visual Preview provenance mismatch');
console.log('Verified exact visual Preview: '+expected.public_ui_source_commit);
