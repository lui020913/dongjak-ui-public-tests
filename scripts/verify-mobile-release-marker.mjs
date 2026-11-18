import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export function mobileReleaseMarkerMatches(marker,expected) {
  return String(marker?.source_commit||'')===expected.sourceSha &&
    String(marker?.public_ui_source_commit||'')===expected.publicSha &&
    String(marker?.public_ui_overlay_sha256||'')===expected.cssSha &&
    String(marker?.application_version||'')===expected.appVersion &&
    String(marker?.build_run||'')===expected.buildRun &&
    String(marker?.release_status||'')==='CANDIDATE_PREVIEW_NOT_PRODUCTION';
}

export async function verifyMobileReleaseMarker({targetUrl,sourceSha,publicSha,cssSha,appVersion,buildRun,stage='mobile-qa',fetchImpl=fetch}) {
  if(!['mobile-qa','mobile-post'].includes(stage))throw new Error('Unsupported mobile marker verification stage.');
  const expected={sourceSha,publicSha,cssSha,appVersion,buildRun:String(buildRun||'')};
  if(!/^[a-f0-9]{40}$/.test(expected.sourceSha||'')||!/^[a-f0-9]{40}$/.test(expected.publicSha||'')||
     !/^[a-f0-9]{64}$/.test(expected.cssSha||'')||!expected.appVersion||!/^[1-9][0-9]*$/.test(expected.buildRun)) {
    throw new Error('Mobile release marker expectations are incomplete or malformed.');
  }
  const root=new URL(targetUrl);
  if(root.protocol!=='https:'||root.username||root.password||root.port||root.search||root.hash||root.pathname!=='/') {
    throw new Error('Mobile release marker requires an HTTPS Preview root URL.');
  }
  const markerUrl=new URL('release-source.json?'+stage+'='+encodeURIComponent(expected.buildRun),root);
  const response=await fetchImpl(markerUrl,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{accept:'application/json'}});
  if(!response.ok)throw new Error('Preview release marker returned HTTP '+response.status+'.');
  const marker=await response.json();
  if(!mobileReleaseMarkerMatches(marker,expected))throw new Error('Preview release marker does not match the exact mobile-tested candidate.');
  return marker;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const stage=process.argv[2]||'mobile-qa';
  const marker=await verifyMobileReleaseMarker({
    targetUrl:process.env.DONGJAK_TARGET_URL,
    sourceSha:process.env.SOURCE_SHA,
    publicSha:process.env.PUBLIC_SHA,
    cssSha:process.env.CSS_SHA,
    appVersion:process.env.APP_VERSION,
    buildRun:process.env.BUILD_RUN,
    stage
  });
  console.log('Verified '+stage+' marker for source '+marker.source_commit+' and build '+marker.build_run+'.');
}
