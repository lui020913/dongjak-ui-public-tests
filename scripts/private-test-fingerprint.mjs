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

// Only forward the fixed, validated summary format; never forward raw private output.
for(const line of raw.split(/\r?\n/)){
 if(/^Safe regression summary: files=\d+ passed=\d+ failed=\d+ tests=\d+ test_passed=\d+ test_failed=\d+$/.test(line)||
 /^Safe regression failure: area=(?:building|geo-data|auth|ui-lifecycle|facility-search|other) file=[a-f0-9]{64} kind=(?:runner|assertion)$/.test(line)||
 /^Failed test fingerprint: [a-f0-9]{64}$/.test(line)||
 /^Public regression (?:file: [a-zA-Z0-9_.-]+\.test\.mjs|location: [a-zA-Z0-9_.-]+\.test\.mjs:\d+:\d+|diagnostic: [A-Za-z ]{1,70})$/.test(line))console.log(line);
}
