import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import postcss from 'postcss';
const root=new URL('../src/',import.meta.url);
const files=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.name.endsWith('.css')?[join(dir,e.name)]:[]);
const {fileURLToPath}=await import('node:url');
const base=fileURLToPath(root);
const targets=[];
const exactRules=[];
const verify=process.argv[2]==='--verify';
const scanRoot=verify?process.argv[3]:base;
for(const path of files(scanRoot)){
 const css=readFileSync(path,'utf8'),ast=postcss.parse(css,{from:path}),hits=[];
 ast.walkRules(rule=>{
  if(!rule.nodes?.length||rule.nodes.some(n=>n.type!=='decl'&&n.type!=='comment'))return;
  // No keyframes or nested rules: identical declarations under the same
  // ordinary style rule can be dropped only when the later declaration wins.
  for(let p=rule.parent;p;p=p.parent)if(p.type==='rule'||(p.type==='atrule'&&!['media','supports','layer','container','scope'].includes(p.name)))return;
  const seen=new Set();
  for(const d of [...rule.nodes].reverse()){
   if(d.type!=='decl'||!d.source?.start||!d.source?.end)continue;
   const key=JSON.stringify([d.prop,d.value,Boolean(d.important)]);
   if(seen.has(key))hits.push({line:d.source.start.line,column:d.source.start.column,start:d.source.start.offset,end:d.source.end.offset,selector:rule.selector,property:d.prop,value:d.value,important:Boolean(d.important)});
   else seen.add(key);
  }
 });
 if(hits.length)targets.push({file:relative(scanRoot,path),count:hits.length,hits});
 if(!verify){
  const containers=[ast];ast.walkAtRules(r=>{if(['media','supports','layer','container','scope'].includes(r.name)&&r.nodes)containers.push(r);});
  for(const parent of containers){
   if(parent.type!=='root'){let eligible=true;for(let p=parent;p&&p.type!=='root';p=p.parent){if(p.type!=='atrule'||!['media','supports','layer','container','scope'].includes(p.name)){eligible=false;break;}}if(!eligible)continue;}
   const seen=new Map();
   for(const rule of [...parent.nodes].reverse()){
    if(rule.type!=='rule'||!rule.nodes?.length||rule.nodes.some(n=>n.type!=='decl'&&n.type!=='comment'))continue;
    const key=JSON.stringify([rule.selector,rule.nodes.filter(n=>n.type==='decl').map(d=>[d.prop,d.value,Boolean(d.important)])]);
    if(seen.has(key))exactRules.push({file:relative(scanRoot,path),line:rule.source.start.line,retainedLine:seen.get(key),selector:rule.selector.slice(0,200)});
    else seen.set(key,rule.source.start.line);
   }
  }
 }
}
if(verify){
 const expected=new Map([['v829-mobile-layout-system.css',1],['v864-facility-detail-redesign.css',1]]);
 for(const target of targets){
  if(expected.get(target.file)!==target.count)throw Error('Unexpected baseline duplicate: '+target.file);
  const old=readFileSync(join(scanRoot,target.file),'utf8'),actual=readFileSync(join(process.argv[4],target.file),'utf8');
  let reconstructed=old;
  for(const hit of [...target.hits].sort((a,b)=>b.start-a.start))reconstructed=reconstructed.slice(0,hit.start)+reconstructed.slice(hit.end);
  if(actual!==reconstructed)throw Error('Non-duplicate CSS change: '+target.file);
  expected.delete(target.file);
 }
 if(expected.size)throw Error('Missing baseline duplicate(s)');
 console.log('PASS: both CSS files differ only by parser-identified identical earlier declarations');
}else console.log(JSON.stringify({files:files(scanRoot).length,duplicateDeclarations:targets.reduce((n,x)=>n+x.count,0),targets,exactRepeatedRules:exactRules.length,ruleCandidates:exactRules},null,2));
