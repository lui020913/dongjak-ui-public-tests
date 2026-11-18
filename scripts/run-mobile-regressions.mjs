import {readdirSync,readFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||process.cwd());
const dir=join(root,'tests');
const excludedName=/(?:desktop|pc|tablet|platform-cleanup-v710|v729-r2-ui-reinterpretation)/i;
const crossDeviceContent=/\b(?:desktop|pc|tablet)\b/i;
const candidates=readdirSync(dir,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')&&!excludedName.test(entry.name))
  .map(entry=>join(dir,entry.name)).sort();
const files=candidates.filter(file=>!crossDeviceContent.test(readFileSync(file,'utf8')));
if(!files.length)throw new Error('No mobile/shared Node regression tests were selected.');
const hash=s=>createHash('sha256').update(s).digest('hex');
const classify=s=>/building|appearance|contrast|palette/.test(s)?'building':/sdot|incident|walk-data|boundary|bocha/.test(s)?'geo-data':/kakao|auth|oauth/.test(s)?'auth':/sheet|surface|motion|toolbar/.test(s)?'ui-lifecycle':/place|facility|search/.test(s)?'facility-search':'other';
let failed=0,passed=0,testTotal=0,testPassed=0,testFailed=0;
const fingerprints=[];
for(const file of files){
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap',file],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:120000});
 const raw=result.stdout||'';
 const count=name=>Number(raw.match(new RegExp('^# '+name+' (\\d+)\\s*$','m'))?.[1]||0);
 testTotal+=count('tests');testPassed+=count('pass');testFailed+=count('fail');
 if(result.status===0&&!result.error){passed++;continue;}
 failed++;
 const name=basename(file);
 const ids=raw.split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*not ok \d+ - (.*)$/);return m?[hash(m[1].trim())]:[];});
 fingerprints.push('Safe regression failure: area='+classify(name)+' file='+hash(name)+' kind='+(result.error?'runner':'assertion'));
 for(const id of [...new Set(ids)].slice(0,15))fingerprints.push('Failed test fingerprint: '+id);
}
console.log('Safe regression summary: files='+files.length+' passed='+passed+' failed='+failed+' tests='+testTotal+' test_passed='+testPassed+' test_failed='+testFailed);
for(const row of fingerprints.slice(0,100))console.log(row);
if(failed)process.exit(1);
console.log('PASS: all mobile/shared Node regression files passed.');
