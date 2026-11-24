import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function planFixPhoneShards(report){
 const cases=[];
 const visit=suite=>{
  for(const spec of suite.specs||[])for(const test of spec.tests||[]){
   if(!['mobile375','mobile390','mobile430'].includes(test.projectName))throw Error('Unexpected phone project '+test.projectName);
   cases.push([test.projectName,spec.id||spec.title]);
  }
  for(const child of suite.suites||[])visit(child);
 };
 if(report.errors?.length)throw Error('Playwright discovery reported errors');
 for(const suite of report.suites||[])visit(suite);
 if(!cases.length||cases.length>256)throw Error('Invalid phone case count '+cases.length);
 if(new Set(cases.map(x=>JSON.stringify(x))).size!==cases.length)throw Error('Duplicate phone cases');
 for(const name of ['mobile375','mobile390','mobile430'])if(!cases.some(c=>c[0]===name))throw Error('Missing '+name);
 return {count:cases.length,matrix:Array.from({length:cases.length},(_,i)=>i+1)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {count,matrix}=planFixPhoneShards(JSON.parse(readFileSync(process.argv[2],'utf8')));
 console.log('count='+count);
 console.log('matrix='+JSON.stringify(matrix));
}
