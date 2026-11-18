import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
test('only hashed failed test names and numeric totals are emitted',()=>{
 const root=mkdtempSync(join(tmpdir(),'proof-test-'));
 try{const f=join(root,'tap.log');writeFileSync(f,'not ok 1 - private test title\n  message: hidden api token\n# tests 2\n# pass 1\n# fail 1\n');const r=spawnSync(process.execPath,['scripts/private-test-fingerprint.mjs',f],{encoding:'utf8'});assert.equal(r.status,0);assert.match(r.stdout,/total=2 passed=1 failed=1/);assert.ok(r.stdout.includes(createHash('sha256').update('private test title').digest('hex')));assert.doesNotMatch(r.stdout,/private test title|hidden api token|tap\.log/);}finally{rmSync(root,{recursive:true,force:true});}
});
