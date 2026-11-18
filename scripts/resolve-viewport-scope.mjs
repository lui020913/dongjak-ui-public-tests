import {appendFileSync} from 'node:fs';
import {selectViewportScope,isFullAudit} from './viewport-scope-policy.mjs';
const repo='lui020913/dongjak-ui-public-tests',privateRepo='lui020913/dongjak-safety-map';
const sha=process.env.SOURCE_SHA||'';
const validSha=s=>/^[a-f0-9]{40}$/.test(s||'');
const api=async(path,token)=>{
 if(!token)throw Error('credential unavailable');
 const res=await fetch('https://api.github.com/'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!res.ok)throw Error('comparison unavailable');
 return res.json();
};
const publicApi=path=>api('repos/'+repo+'/'+path,process.env.PUBLIC_ACTIONS_TOKEN);
const privateApi=path=>api('repos/'+privateRepo+'/'+path,process.env.PRIVATE_SOURCE_TOKEN);
let scope='full';
try{
 if(process.env.GITHUB_REPOSITORY!==repo||!validSha(sha))throw Error('invalid source context');
 const runs=await publicApi('actions/workflows/v911-remote-ui-gate.yml/runs?branch=main&status=success&per_page=25');
 let base;
 for(const run of (runs.workflow_runs||[]).slice(0,12)){
   const m=/^v911 UI source=([a-f0-9]{40}) build=([1-9][0-9]*)$/.exec(run.display_title||'');
   if(!m||m[1]===sha||run.event!=='workflow_dispatch'||run.head_branch!=='main'||run.head_repository?.full_name!==repo||run.path!=='.github/workflows/v911-remote-ui-gate.yml'||run.conclusion!=='success'||!['github-actions[bot]','lui020913'].includes(run.actor?.login)||!Number.isSafeInteger(run.id)||!Number.isSafeInteger(run.run_attempt))continue;
   const jobs=await publicApi('actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100');
   if(!isFullAudit(jobs.jobs))continue;
   const build=await publicApi('actions/runs/'+m[2]);
   if(build.conclusion!=='success'||build.run_attempt!==1||build.head_branch!=='main'||build.head_repository?.full_name!==repo||build.actor?.login!=='lui020913'||build.path!=='.github/workflows/public-private-source-preview.yml'||!['push','workflow_dispatch'].includes(build.event)||![ 'v911 build source='+m[1], 'v911 build source=latest' ].includes(build.display_title))continue;
   base=m[1];break;
 }
 if(!base)throw Error('no full baseline');
 const compare=await privateApi('compare/'+base+'...'+sha+'?per_page=1');
 if(compare.base_commit?.sha!==base||compare.merge_base_commit?.sha!==base)throw Error('not a descendant');
 // GitHub compare lists at most 300 filenames on page one. Fail closed on a cap.
 scope=await selectViewportScope(compare,async path=>{
   const encoded=path.split('/').map(encodeURIComponent).join('/');
   const contents=await Promise.all([base,sha].map(ref=>privateApi('contents/'+encoded+'?ref='+ref)));
   return contents.map(f=>{
     if(f.type!=='file'||f.encoding!=='base64'||typeof f.content!=='string'||f.size>1000000)throw Error('unsupported file');
     return Buffer.from(f.content,'base64').toString('utf8');
   });
 });
}catch{console.log('No safe device-only comparison proof; using full browser matrix.');}
appendFileSync(process.env.GITHUB_OUTPUT,'scope='+scope+'\n');
console.log('Browser verification scope: '+scope);
