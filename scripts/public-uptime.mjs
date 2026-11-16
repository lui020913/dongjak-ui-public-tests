// Public endpoint only. Never send cookies, authorization, API keys or private URLs.
const fallback='https://dongjak-walk-safety-preview.pages.dev/';
const raw=process.env.DONGJAK_TARGET_URL || fallback;
let u;
try { u=new URL(raw); } catch { throw new Error('Invalid target URL'); }
const root='dongjak-walk-safety-preview.pages.dev';
if (u.protocol!=='https:' || u.username || u.password || u.port || u.search || u.hash || u.pathname!=='/' ||
  !(u.hostname===root || u.hostname.endsWith('.'+root))) {
  throw new Error('Uptime target must be the root of an approved public Pages deployment, without query parameters.');
}
let ok=false;
for(let attempt=1;attempt<=3;attempt++){
  const start=Date.now();
  try {
    const response=await fetch(u.href,{
      redirect:'manual',cache:'no-store',
      headers:{'accept':'text/html'},
      signal:AbortSignal.timeout(12000)
    });
    const type=response.headers.get('content-type') || '';
    const data=(await response.text()).slice(0,130000);
    const hasApp=/<(?:div|main|section)[^>]*\bid\s*=\s*["'](?:app|map)["']/i.test(data);
    ok=response.status===200 && /text\/html/i.test(type) && hasApp;
    const line='Attempt '+attempt+': HTTP '+response.status+
      ', HTML='+(/text\/html/i.test(type))+
      ', AppMarker='+hasApp+', elapsed='+ (Date.now()-start) +'ms';
    console.log(line);
    if(ok)break;
  }catch(error){
    console.log('Attempt '+attempt+': '+String(error.name||'network error').slice(0,60));
  }
  if(attempt!==3)await new Promise(resolve=>setTimeout(resolve,1700));
}
const summary=[
  '### Public Cloudflare HTTP availability',
  '- Host: '+u.hostname,
  '- Result: '+(ok?'PASS':'FAIL'),
  '- Source code and private GitHub credentials were NOT used.',
  '- This is an HTTP/HTML marker check; not a functional browser or database test.',''
].join('\n');
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY){
  const fs=await import('node:fs');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
}
if(!ok)process.exitCode=1;
