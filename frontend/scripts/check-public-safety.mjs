import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,extname} from 'node:path';

const root=process.cwd();
const errors=[];
const sensitivePatterns=[
  [/github_pat_[A-Za-z0-9_]{15,}/g,'GitHub PAT'],
  [/ghp_[A-Za-z0-9]{20,}/g,'GitHub token'],
  [/sb_secret_[A-Za-z0-9_-]{12,}/g,'Supabase secret'],
  [/sk-[A-Za-z0-9_-]{20,}/g,'API secret'],
  [/AIza[0-9A-Za-z_-]{30,}/g,'Google API key'],
  [/xox[baprs]-[A-Za-z0-9-]{15,}/g,'Slack token']
];
const deniedDirs=new Set(['functions','server','supabase','migrations','android']);
function visit(path){
  for(const item of readdirSync(path,{withFileTypes:true})){
    const itemPath=join(path,item.name);
    const name=relative(root,itemPath).replaceAll('\\','/');
    if(item.name.startsWith('.env')&&item.name!=='.env.example'){
      errors.push('Forbidden environment file: '+name);
      continue;
    }
    if(item.isDirectory()){
      if(deniedDirs.has(item.name)){errors.push('Forbidden server/data directory: '+name);continue;}
      if(item.name==='node_modules'||item.name==='dist'||item.name==='test-results')continue;
      visit(itemPath);
    }else if(item.isFile()){
      if(!['.js','.mjs','.html','.css','.json'].includes(extname(item.name)))continue;
      if(name==='scripts/check-public-safety.mjs')continue;
      const source=readFileSync(itemPath,'utf8');
      for(const [regex,label] of sensitivePatterns){
        regex.lastIndex=0;
        if(regex.test(source))errors.push(label+' detected in '+name);
      }
    }
  }
}
visit(root);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('PASS: public workbench has no detected private credential patterns.');
