/**
 * Fail-closed monotonic release guard. Pure comparison, no API calls or writes.
 * A regular Production promotion must never replace the live app with an older
 * version, or a different source bearing the same version number.
 * Explicit Cloudflare rollback is a separate operator action.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function parseReleaseVersion(value){
 if(typeof value!=='string'||!/^\d+\.\d+\.\d+$/.test(value))
  throw new Error('A numeric major.minor.patch release version is required');
 const parts=value.split('.').map(Number);
 if(!parts.every(Number.isSafeInteger))throw new Error('Unsafe release version component');
 return parts;
}
export function compareReleaseVersions(a,b){
 const lhs=parseReleaseVersion(a),rhs=parseReleaseVersion(b);
 for(let i=0;i<3;i++)if(lhs[i]!==rhs[i])return Math.sign(lhs[i]-rhs[i]);
 return 0;
}
export function verifyMonotonicRelease(previous,candidateVersion,candidateSource){
 if(previous?.release_status!=='DEPLOYED_PRODUCTION')
  throw new Error('Previous Production marker not verified');
 const oldSource=previous?.source_commit;
 if(typeof oldSource!=='string'||!/^[a-f0-9]{40}$/.test(oldSource))
  throw new Error('Previous Production source SHA missing');
 if(typeof candidateSource!=='string'||!/^[a-f0-9]{40}$/.test(candidateSource))
  throw new Error('Candidate source SHA missing');
 const delta=compareReleaseVersions(candidateVersion,previous.application_version);
 if(delta<0)throw new Error('Release downgrade blocked: candidate version precedes live Production');
 if(delta===0&&oldSource!==candidateSource)
  throw new Error('Release version reuse blocked: same version has a different source');
 return {previousVersion:previous.application_version,candidateVersion,repeat:delta===0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [, , markerPath,version,source]=process.argv;
  if(!markerPath)throw new Error('Previous Production release marker is required');
  const previous=JSON.parse(readFileSync(markerPath,'utf8'));
  const result=verifyMonotonicRelease(previous,version,source);
  console.log('PASS monotonic Production release: '+result.previousVersion+' -> '+result.candidateVersion);
 }catch(error){
  console.error('::error::Protected Production promotion refused: '+error.message);
  process.exitCode=1;
 }
}
