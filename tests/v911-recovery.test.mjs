import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,sourcePin,recoveryDecision,modelInput} from '../scripts/v911-recovery-policy.mjs';
const job=(name,step)=>({name,steps:[{name:step,conclusion:'failure'}]});
const ui='ui (tablet1180)';
const opts={attempt:1,isUi:true,exactCandidate:true};
test('source pin requires exact public audit title',()=>{
 assert.deepEqual(sourcePin('v911 UI source='+'a'.repeat(40)+' build=123'),{sha:'a'.repeat(40),build:'123'});
 assert.equal(sourcePin('v911 UI source='+'a'.repeat(40)+' build=legacy'),null);
});
test('network and environment failures may retry twice, never after the third attempt',()=>{
 const diagnostics=[classify(job(ui,'Install pinned JS test package only'))];
 assert.equal(recoveryDecision({...opts,diagnostics}),'retry');
 assert.equal(recoveryDecision({...opts,attempt:2,diagnostics}),'retry');
 assert.equal(recoveryDecision({...opts,attempt:3,diagnostics}),'review');
 assert.equal(recoveryDecision({...opts,exactCandidate:false,diagnostics}),'review');
 assert.equal(recoveryDecision({...opts,isUi:false,diagnostics}),'review');
});
test('real UI assertions are not retried or bypassed as infrastructure failures',()=>{
 const diagnostics=[classify(job(ui,'Run npx playwright test'),'TRANSIT_GRIP_DIAGNOSTIC {centerError:5}')];
 assert.equal(diagnostics[0].category,'geometry');
 assert.equal(recoveryDecision({...opts,diagnostics}),'review');
 const state=classify(job(ui,'Run npx playwright test'),'Error: locator.toBeHidden failed');
 assert.equal(state.category,'surface-state');
 assert.equal(recoveryDecision({...opts,diagnostics:[state]}),'review');
 assert.equal(recoveryDecision({...opts,diagnostics:[...diagnostics,classify(job(ui,'Set up job'))]}),'review');
});
test('only allowlisted fields are transmitted to the diagnostic model',()=>{
 assert.deepEqual(modelInput([{viewport:'tablet1180',category:'geometry',log:'secret',source:'private'},{viewport:'unknown',category:'secret'}]),[{viewport:'tablet1180',category:'geometry'},{viewport:null,category:'unknown'}]);
});
test('recovery is event triggered and never holds deploy or private source credentials',()=>{
 const y=readFileSync(new URL('../.github/workflows/v911-failure-recovery.yml',import.meta.url),'utf8');
 assert.match(y,/workflow_run:/);
 assert.doesNotMatch(y,/schedule:|CLOUDFLARE_API_TOKEN|PRIVATE_SOURCE_READ_TOKEN|PRIVATE_PREVIEW_DISPATCH_TOKEN|contents: write/);
});
