import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPOSITORY,PREVIEW_URL,REQUIRED_VIEWPORTS,parseEvidenceRunIds,isTrustedBuildRun,
  standardAuditBuildId,successfulViewportCoverage,validateFocusedTabletEvidence,
  missingViewports,mergeCoverage
} from '../scripts/release-evidence-policy.mjs';

const source='b752b6a0cbffca93b5e39642610b4ec4e9f122b2';
const baseRun={
  id:44279513261,conclusion:'success',run_attempt:1,event:'push',head_branch:'main',
  head_repository:{full_name:REPOSITORY},actor:{login:'lui020913'},
  path:'.github/workflows/public-private-source-preview.yml',
  display_title:'v911 build source='+source
};

test('evidence run IDs are parsed strictly and remain unique',()=>{
  assert.deepEqual(parseEvidenceRunIds('44279699056,44283065167'),[44279699056,44283065167]);
  assert.throws(()=>parseEvidenceRunIds('44279699056,44279699056'));
  assert.throws(()=>parseEvidenceRunIds('44279699056,0'));
  assert.throws(()=>parseEvidenceRunIds(''));
});

test('only successful exact-source public build runs are trusted',()=>{
  assert.equal(isTrustedBuildRun(baseRun,source,44279513261),true);
  assert.equal(isTrustedBuildRun({...baseRun,display_title:'v911 build source=latest'},source,44279513261),false);
  assert.equal(isTrustedBuildRun({...baseRun,conclusion:'failure'},source,44279513261),false);
  assert.equal(isTrustedBuildRun({...baseRun,actor:{login:'someone-else'}},source,44279513261),false);
});

test('standard audit runs can reference an earlier successful build of the same source',()=>{
  const run={
    id:44279699056,conclusion:'success',run_attempt:1,event:'workflow_dispatch',head_branch:'main',
    head_repository:{full_name:REPOSITORY},actor:{login:'github-actions[bot]'},
    path:'.github/workflows/v911-remote-ui-gate.yml',
    display_title:'v911 UI source='+source+' build=44279513261'
  };
  assert.equal(standardAuditBuildId(run,source),44279513261);
  assert.equal(standardAuditBuildId({...run,display_title:run.display_title.replace(source,'0'.repeat(40))},source),null);
  assert.equal(standardAuditBuildId({...run,conclusion:'failure'},source),null);
});

test('successful viewport jobs are collected individually for cumulative evidence',()=>{
  const full=REQUIRED_VIEWPORTS.map(viewport=>({name:'ui ('+viewport+')',conclusion:'success'}));
  const tablet=[{name:'ui (tablet768)',conclusion:'success'}];
  assert.deepEqual(successfulViewportCoverage(full),[...REQUIRED_VIEWPORTS]);
  assert.deepEqual(successfulViewportCoverage([...tablet,{name:'ui (pc1280)',conclusion:'failure'}]),['tablet768']);
  assert.deepEqual(missingViewports(mergeCoverage(['mobile375','mobile390'],['tablet768','tablet820','tablet1024','tablet1180'],['pc1280','pc1440','pc1920'])),[]);
});

test('focused tablet evidence must pin the exact source, build, Preview URL and test',()=>{
  const run={
    id:44283065167,conclusion:'success',run_attempt:1,event:'push',head_branch:'main',
    head_repository:{full_name:REPOSITORY},actor:{login:'lui020913'},
    path:'.github/workflows/v911-tablet768-only.yml'
  };
  const request={source_sha:source,build_run:44281610172,target_url:PREVIEW_URL,audit_attempt:5};
  const workflow="run: npx playwright test --config=playwright.v911-remote.config.mjs --project=tablet768 --grep 'tablet More panel is fully visible and contained'\nrun: node scripts/verify-release-source.mjs";
  const jobs=[{name:'ui (tablet768 only)',conclusion:'success'}];
  assert.equal(validateFocusedTabletEvidence({run,request,workflow,jobs,sourceSha:source,buildRun:44281610172}),true);
  assert.equal(validateFocusedTabletEvidence({run,request,workflow,jobs,sourceSha:source,buildRun:44279513261}),false);
  assert.equal(validateFocusedTabletEvidence({run,request:{...request,source_sha:'0'.repeat(40)},workflow,jobs,sourceSha:source,buildRun:44281610172}),false);
  assert.equal(validateFocusedTabletEvidence({run,request,workflow:workflow.replace('tablet768','mobile375'),jobs,sourceSha:source,buildRun:44281610172}),false);
  assert.equal(validateFocusedTabletEvidence({run,request,workflow,jobs:[{name:'ui (tablet768 only)',conclusion:'failure'}],sourceSha:source,buildRun:44281610172}),false);
});

test('cumulative coverage fails closed if any viewport is missing',()=>{
  assert.deepEqual(missingViewports(['mobile375','mobile390','tablet768']),['tablet820','tablet1024','tablet1180','pc1280','pc1440','pc1920']);
});
