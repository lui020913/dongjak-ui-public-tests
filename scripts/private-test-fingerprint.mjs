// Public log permits only an opaque SHA-256 fingerprint and aggregate counts.
// No test titles, paths, error messages, stack traces or assertion values.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const raw=readFileSync(process.argv[2],'utf8');
const failures=[];
for(const line of raw.split(/\r?\n/)){
 const match=line.match(/^\s*not ok \d+ - (.*)$/);
 if(!match)continue;
 const title=match[1].trim();
 failures.push(createHash('sha256').update(title).digest('hex'));
}
const count=(name)=>raw.match(new RegExp('^# '+name+' (\\d+)\\s*$','m'))?.[1]||'unknown';
console.log('Private test summary: total='+count('tests')+' passed='+count('pass')+' failed='+count('fail'));
for (const fingerprint of [...new Set(failures)].slice(0,40))console.log('Failed test fingerprint: '+fingerprint);
