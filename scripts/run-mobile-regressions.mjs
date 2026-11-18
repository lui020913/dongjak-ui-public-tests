import {readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(process.argv[2]||process.cwd());
const dir=join(root,'tests');
const excluded=/(?:desktop|pc|tablet)/i;
const files=readdirSync(dir,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')&&!excluded.test(entry.name))
  .map(entry=>join('tests',entry.name))
  .sort();
if(!files.length)throw new Error('No mobile/shared Node regression tests were selected.');
console.log(`Running ${files.length} mobile/shared Node regression files; desktop and tablet suites are excluded.`);
const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
