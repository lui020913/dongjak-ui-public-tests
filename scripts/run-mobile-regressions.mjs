import {readdirSync,readFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(process.argv[2]||process.cwd());
const dir=join(root,'tests');
const excludedName=/(?:desktop|pc|tablet|platform-cleanup-v710|v729-r2-ui-reinterpretation)/i;
const crossDeviceContent=/\b(?:desktop|pc|tablet)\b/i;
const candidates=readdirSync(dir,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')&&!excludedName.test(entry.name))
  .map(entry=>join(dir,entry.name))
  .sort();
const files=candidates.filter(file=>!crossDeviceContent.test(readFileSync(file,'utf8')));
const excluded=candidates.length-files.length;
if(!files.length)throw new Error('No mobile/shared Node regression tests were selected.');
console.log('Running '+files.length+' mobile/shared Node regression files; excluded '+excluded+' cross-device files.');
const failures=[];
for(const file of files){
  const result=spawnSync(process.execPath,['--test',file],{cwd:root,stdio:'ignore'});
  if(result.error)throw result.error;
  if(result.status!==0)failures.push(basename(file));
}
if(failures.length){
  console.log('Mobile/shared regression failures by file: '+failures.join(', '));
  process.exit(1);
}
console.log('PASS: all mobile/shared Node regression files passed.');
