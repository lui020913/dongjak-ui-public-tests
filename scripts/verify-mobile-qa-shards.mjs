import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const cli='node_modules/@playwright/test/cli.js';
const args=['test','--config=playwright.v911-remote.config.mjs','--project=mobile375','--project=mobile390','--project=mobile430','--project=mobile390-webkit-header','--list','--reporter=json'];
function list(extra=[]){
 const out=JSON.parse(execFileSync(process.execPath,[cli,...args,...extra],{encoding:'utf8',env:{...process.env,DONGJAK_FULL_MOBILE_QA:'0'}}));
 const ids=[];
 function visit(s){for(const spec of s.specs??[])for(const t of spec.tests??[])ids.push(JSON.stringify([t.projectName,spec.id,spec.title]));for(const child of s.suites??[])visit(child);}
 for(const s of out.suites)visit(s);
 assert.equal(new Set(ids).size,ids.length,'duplicate tests in listing');
 return ids.sort();
}
const baseline=list(),shards=[];
assert.ok(baseline.length>0,'no mobile tests selected');
for(let i=1;i<=12;i++){const ids=list(['--shard='+i+'/12']);assert.ok(ids.length>0,'empty shard '+i);shards.push(ids);console.log('Shard '+i+': '+ids.length+' tests');}
const combined=shards.flat();
assert.equal(new Set(combined).size,combined.length,'shards overlap');
assert.deepEqual(combined.sort(),baseline,'shards must exactly cover selected mobile tests');
console.log('Verified '+baseline.length+' selected tests, each scheduled exactly once');
