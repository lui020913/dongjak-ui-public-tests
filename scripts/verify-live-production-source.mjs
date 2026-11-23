/**
 * Read-only Production source eligibility.
 * A root-level docs/QA commit must not suppress anonymous Production auditing
 * if the deployed commit and current main have identical app/ tree contents.
 * If the comparison cannot be made, fail closed: the audit is skipped.
 */
import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const SHA=/^[a-f0-9]{40}$/;
const VERSION=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function validLiveMarker(marker,mainSha){
 return Boolean(
  marker?.release_status==='DEPLOYED_PRODUCTION' &&
  SHA.test(marker.source_commit||'') &&
  marker.source_commit===marker.public_ui_source_commit &&
  SHA.test(mainSha||'') &&
  VERSION.test(marker.application_version||'')
 );
}
export function canAuditProduction(marker,mainSha,matchingAppTree=false){
 if(!validLiveMarker(marker,mainSha))return false;
 return marker.source_commit===mainSha || matchingAppTree===true;
}
export function isCurrentAppTree(marker,mainSha,{cwd=process.cwd(),run=execFileSync}={}){
 if(!validLiveMarker(marker,mainSha))return false;
 if(marker.source_commit===mainSha)return true;
 try{
  // Only a validated immutable 40-character SHA reaches git.
  run('git',['fetch','--no-tags','--quiet','--depth=1','origin',marker.source_commit],
   {cwd,timeout:30000,stdio:'ignore'});
  run('git',['diff','--quiet',marker.source_commit,mainSha,'--','app/'],
   {cwd,timeout:30000,stdio:'ignore'});
  return true;
 }catch{return false;}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const path=process.argv[2];
 if(!path)throw Error('Read-only Production marker JSON argument required');
 const marker=JSON.parse(readFileSync(path,'utf8'));
 const sha=process.env.GITHUB_SHA||'';
 const match=isCurrentAppTree(marker,sha);
 const current=canAuditProduction(marker,sha,match);
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'current='+current+'\n');
 console.log(current?'Production app tree is unchanged; anonymous QA can run.':'Production app tree changed or could not be verified; skip audit safely.');
}
