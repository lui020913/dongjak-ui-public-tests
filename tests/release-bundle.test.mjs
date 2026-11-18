import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const sha='a'.repeat(40);
test('deployment bundle authenticates ciphertext, key and exact source',()=>{
 const dir=mkdtempSync(join(tmpdir(),'v911-crypto-'));
 try{
  const original=join(dir,'plain'),sealed=join(dir,'sealed'),decoded=join(dir,'decoded');
  const secret=randomBytes(32).toString('base64');
  const data=Buffer.concat([Buffer.from('synthetic fixture only\n'),randomBytes(8192)]);
  writeFileSync(original,data);
  function run(mode,input,output,ref=sha,key=secret){
   return spawnSync(process.execPath,['scripts/seal-private-release.mjs',mode,input,output,ref],{env:{...process.env,RELEASE_BUNDLE_KEY:key},encoding:'utf8'});
  }
  assert.equal(run('seal',original,sealed).status,0);
  assert.equal(readFileSync(sealed).length,data.length+28);
  assert.equal(readFileSync(sealed).includes(Buffer.from('synthetic fixture only')),false);
  assert.equal(run('open',sealed,decoded).status,0);
  assert.deepEqual(readFileSync(decoded),data);
  for(const [ref,key] of [['b'.repeat(40),secret],[sha,randomBytes(32).toString('base64')]]){
   const rejected=join(dir,'rejected');
   assert.notEqual(run('open',sealed,rejected,ref,key).status,0);
   assert.equal(existsSync(rejected),false);
  }
  const tampered=readFileSync(sealed);tampered[16]^=1;writeFileSync(sealed,tampered);
  const corrupted=join(dir,'corrupted');
  assert.notEqual(run('open',sealed,corrupted).status,0);
  assert.equal(existsSync(corrupted),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
