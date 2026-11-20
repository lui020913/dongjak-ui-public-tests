import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {verifyCapture} from '../scripts/live-qa-verify-capture.mjs';
test('capture is bound to exact release and lane, rejects stale source or wrong target',()=>{
 const root=mkdtempSync(join(tmpdir(),'qa-capture-')),dir=join(root,'one');mkdirSync(dir);
 const expected={lane:3,target:'https://abc.dongjak-walk-safety-preview.pages.dev/',source:'a'.repeat(40),publicSha:'a'.repeat(40),css:'b'.repeat(64),version:'9.2.49',run:'123'};
 const result={code:0,target:expected.target},report={run:result,scenes:[{status:'passed',title:'03 길찾기'}]};
 try {writeFileSync(join(dir,'result.json'),JSON.stringify(result));writeFileSync(join(dir,'audit-report.json'),JSON.stringify(report));assert.equal(verifyCapture(root,expected,true),dir);assert.equal(verifyCapture(root,expected),dir);assert.throws(()=>verifyCapture(root,{...expected,lane:4}));assert.throws(()=>verifyCapture(root,{...expected,run:'124'}));assert.throws(()=>verifyCapture(root,{...expected,target:'https://other.example/'}));assert.throws(()=>verifyCapture(root,{...expected,css:'c'.repeat(64)}));report.scenes[0].status='failed';writeFileSync(join(dir,'audit-report.json'),JSON.stringify(report));assert.throws(()=>verifyCapture(root,expected));} finally {rmSync(root,{recursive:true,force:true});}
});
