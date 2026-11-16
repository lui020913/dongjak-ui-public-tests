import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aggregate, markdown } from '../scripts/quality-report.mjs';

const fixture = (project, result) => ({
  config:{projects:[{name:project,use:{viewport:project==='desktop'?{width:1440,height:900}:{width:390,height:844}}}]},
  stats:{expected:0,unexpected:0},
  suites:[{title:'Smoke',specs:[{title:'map and tabs',tests:[{projectName:project,status:result,
    results:[{duration:150,errors:result==='unexpected'?[{message:'Error at https://example.test/?token=private'}]:[]}]}]}]}]
});

test('aggregates PC/mobile failures with actual project viewport and redacts URLs',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dj-summary-'));
  try {
    writeFileSync(join(dir,'desktop.json'),JSON.stringify(fixture('desktop','expected')));
    writeFileSync(join(dir,'mobile.json'),JSON.stringify(fixture('mobile','unexpected')));
    const r=aggregate(dir,{scope:'full',sha:'a'.repeat(40),targetUrl:'https://demo.pages.dev/?secret=1'});
    assert.equal(r.verdict,'FAIL');
    assert.equal(aggregate(dir,{scope:'release'}).verdict,'NO_VALID_RESULTS');
    assert.equal(r.total,2);
    assert.deepEqual([r.counts.passed,r.counts.failed],[1,1]);
    assert.match(markdown(r),/1440×900/);
    assert.match(markdown(r),/390×844/);
    assert.doesNotMatch(markdown(r),/secret=1|token=private/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('empty or malformed results cannot become PASS',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dj-summary-'));
  try {
    assert.equal(aggregate(dir).verdict,'NO_VALID_RESULTS');
    writeFileSync(join(dir,'invalid.json'),'{');
    assert.equal(aggregate(dir).verdict,'NO_VALID_RESULTS');
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('flaky outcomes remain blocked',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dj-summary-'));
  try {
    writeFileSync(join(dir,'result.json'),JSON.stringify(fixture('desktop','flaky')));
    const r=aggregate(dir);
    assert.equal(r.counts.flaky,1);
    assert.equal(r.verdict,'FAIL');
  } finally {rmSync(dir,{recursive:true,force:true});}
});