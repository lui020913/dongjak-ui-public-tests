import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bumpVersion,classifyReleaseNotes} from './release-scope-policy.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,d)=>writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const pkg=read('package.json'),lock=read('package-lock.json'),log=read('src/app-release-log.json');
const current=log.releases[0], history=log.releases.slice(1);
if(pkg.version!==current.version||pkg.version!==lock.version||pkg.version!==lock.packages[''].version||
   history.length<64||history[0].previousVersion!=='8.9.1'||!history.every(r=>r.historyMigration&&typeof r.previousVersion==='string'&&Array.isArray(r.originalItems)))throw Error('Wrong audited source baseline');
// Restore the old metadata only in this disposable checkout to let the trusted existing
// baseline preparer retrieve the exact live Production marker and original release notes.
// Do not pass the review API key to the private-source child process.
const originalFiles=['package.json','package-lock.json','src/app-release-log.json'];
const backups=originalFiles.map(p=>readFileSync(p));
let deployed,source;
try {
  const oldPkg=structuredClone(pkg),oldLock=structuredClone(lock);
  oldPkg.version=oldLock.version=oldLock.packages[''].version='8.9.1';
  const oldLog={...log,releases:history.map(r=>({version:r.previousVersion,date:r.date,scale:r.scale,items:r.originalItems}))};
  write('package.json',oldPkg);write('package-lock.json',oldLock);write('src/app-release-log.json',oldLog);
  const env={...process.env};delete env.GEMINI_API_KEY;delete env.GEMINI_MODEL;
  execFileSync(process.execPath,['scripts/ci-v911-release.mjs'],{env,stdio:'pipe',timeout:110000});
  deployed=read('src/app-release-log.json');source=read('public/release-source.json');
} finally {
  originalFiles.forEach((p,i)=>writeFileSync(p,backups[i]));
}
if(source.source_commit!==process.env.GITHUB_SHA||source.release_status!=='CANDIDATE_PREVIEW_NOT_PRODUCTION'||
  source.previous_source?.application_version!=='8.9.14'||deployed.releases[0]?.version!=='8.9.14')throw Error('Legacy Production checkpoint mismatch');
const byOld=new Map(deployed.releases.map(r=>[r.version,r]));
const additions=Array.from({length:13},(_,i)=>byOld.get('8.9.'+(i+2)));
if(additions.some(r=>!r||!Array.isArray(r.items)||!r.items.length))throw Error('Live release history 8.9.2 through 8.9.14 is incomplete');
// Only notes already intended for public display leave the runner for Gemini,
// never source code, secrets, user records, or the raw production marker.
const records=[...additions.map(r=>({id:r.version,items:r.items})),{id:'candidate',items:current.items}];
const {model,decisions}=await classifyReleaseNotes(records);
if(decisions.get('candidate').scope!=='minor')throw Error('AI disagrees with reviewed new-layer Minor classification');
let previous=history[0].version;
const mapped=[];
for(const r of additions){
  const d=decisions.get(r.version),next=bumpVersion(previous,d.scope);
  mapped.push({...r,version:next,previousVersion:r.version,sourceVersion:'v'+r.version,historyMigration:'2026-11-18-app-release-semver-audit-continuation',originalItems:[...r.items],scale:d.scope,classification:{provider:'Google Gemini',model,...d}});
  previous=next;
}
const decision=decisions.get('candidate'),version=bumpVersion(previous,decision.scope);
const latest={...current,version,previousVersion:previous,sourceVersion:'v'+current.version+' (audited source proposal)',scale:decision.scope,classification:{provider:'Google Gemini',model,...decision,priorReview:current.classification}};
const releases=[latest,...mapped.reverse(),...history];
if(releases.length!==log.releases.length+13||new Set(releases.map(r=>r.version)).size!==releases.length)throw Error('Release history preservation failed');
log.releases=releases;
pkg.version=lock.version=lock.packages[''].version=version;
source.application_version=version;source.profile='sangdo1-bocha-reference-preview';
source.release_scale=decision.scope;source.version_review={provider:'Google Gemini',model,base_version:previous,original_production_version:'8.9.14',historical_records_preserved:history.length+13,classification_confidence:decision.confidence};
write('package.json',pkg);write('package-lock.json',lock);write('src/app-release-log.json',log);write('public/release-source.json',source);
write('public/batch-v911-candidate.json',{scope:'Sangdo1 actual source-data layer and mobile UI; isolated Preview only',previous_version:'8.9.14',source_commit:process.env.GITHUB_SHA});
console.log('Prepared reviewed '+decision.scope+' Preview '+version+'; preserved '+(history.length+13)+' historical records');
