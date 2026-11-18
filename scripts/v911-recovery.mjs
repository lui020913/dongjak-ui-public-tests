import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {classify,sourcePin,recoveryDecision,modelInput,ADVICE,CATEGORIES,MAX_ATTEMPTS} from './v911-recovery-policy.mjs';
const repo='lui020913/dongjak-ui-public-tests';
if(process.env.GITHUB_REPOSITORY!==repo)throw Error('Repository mismatch');
const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const run=event.workflow_run||{};
const ui=run.path==='.github/workflows/v911-remote-ui-gate.yml';
const build=run.path==='.github/workflows/public-private-source-preview.yml';
if((!ui&&!build)||run.conclusion!=='failure'||run.head_branch!=='main'||run.head_repository?.full_name!==repo||!Number.isSafeInteger(run.id))process.exit(0);
if(ui&&(run.event!=='workflow_dispatch'||!['github-actions[bot]','lui020913'].includes(run.actor?.login)))process.exit(0);
if(build&&(!['push','workflow_dispatch'].includes(run.event)||run.actor?.login!=='lui020913'))process.exit(0);
const gh=(endpoint,...args)=>execFileSync('gh',['api',endpoint,...args],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:30000,stdio:['ignore','pipe','ignore']});
const jobs=JSON.parse(gh('repos/'+repo+'/actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100')).jobs;
const failed=jobs.filter(j=>j.conclusion==='failure'||j.conclusion==='timed_out');
const hints=[];
function preciseHint(job,log){
 if(!(job.steps||[]).some(t=>t.conclusion==='failure'&&t.name.includes('playwright test')))return null;
 if((job.steps||[]).some(t=>t.conclusion==='failure'&&t.name.includes('Verify exact Preview')))return null;
 if(!/\b1 failed\b/.test(log)||/\b[2-9]\d* failed\b/.test(log))return null;
 if(job.name==='ui (tablet1180)'&&/TRANSIT_GRIP_DIAGNOSTIC \{"centerError":(?:[2-9]|[1-9][0-9]+)(?:\.\d+)?[,}]/.test(log))return 'transit-grip';
 if(/^ui \(mobile(?:375|390)\)$/.test(job.name)&&/locator\('#dj840-map-tip'\)/.test(log)&&/toBeHidden/.test(log)&&/"webappTipVisible":"true"/.test(log))return 'install-tip';
 if(/toHaveCSS/.test(log)&&/object-fit/.test(log)&&/Expected:\s*"?contain"?/.test(log)&&/Received:\s*"?(?:cover|fill)"?/.test(log)&&/dj860-screen-image/.test(log))return 'onboarding-fit';
 return null;
}
const diagnostics=failed.map(j=>{
 let log='';
 // Public anonymous browser logs only; never fetch private-build output.
 if(ui&&Number.isSafeInteger(j.id))try{log=gh('repos/'+repo+'/actions/jobs/'+j.id+'/logs').replace(/\x1b\[[0-9;]*m/g,'');}catch{}
 hints.push(ui?preciseHint(j,log):null);
 return classify(j,log);
});
const pin=ui?sourcePin(run.display_title):null;
let exactCandidate=false;
if(pin)try{
 const response=await fetch('https://ui-v911-motion-preview.dongjak-walk-safety-preview.pages.dev/release-source.json?recovery='+run.id,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
 const marker=await response.json();
 const prior=JSON.parse(gh('repos/'+repo+'/actions/runs/'+pin.build));
 exactCandidate=response.ok&&marker.source_commit===pin.sha&&String(marker.build_run)===pin.build&&marker.release_status==='CANDIDATE_PREVIEW_NOT_PRODUCTION'&&marker.application_version==='8.9.11'&&prior.conclusion==='success'&&prior.run_attempt===1&&prior.actor?.login==='lui020913'&&prior.path==='.github/workflows/public-private-source-preview.yml'&&prior.head_branch==='main'&&prior.head_repository?.full_name===repo&&((prior.event==='push'&&prior.display_title==='v911 build source='+pin.sha)||(prior.event==='workflow_dispatch'&&['v911 build source='+pin.sha,'v911 build source=latest'].includes(prior.display_title)));
 // Also ensure no newer owner build is queued/running before rerunning.
 const newer=JSON.parse(gh('repos/'+repo+'/actions/workflows/public-private-source-preview.yml/runs?branch=main&per_page=15')).workflow_runs;
 if(newer.some(x=>Number(x.id)>Number(pin.build)&&['queued','in_progress','requested','waiting','pending'].includes(x.status)))exactCandidate=false;
}catch{}
if(ui&&!exactCandidate){console.log('Superseded or unverified candidate; no automatic action.');process.exit(0);}
const attempt=Number(run.run_attempt);
const decision=recoveryDecision({attempt,diagnostics,exactCandidate,isUi:ui});
const summary=modelInput(diagnostics);
const url='https://github.com/'+repo+'/actions/runs/'+run.id;
if(decision==='retry'){
 try{
   gh('repos/'+repo+'/actions/runs/'+run.id+'/rerun','--method','POST');
   console.log('Verified exact UI audit retried; next attempt '+(attempt+1)+'/'+MAX_ATTEMPTS);
   process.exit(0);
 }catch{console.log('Automatic retry could not be submitted.');}
}
// Bounded Gemini classification: enum-only response; no source, stack trace, raw log, credential or arbitrary generated command.
let advice=summary[0]?.category||'unknown';
const designContract=readFileSync(new URL('../docs/design/APP_DESIGN_CONTRACT.md',import.meta.url),'utf8');
const key=process.env.GEMINI_API_KEY;
if(key&&summary.length){
 try{
   const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({systemInstruction:{parts:[{text:'Choose the primary failure category from the given sanitized diagnostics. Return only one enum value. Do not propose commands or change the tests.'}]},contents:[{parts:[{text:JSON.stringify({diagnostics:summary,attempt,designContract})}]}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{category:{type:'STRING',enum:CATEGORIES}},required:['category']},maxOutputTokens:128}})});
   if(res.ok){const out=await res.json();const result=JSON.parse(out.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('')||'{}');if(CATEGORIES.includes(result.category)&&summary.some(d=>d.category===result.category))advice=result.category;}
 }catch{console.log('Gemini diagnosis unavailable; deterministic classification retained.');}
}
// Only one independently reproducible repair ID, never generated code.
if(ui&&exactCandidate&&attempt<MAX_ATTEMPTS&&hints.length&&hints[0]&&hints.every(x=>x===hints[0])&&process.env.GITHUB_OUTPUT){
 appendFileSync(process.env.GITHUB_OUTPUT,'repair='+hints[0]+'\nsource='+pin.sha+'\naudit='+run.id+'\n');
 console.log('Eligible private repair requested: '+hints[0]);
 process.exit(0);
}
const detail=summary.map(d=>(d.viewport||'build')+' · '+d.category).join('\n')||'확인 가능한 실패 단계 없음';
const text='@lui020913 자동 복구 중단 · 코드 또는 환경 확인 필요\n\n'+detail+'\n\n'+ADVICE[advice]+'\n검증을 생략하거나 Production을 배포하지 않았습니다.\n'+url;
const marker='<!-- v911-recovery:'+run.id+':'+attempt+' -->';
try{
 const comments=gh('repos/'+repo+'/issues/15/comments?per_page=100','--paginate');
 if(!comments.includes(marker))gh('repos/'+repo+'/issues/15/comments','--method','POST','-f','body='+text+'\n'+marker);
}catch{console.log('Unable to post recovery notice.');}
console.log('Recovery stopped; '+advice);
