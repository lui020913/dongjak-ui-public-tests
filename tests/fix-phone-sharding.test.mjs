import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planFixPhoneShards} from '../scripts/plan-fix-phone-shards.mjs';
const projects=['mobile375','mobile390','mobile430'];
const report=n=>({suites:[{suites:projects.map(projectName=>({specs:Array.from({length:n},(_,i)=>({id:'case-'+i,tests:[{projectName}]}))}))}]});
test('one independent shard per actual FIX case, including future additions',()=>{
 for(const n of [7,11,14]){
  const p=planFixPhoneShards(report(n));assert.equal(p.count,3*n);assert.deepEqual(p.matrix,Array.from({length:3*n},(_,i)=>i+1));
 }
});
test('invalid, missing or duplicate discovery fails closed',()=>{
 assert.throws(()=>planFixPhoneShards({suites:[]}));
 assert.throws(()=>planFixPhoneShards({suites:[{specs:[{id:'a',tests:[{projectName:'mobile375'}]}]}]}));
 const r=report(1);r.suites[0].suites[0].specs.push(r.suites[0].suites[0].specs[0]);assert.throws(()=>planFixPhoneShards(r));
});
test('matrix shares one source-bound build; failures stay independently retryable',()=>{
 const y=readFileSync(new URL('../.github/workflows/public-app-pr.yml',import.meta.url),'utf8');
 assert.match(y,/fix-phone:\s+[\s\S]*?fail-fast: false/);
 assert.match(y,/--workers=1 --shard=/);
 assert.match(y,/sha256sum -c SHA256SUMS/);
 assert.match(y,/git -c safe\.directory="\$GITHUB_WORKSPACE" -C "\$GITHUB_WORKSPACE" rev-parse HEAD/);
 assert.match(y,/fix-phone-gate:[\s\S]*?test "\$PHONE_RESULT" = success/);
 assert.equal((y.match(/run: npm run build/g)||[]).length,1);
});