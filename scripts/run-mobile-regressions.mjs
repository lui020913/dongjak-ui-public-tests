import {readdirSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(process.argv[2]||process.cwd());
const dir=join(root,'tests');
const excluded=/(?:desktop|pc|tablet|platform-cleanup-v710|v729-r2-ui-reinterpretation)/i;
const files=readdirSync(dir,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')&&!excluded.test(entry.name))
  .map(entry=>join('tests',entry.name))
  .sort();
if(!files.length)throw new Error('No mobile/shared Node regression tests were selected.');

let totalPass=0,totalFail=0;
const failures=[];
for(const file of files){
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap',file],{
    cwd:root,encoding:'utf8',maxBuffer:20*1024*1024
  });
  if(result.error)throw result.error;
  const output=(result.stdout||'')+'\n'+(result.stderr||'');
  const pass=Number((output.match(/(?:#|ℹ) pass (\\d+)/)||[])[1]||0);
  const fail=Number((output.match(/(?:#|ℹ) fail (\\d+)/)||[])[1]||0);
  totalPass+=pass;
  totalFail+=fail;
  if(result.status!==0||fail>0)failures.push({file:basename(file),pass,fail:Math.max(fail,1)});
}
console.log('Mobile/shared regression files: '+files.length);
console.log('Mobile/shared assertions passed: '+totalPass);
console.log('Mobile/shared assertions failed: '+totalFail);
for(const item of failures)console.error('FAILED_MOBILE_FILE '+item.file+' pass='+item.pass+' fail='+item.fail);
if(failures.length)process.exitCode=1;
