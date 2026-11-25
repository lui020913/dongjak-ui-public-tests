import {androidReleaseTag,androidReleaseAsset,ANDROID_DOWNLOAD_FILENAME} from '../../src/browser-install-menu.mjs';
const REPO='https://api.github.com/repos/lui020913/dongjak-ui-public-tests';
const unavailable=()=>new Response(null,{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const githubHeaders={'Accept':'application/vnd.github+json','User-Agent':'Dongjak-Safety-Map'};
export async function handleAndroidDownload({request,env},fetchImpl=fetch){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 try{
  const markerResponse=await env.ASSETS.fetch(new Request(new URL('/release-source.json',request.url),{headers:{'Cache-Control':'no-cache'}}));
  if(!markerResponse.ok)return unavailable();
  const marker=await markerResponse.json(),tag=androidReleaseTag(marker,'debug');
  if(!tag||marker.source_commit!==marker.public_ui_source_commit)return unavailable();
  const [releaseResponse,tagResponse]=await Promise.all([
   fetchImpl(REPO+'/releases/tags/'+tag,{headers:githubHeaders,signal:AbortSignal.timeout(10000)}),
   fetchImpl(REPO+'/git/ref/tags/'+tag,{headers:githubHeaders,signal:AbortSignal.timeout(10000)})
  ]);
  if(!releaseResponse.ok||!tagResponse.ok)return unavailable();
  const [release,ref]=await Promise.all([releaseResponse.json(),tagResponse.json()]);
  if(ref?.object?.type!=='commit'||ref.object.sha!==marker.source_commit||release?.tag_name!==tag)return unavailable();
  const url=androidReleaseAsset(marker,release,'debug',ref.object.sha);
  if(!url)return unavailable();
  const asset=release.assets.find(a=>a.browser_download_url===url);
  if(!Number.isSafeInteger(asset?.size)||asset.size<=0)return unavailable();
  const headers={'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="'+ANDROID_DOWNLOAD_FILENAME+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Dongjak-APK-Verified':'1','X-Dongjak-APK-Version':marker.application_version,'Content-Length':String(asset.size)};
  if(request.method==='HEAD')return new Response(null,{status:200,headers});
  const upstream=await fetchImpl(url,{redirect:'follow'});
  if(!upstream.ok||!upstream.body)return unavailable();
  const length=upstream.headers.get('content-length');
  if(length!==null&&Number(length)!==asset.size)return unavailable();
  // Stream the immutable release asset. Never buffer the APK in the worker.
  return new Response(upstream.body,{status:200,headers});
 }catch{return unavailable();}
}
export const onRequest=context=>handleAndroidDownload(context);
