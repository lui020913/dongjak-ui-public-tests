import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const cli='node_modules/@playwright/test/cli.js';
const args=['test','--config=playwright.v911-remote.config.mjs','--project=mobile375','--project=mobile390','--project=mobile430','--project=mobile390-webkit-header','--list','--reporter=json'];
function list(extra=[],full=false){
 const out=JSON.parse(execFileSync(process.execPath,[cli,...args,...extra],{encoding:'utf8',env:{...process.env,DONGJAK_FULL_MOBILE_QA:full?'1':'0'}}));
 const ids=[];
 function visit(s){for(const spec of s.specs??[])for(const t of spec.tests??[])ids.push(JSON.stringify([t.projectName,spec.id,spec.title]));for(const child of s.suites??[])visit(child);}
 for(const s of out.suites)visit(s);
 assert.equal(new Set(ids).size,ids.length,'duplicate tests in listing');
 return ids.sort();
}
// Both tiers must cover their complete selected test listing without gaps,
// overlaps or empty runners. The 24-shard tier additionally executes shared
// functionality on all three phone sizes, rather than only the reference size.
const QA_MODES=[{count:8,full:false},{count:24,full:true}];
for(const {count,full} of QA_MODES){
 const baseline=list([],full),shards=[];
 assert.ok(baseline.length>=count,'test count must cover every shard: '+count);
 for(let i=1;i<=count;i++){
  const ids=list(['--shard='+i+'/'+count],full);
  assert.ok(ids.length>0,'empty shard '+i+'/'+count);
  shards.push(ids);
  console.log((full?'Full':'Standard')+' shard '+i+'/'+count+': '+ids.length+' tests');
 }
 const combined=shards.flat();
 assert.equal(new Set(combined).size,combined.length,'overlapping shards: '+count);
 assert.deepEqual(combined.sort(),baseline,'shards do not cover selected tests: '+count);
 console.log('Verified '+baseline.length+' '+(full?'full':'standard')+' phone tests, each scheduled once');
}
