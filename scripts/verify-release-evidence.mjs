import {
  REPOSITORY,PREVIEW_URL,parseEvidenceRunIds,isTrustedBuildRun,
  standardAuditBuildId,successfulViewportCoverage,verifiedPartialCoverage,validateFocusedTabletEvidence,
  missingViewports,isValidSourceSha
} from './release-evidence-policy.mjs';

const sourceSha=process.env.SOURCE_SHA||'';
const buildRun=Number(process.env.BUILD_RUN||0);
const evidenceRunIds=parseEvidenceRunIds(process.env.EVIDENCE_RUNS||'');
const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN||'';
if(!isValidSourceSha(sourceSha))throw Error('Invalid release source SHA');
if(!Number.isSafeInteger(buildRun)||buildRun<1)throw Error('Invalid release build run ID');
if(!token)throw Error('GitHub read token unavailable');

const api=async path=>{
  const response=await fetch(`https://api.github.com/repos/${REPOSITORY}/${path}`,{
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error(`GitHub evidence lookup failed (${response.status})`);
  return response.json();
};
const build=await api(`actions/runs/${buildRun}`);
if(!isTrustedBuildRun(build,sourceSha,buildRun))throw Error('Release build is not a successful exact-source public build');

const covered=new Set();
const accepted=[];
let successfulStandard=false,usedPartial=false;
for(const evidenceRunId of evidenceRunIds){
  const run=await api(`actions/runs/${evidenceRunId}`);
  const jobsResponse=await api(`actions/runs/${evidenceRunId}/jobs?per_page=100`);
  const jobs=jobsResponse.jobs||[];

  const auditBuildId=standardAuditBuildId(run,sourceSha,{allowPartial:true});
  if(auditBuildId){
    const auditBuild=await api(`actions/runs/${auditBuildId}`);
    if(!isTrustedBuildRun(auditBuild,sourceSha,auditBuildId))throw Error(`Audit ${evidenceRunId} references an unverified or different-source build`);
    if(run.conclusion==='failure'){
      if(auditBuildId!==buildRun)throw Error('Partial evidence must reference the exact release build');
      const partial=verifiedPartialCoverage(jobs);
      if(!partial.length)throw Error('Partial evidence has no verified successful jobs');
      for(const viewport of partial)covered.add(viewport);
      usedPartial=true;
    }else{
      if(auditBuildId===buildRun)successfulStandard=true;
      for(const viewport of successfulViewportCoverage(jobs))covered.add(viewport);
    }
    accepted.push(`${evidenceRunId}:standard-build-${auditBuildId}`);
    continue;
  }

  if(run?.path==='.github/workflows/v911-tablet768-only.yml'){
    const ref=encodeURIComponent(run.head_sha||'');
    if(!ref)throw Error(`Focused audit ${evidenceRunId} has no commit SHA`);
    const [requestFile,workflowFile]=await Promise.all([
      api(`contents/release/tablet768-audit-request.json?ref=${ref}`),
      api(`contents/.github/workflows/v911-tablet768-only.yml?ref=${ref}`)
    ]);
    const request=JSON.parse(Buffer.from(requestFile.content||'','base64').toString('utf8'));
    const workflow=Buffer.from(workflowFile.content||'','base64').toString('utf8');
    if(!validateFocusedTabletEvidence({run,request,workflow,jobs,sourceSha,buildRun}))
      throw Error(`Focused audit ${evidenceRunId} does not prove the requested tablet768 More-panel test on this exact build`);
    covered.add('tablet768');
    accepted.push(`${evidenceRunId}:tablet768-more-panel`);
    continue;
  }

  throw Error(`Unsupported or untrusted UI evidence run: ${evidenceRunId}`);
}

if(usedPartial&&!successfulStandard)throw Error('Partial evidence requires a successful standard audit of the exact release build');
const missing=missingViewports(covered);
if(missing.length)throw Error(`Cumulative UI evidence incomplete; missing: ${missing.join(', ')}`);
console.log(`Exact release build verified: ${buildRun} / ${sourceSha}`);
console.log(`Accepted cumulative UI evidence: ${accepted.join(', ')}`);
console.log('All required viewports covered: mobile375, mobile390, tablet768, tablet820, tablet1024, tablet1180, pc1280, pc1440, pc1920');
console.log('Evidence target: '+PREVIEW_URL);
