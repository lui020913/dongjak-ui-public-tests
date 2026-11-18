export const REPOSITORY='lui020913/dongjak-ui-public-tests';
export const PREVIEW_URL='https://ui-v911-motion-preview.dongjak-walk-safety-preview.pages.dev/';
export const REQUIRED_VIEWPORTS=Object.freeze([
  'mobile375','mobile390','tablet768','tablet820','tablet1024','tablet1180','pc1280','pc1440','pc1920'
]);
const validSha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const ownerActor=login=>login==='lui020913';

export function parseEvidenceRunIds(value){
  const ids=Array.isArray(value)?value.map(String):typeof value==='string'?value.split(','):[];
  if(!ids.length||ids.length>30||ids.some(id=>!/^[1-9][0-9]*$/.test(id)))throw Error('Evidence runs must be 1-30 comma-separated positive run IDs');
  if(new Set(ids).size!==ids.length)throw Error('Evidence run IDs must be unique');
  return ids.map(Number);
}

export function isTrustedBuildRun(run,sourceSha,expectedId){
  return !!run&&(!expectedId||Number(run.id)===Number(expectedId))&&
    run.conclusion==='success'&&run.run_attempt===1&&
    run.head_branch==='main'&&run.head_repository?.full_name===REPOSITORY&&
    ownerActor(run.actor?.login)&&
    run.path==='.github/workflows/public-private-source-preview.yml'&&
    ['push','workflow_dispatch'].includes(run.event)&&
    (run.display_title===`v911 build source=${sourceSha}`||
     (run.event==='workflow_dispatch'&&run.display_title==='v911 build source=latest'));
}

export function standardAuditBuildId(run,sourceSha){
  if(!run||run.conclusion!=='success'||run.run_attempt!==1||
     run.event!=='workflow_dispatch'||run.head_branch!=='main'||
     run.head_repository?.full_name!==REPOSITORY||
     !['github-actions[bot]','lui020913'].includes(run.actor?.login)||
     run.path!=='.github/workflows/v911-remote-ui-gate.yml')return null;
  const match=/^v911 UI source=([a-f0-9]{40}) build=([1-9][0-9]*)$/.exec(run.display_title||'');
  if(!match||match[1]!==sourceSha)return null;
  return Number(match[2]);
}

export function successfulViewportCoverage(jobs){
  const successful=new Set((jobs||[]).filter(job=>job?.conclusion==='success').map(job=>job.name));
  return REQUIRED_VIEWPORTS.filter(viewport=>successful.has(`ui (${viewport})`));
}

export function validateFocusedTabletEvidence({run,request,workflow,jobs,sourceSha,buildRun}){
  if(!run||run.conclusion!=='success'||run.run_attempt!==1||
     run.event!=='push'||run.head_branch!=='main'||
     run.head_repository?.full_name!==REPOSITORY||
     !ownerActor(run.actor?.login)||
     run.path!=='.github/workflows/v911-tablet768-only.yml')return false;
  if(!request||request.source_sha!==sourceSha||
     Number(request.build_run)!==Number(buildRun)||request.target_url!==PREVIEW_URL)return false;
  if(typeof workflow!=='string'||
     !workflow.includes("--project=tablet768 --grep 'tablet More panel is fully visible and contained'")||
     !workflow.includes('node scripts/verify-release-source.mjs'))return false;
  return (jobs||[]).some(job=>job?.name==='ui (tablet768 only)'&&job.conclusion==='success');
}

export function missingViewports(covered){
  const set=covered instanceof Set?covered:new Set(covered||[]);
  return REQUIRED_VIEWPORTS.filter(viewport=>!set.has(viewport));
}

export function mergeCoverage(...groups){
  return new Set(groups.flatMap(group=>Array.from(group||[])));
}

export function isValidSourceSha(value){return validSha(value);}
